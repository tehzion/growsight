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