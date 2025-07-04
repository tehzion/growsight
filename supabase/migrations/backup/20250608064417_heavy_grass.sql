/*
  # Enhanced Permissions and Dashboard Analytics

  1. Assessment Management
    - Add assessment_type column (preset/custom)
    - Add is_deletable column for protection
    - Auto-set properties based on creator role

  2. Dashboard Analytics
    - Create analytics view for anonymous data
    - Aggregate metrics by organization
    - No individual user data exposure

  3. Enhanced Security
    - Prevent deletion of preset assessments
    - Privacy protection for assessment responses
    - Role-based access control
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

-- Update assessment policies to prevent deletion of presets
DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Org admins can manage assessments in their organization" ON assessments;

-- Super admin policy with full access
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

-- Org admin policy with creation and management permissions
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

-- Create function to get dashboard analytics with proper access control
CREATE OR REPLACE FUNCTION get_dashboard_analytics(requesting_user_id uuid)
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
DECLARE
  user_role text;
  user_org_id uuid;
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users WHERE id = requesting_user_id;
  
  -- Return data based on user permissions
  IF user_role = 'super_admin' THEN
    -- Super admin sees all organizations
    RETURN QUERY SELECT * FROM dashboard_analytics;
  ELSIF user_role = 'org_admin' THEN
    -- Org admin sees only their organization
    RETURN QUERY 
    SELECT * FROM dashboard_analytics 
    WHERE dashboard_analytics.organization_id = user_org_id;
  ELSE
    -- Other users see no analytics
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;