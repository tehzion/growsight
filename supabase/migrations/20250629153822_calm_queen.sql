/*
  # Fix Assessment Response Privacy

  1. Changes
    - Update RLS policies for assessment_responses
    - Ensure proper privacy controls for individual responses
    - Add anonymization function for organization-level reporting

  2. Security
    - Protect individual response privacy
    - Allow aggregated data access for organization admins
    - Ensure super admins can access all data
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own responses" ON assessment_responses;
DROP POLICY IF EXISTS "Admins can view aggregated response data" ON assessment_responses;
DROP POLICY IF EXISTS "Super admins can view all responses" ON assessment_responses;
DROP POLICY IF EXISTS "Employees can view responses for their assessments" ON assessment_responses;
DROP POLICY IF EXISTS "Reviewers can view their own responses" ON assessment_responses;

-- Create new policies with proper privacy controls
CREATE POLICY "Users can manage their own responses"
ON assessment_responses
FOR ALL
TO authenticated
USING (respondent_id = auth.uid())
WITH CHECK (respondent_id = auth.uid());

-- Allow employees to view responses for their own assessments
CREATE POLICY "Employees can view responses for their assessments"
ON assessment_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.id = assessment_responses.assignment_id
    AND aa.employee_id = auth.uid()
    AND aa.status = 'completed'
  )
);

-- Allow reviewers to view their own responses only
CREATE POLICY "Reviewers can view their own responses"
ON assessment_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.id = assessment_responses.assignment_id
    AND aa.reviewer_id = auth.uid()
    AND assessment_responses.respondent_id = auth.uid()
  )
);

-- Super admins can view all responses
CREATE POLICY "Super admins can view all responses"
ON assessment_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Create function to get anonymized assessment results
CREATE OR REPLACE FUNCTION get_anonymized_results(org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user has permission to view these results
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (role = 'org_admin' AND organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get anonymized results
  SELECT json_agg(
    json_build_object(
      'section_id', s.id,
      'section_title', s.title,
      'questions', (
        SELECT json_agg(
          json_build_object(
            'id', q.id,
            'text', q.text,
            'avg_rating', COALESCE(AVG(ar.rating), 0),
            'response_count', COUNT(ar.id)
          )
        )
        FROM assessment_questions q
        LEFT JOIN assessment_responses ar ON ar.question_id = q.id
        LEFT JOIN assessment_assignments aa ON aa.id = ar.assignment_id
        LEFT JOIN assessments a ON a.id = aa.assessment_id
        WHERE q.section_id = s.id
        AND a.organization_id = org_id
        GROUP BY q.id
      )
    )
  )
  INTO result
  FROM assessment_sections s
  JOIN assessments a ON a.id = s.assessment_id
  WHERE a.organization_id = org_id;

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_anonymized_results TO authenticated;

-- Create function to get individual user results with privacy controls
CREATE OR REPLACE FUNCTION get_user_assessment_results(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
  requesting_user_id uuid := auth.uid();
  requesting_user_role text;
  requesting_user_org_id uuid;
BEGIN
  -- Get requesting user info
  SELECT role, organization_id INTO requesting_user_role, requesting_user_org_id
  FROM users
  WHERE id = requesting_user_id;
  
  -- Check permissions
  IF requesting_user_id != user_id AND 
     requesting_user_role != 'super_admin' AND
     (requesting_user_role != 'org_admin' OR 
      NOT EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id AND organization_id = requesting_user_org_id
      ))
  THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get results
  SELECT json_agg(
    json_build_object(
      'section_id', s.id,
      'section_title', s.title,
      'questions', (
        SELECT json_agg(
          json_build_object(
            'id', q.id,
            'text', q.text,
            'self_rating', (
              SELECT rating FROM assessment_responses
              WHERE question_id = q.id
              AND assignment_id IN (
                SELECT id FROM assessment_assignments
                WHERE employee_id = user_id
              )
              AND respondent_id = user_id
              LIMIT 1
            ),
            'avg_reviewer_rating', (
              SELECT COALESCE(AVG(rating), 0)
              FROM assessment_responses
              WHERE question_id = q.id
              AND assignment_id IN (
                SELECT id FROM assessment_assignments
                WHERE employee_id = user_id
              )
              AND respondent_id != user_id
            ),
            'alignment', (
              CASE
                WHEN ABS(
                  (SELECT rating FROM assessment_responses
                   WHERE question_id = q.id
                   AND assignment_id IN (
                     SELECT id FROM assessment_assignments
                     WHERE employee_id = user_id
                   )
                   AND respondent_id = user_id
                   LIMIT 1) -
                  (SELECT COALESCE(AVG(rating), 0)
                   FROM assessment_responses
                   WHERE question_id = q.id
                   AND assignment_id IN (
                     SELECT id FROM assessment_assignments
                     WHERE employee_id = user_id
                   )
                   AND respondent_id != user_id)
                ) <= 1 THEN 'aligned'
                WHEN (
                  SELECT rating FROM assessment_responses
                  WHERE question_id = q.id
                  AND assignment_id IN (
                    SELECT id FROM assessment_assignments
                    WHERE employee_id = user_id
                  )
                  AND respondent_id = user_id
                  LIMIT 1
                ) > (
                  SELECT COALESCE(AVG(rating), 0)
                  FROM assessment_responses
                  WHERE question_id = q.id
                  AND assignment_id IN (
                    SELECT id FROM assessment_assignments
                    WHERE employee_id = user_id
                  )
                  AND respondent_id != user_id
                ) THEN 'blind_spot'
                ELSE 'hidden_strength'
              END
            ),
            'comments', (
              -- Only include anonymized comments
              SELECT json_agg(comment)
              FROM assessment_responses
              WHERE question_id = q.id
              AND assignment_id IN (
                SELECT id FROM assessment_assignments
                WHERE employee_id = user_id
              )
              AND comment IS NOT NULL
              AND comment != ''
            )
          )
        )
        FROM assessment_questions q
        WHERE q.section_id = s.id
        GROUP BY q.id
      ),
      'self_average', (
        SELECT COALESCE(AVG(ar.rating), 0)
        FROM assessment_questions q
        LEFT JOIN assessment_responses ar ON ar.question_id = q.id
        WHERE q.section_id = s.id
        AND ar.assignment_id IN (
          SELECT id FROM assessment_assignments
          WHERE employee_id = user_id
        )
        AND ar.respondent_id = user_id
      ),
      'reviewer_average', (
        SELECT COALESCE(AVG(ar.rating), 0)
        FROM assessment_questions q
        LEFT JOIN assessment_responses ar ON ar.question_id = q.id
        WHERE q.section_id = s.id
        AND ar.assignment_id IN (
          SELECT id FROM assessment_assignments
          WHERE employee_id = user_id
        )
        AND ar.respondent_id != user_id
      )
    )
  )
  INTO result
  FROM assessment_sections s
  JOIN assessments a ON a.id = s.assessment_id
  WHERE a.id IN (
    SELECT assessment_id FROM assessment_assignments
    WHERE employee_id = user_id
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_assessment_results TO authenticated;