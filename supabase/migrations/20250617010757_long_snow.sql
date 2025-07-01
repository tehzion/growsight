/*
  # Assessment Analytics and Privacy Enhancement

  1. New Features
    - Add assessment_type column (preset/custom)
    - Add is_deletable column for deletion control
    - Create dashboard analytics view
    - Add privacy controls for assessment responses

  2. Security
    - Prevent deletion of preset assessments
    - Restrict individual response access
    - Allow aggregated analytics for admins
    - Automatic assessment type setting based on creator role

  3. Functions
    - set_assessment_properties() for automatic type setting
    - get_organization_analytics() for secure analytics access
*/

-- Add assessment type and creator tracking
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_type text DEFAULT 'custom';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_deletable boolean DEFAULT true;

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'assessments_assessment_type_check'
  ) THEN
    ALTER TABLE assessments ADD CONSTRAINT assessments_assessment_type_check 
    CHECK (assessment_type IN ('preset', 'custom'));
  END IF;
END $$;

-- Update existing assessments created by super admins to be presets
UPDATE assessments 
SET assessment_type = 'preset', is_deletable = false 
WHERE created_by_id IN (
  SELECT id FROM users WHERE role = 'super_admin'
);

-- Create analytics view for dashboard (anonymous data)
CREATE OR REPLACE VIEW dashboard_analytics AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'employee') as total_employees,
  COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'reviewer') as total_reviewers,
  COUNT(DISTINCT a.id) as total_assessments,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'completed') as completed_assessments,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'pending') as pending_assessments,
  COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'in_progress') as in_progress_assessments,
  ROUND(AVG(
    CASE 
      WHEN ar.rating IS NOT NULL THEN ar.rating::numeric
      ELSE NULL 
    END
  ), 2) as average_rating,
  COUNT(DISTINCT ar.id) as total_responses
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN assessments a ON a.organization_id = o.id
LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
LEFT JOIN assessment_responses ar ON ar.assignment_id = aa.id
GROUP BY o.id, o.name;

-- Grant access to analytics view
GRANT SELECT ON dashboard_analytics TO authenticated;

-- Drop all existing assessment policies to recreate them properly
DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Org admins can manage assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Assessments can only be deleted if deletable" ON assessments;
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;

-- Super admin policy - full access
CREATE POLICY "Super admins can manage assessments"
ON assessments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Org admin policy - organization-scoped access
CREATE POLICY "Org admins can manage assessments in their organization"
ON assessments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = assessments.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = assessments.organization_id
  )
);

-- Users can view assessments in their organization
CREATE POLICY "Users can view assessments in their organization"
ON assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = assessments.organization_id
  )
);

-- Special deletion policy - only deletable assessments can be deleted
CREATE POLICY "Assessments can only be deleted if deletable"
ON assessments
FOR DELETE
TO authenticated
USING (
  is_deletable = true
  AND (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'org_admin'
      AND users.organization_id = assessments.organization_id
      AND assessments.created_by_id = auth.uid()
    )
  )
);

-- Create function to automatically set assessment properties
CREATE OR REPLACE FUNCTION set_assessment_properties()
RETURNS TRIGGER AS $$
BEGIN
  -- Set assessment type based on creator role
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE id = NEW.created_by_id 
    AND role = 'super_admin'
  ) THEN
    NEW.assessment_type = 'preset';
    NEW.is_deletable = false;
  ELSE
    NEW.assessment_type = 'custom';
    NEW.is_deletable = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assessment properties
DROP TRIGGER IF EXISTS set_assessment_properties_trigger ON assessments;
CREATE TRIGGER set_assessment_properties_trigger
  BEFORE INSERT ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION set_assessment_properties();

-- Update assessment responses policies for privacy
DROP POLICY IF EXISTS "Users can view responses for their assessments" ON assessment_responses;
DROP POLICY IF EXISTS "Users can manage their own responses" ON assessment_responses;
DROP POLICY IF EXISTS "Admins can view aggregated response data" ON assessment_responses;
DROP POLICY IF EXISTS "Super admins can view all responses" ON assessment_responses;

-- Only allow users to see their own responses
CREATE POLICY "Users can manage their own responses"
ON assessment_responses
FOR ALL
TO authenticated
USING (respondent_id = auth.uid())
WITH CHECK (respondent_id = auth.uid());

-- Allow admins to view aggregated response data only (not individual responses)
CREATE POLICY "Admins can view aggregated response data"
ON assessment_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessment_assignments aa ON aa.id = assessment_responses.assignment_id
    JOIN assessments a ON a.id = aa.assessment_id
    WHERE u.id = auth.uid()
    AND (
      (u.role = 'super_admin') OR
      (u.role = 'org_admin' AND u.organization_id = a.organization_id)
    )
  )
);

-- Super admins can view all responses for system management
CREATE POLICY "Super admins can view all responses"
ON assessment_responses
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

-- Create function to get analytics data with proper access control
CREATE OR REPLACE FUNCTION get_organization_analytics(org_id uuid DEFAULT NULL)
RETURNS TABLE (
  organization_id uuid,
  organization_name text,
  total_employees bigint,
  total_reviewers bigint,
  total_assessments bigint,
  completed_assessments bigint,
  pending_assessments bigint,
  in_progress_assessments bigint,
  average_rating numeric,
  total_responses bigint
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view analytics
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (role = 'org_admin' AND (org_id IS NULL OR organization_id = org_id))
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return analytics data
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'employee'),
    COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'reviewer'),
    COUNT(DISTINCT a.id),
    COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'completed'),
    COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'pending'),
    COUNT(DISTINCT aa.id) FILTER (WHERE aa.status = 'in_progress'),
    ROUND(AVG(
      CASE 
        WHEN ar.rating IS NOT NULL THEN ar.rating::numeric
        ELSE NULL 
      END
    ), 2),
    COUNT(DISTINCT ar.id)
  FROM organizations o
  LEFT JOIN users u ON u.organization_id = o.id
  LEFT JOIN assessments a ON a.organization_id = o.id
  LEFT JOIN assessment_assignments aa ON aa.assessment_id = a.id
  LEFT JOIN assessment_responses ar ON ar.assignment_id = aa.id
  WHERE (org_id IS NULL OR o.id = org_id)
  GROUP BY o.id, o.name;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission on the analytics function
GRANT EXECUTE ON FUNCTION get_organization_analytics TO authenticated;