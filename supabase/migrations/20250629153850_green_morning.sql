/*
  # Add Organization Admin Permissions

  1. New Features
    - Add organization_admin_permissions column to organizations table
    - Store permission flags for org admins
    - Enable granular control over org admin capabilities

  2. Security
    - Maintain proper access control
    - Allow super admins to manage permissions
    - Ensure org admins can only perform allowed actions
*/

-- Add permissions column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS org_admin_permissions text[] DEFAULT '{}';

-- Create function to check if org admin has permission
CREATE OR REPLACE FUNCTION has_org_admin_permission(
  user_id uuid,
  permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  org_permissions text[];
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users
  WHERE id = user_id;
  
  -- Super admins always have all permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Only check for org admins
  IF user_role != 'org_admin' THEN
    RETURN false;
  END IF;
  
  -- Get organization permissions
  SELECT org_admin_permissions INTO org_permissions
  FROM organizations
  WHERE id = user_org_id;
  
  -- Check if permission exists in array
  RETURN permission = ANY(org_permissions);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_org_admin_permission TO authenticated;

-- Update existing organizations with default permissions
UPDATE organizations
SET org_admin_permissions = ARRAY['manage_users', 'assign_assessments', 'manage_relationships']
WHERE org_admin_permissions IS NULL OR org_admin_permissions = '{}';

-- Create function to update org admin permissions
CREATE OR REPLACE FUNCTION update_org_admin_permissions(
  org_id uuid,
  permissions text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to update
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can update organization permissions';
  END IF;
  
  -- Update permissions
  UPDATE organizations
  SET 
    org_admin_permissions = permissions,
    updated_at = now()
  WHERE id = org_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_org_admin_permissions TO authenticated;

-- Create policy to check permissions for assessment management
CREATE OR REPLACE FUNCTION can_manage_assessments(assessment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  assessment_org_id uuid;
BEGIN
  -- Get user info
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users
  WHERE id = auth.uid();
  
  -- Super admins can always manage
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Get assessment organization
  SELECT organization_id INTO assessment_org_id
  FROM assessments
  WHERE id = assessment_id;
  
  -- Check if user is org admin and has permission
  IF user_role = 'org_admin' AND user_org_id = assessment_org_id THEN
    RETURN has_org_admin_permission(auth.uid(), 'create_assessments');
  END IF;
  
  RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_manage_assessments TO authenticated;