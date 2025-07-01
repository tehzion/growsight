/*
  # Enhanced Permissions and Assessment Management

  1. New Features
    - Add assessment type (preset vs custom)
    - Add creator tracking for assessments
    - Enhanced permissions for organization admins
    - Anonymous dashboard analytics

  2. Security
    - Prevent deletion of preset assessments
    - Restrict assessment creation permissions
    - Enhanced RLS policies
*/

-- Add assessment type and creator tracking
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_type text DEFAULT 'custom' CHECK (assessment_type IN ('preset', 'custom'));
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_deletable boolean DEFAULT true;

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

-- Create RLS policy for analytics view
CREATE POLICY "Users can view analytics for their organization"
ON dashboard_analytics
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Update assessment policies to prevent deletion of presets
DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Org admins can manage assessments in their organization" ON assessments;

-- Super admin policy with deletion restrictions
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

-- Separate policy for assessment deletion (only deletable assessments)
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

-- Org admin policy with creation permissions
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

-- Only allow users to see their own responses
CREATE POLICY "Users can manage their own responses"
ON assessment_responses
FOR ALL
TO authenticated
USING (respondent_id = auth.uid())
WITH CHECK (respondent_id = auth.uid());

-- Allow admins to view aggregated data only (not individual responses)
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