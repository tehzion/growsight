/*
  # Enhance Super Admin Permissions

  1. Changes
    - Ensure Super Admin has access to all system features
    - Add explicit permissions for branding, user management, organizations, and insights
    - Create helper functions for permission checking
    - Update RLS policies to properly respect Super Admin role

  2. Security
    - Maintain strict access control for other roles
    - Super Admin bypasses all permission checks
    - Proper cascading of permissions
*/

-- Create a function to check if user is a Super Admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role = 'super_admin'
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated;

-- Update has_org_admin_permission to always return true for Super Admins
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
  -- Super admins always have all permissions
  IF is_super_admin(user_id) THEN
    RETURN true;
  END IF;
  
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users
  WHERE id = user_id;
  
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

-- Create a comprehensive system permission check function
CREATE OR REPLACE FUNCTION has_system_permission(
  permission text,
  org_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
BEGIN
  -- Super admins always have all permissions
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users
  WHERE id = auth.uid();
  
  -- Check org-specific permissions
  IF user_role = 'org_admin' AND (org_id IS NULL OR user_org_id = org_id) THEN
    RETURN has_org_admin_permission(auth.uid(), permission);
  END IF;
  
  -- Default deny
  RETURN false;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_system_permission TO authenticated;

-- Create a function to check branding permissions
CREATE OR REPLACE FUNCTION can_manage_branding(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admins can always manage branding
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Org admins with view_results permission can manage their org's branding
  RETURN has_org_admin_permission(auth.uid(), 'view_results') AND (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ) = org_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_manage_branding TO authenticated;

-- Update PDF branding settings policies
DROP POLICY IF EXISTS "Super admins can manage all PDF branding settings" ON pdf_branding_settings;
DROP POLICY IF EXISTS "Org admins can manage their organization's PDF branding settings" ON pdf_branding_settings;

CREATE POLICY "Users can manage PDF branding settings with permission"
ON pdf_branding_settings
FOR ALL
TO authenticated
USING (can_manage_branding(organization_id))
WITH CHECK (can_manage_branding(organization_id));

-- Create a function to check insights/analytics permissions
CREATE OR REPLACE FUNCTION can_view_insights(org_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admins can always view insights
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Org admins with view_results permission can view their org's insights
  IF org_id IS NULL THEN
    RETURN has_org_admin_permission(auth.uid(), 'view_results');
  ELSE
    RETURN has_org_admin_permission(auth.uid(), 'view_results') AND (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) = org_id;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_view_insights TO authenticated;

-- Create a function to check user management permissions
CREATE OR REPLACE FUNCTION can_manage_users(org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Super admins can always manage users
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Org admins with manage_users permission can manage their org's users
  RETURN has_org_admin_permission(auth.uid(), 'manage_users') AND (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ) = org_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_manage_users TO authenticated;

-- Create a function to check organization management permissions
CREATE OR REPLACE FUNCTION can_manage_organizations()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can manage organizations
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_manage_organizations TO authenticated;

-- Update organizations policies to use the new function
DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

CREATE POLICY "Users can manage organizations with permission"
ON organizations
FOR ALL
TO authenticated
USING (can_manage_organizations())
WITH CHECK (can_manage_organizations());

CREATE POLICY "Users can view their organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM users
    WHERE users.id = auth.uid()
  )
);

-- Update import/export permissions
DROP POLICY IF EXISTS "Super admins can manage import logs" ON import_logs;
DROP POLICY IF EXISTS "Super admins can manage export logs" ON export_logs;

CREATE POLICY "Users can manage import logs with permission"
ON import_logs
FOR ALL
TO authenticated
USING (
  is_super_admin() OR (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
    has_org_admin_permission(auth.uid(), 'manage_users')
  )
)
WITH CHECK (
  is_super_admin() OR (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
    has_org_admin_permission(auth.uid(), 'manage_users')
  )
);

CREATE POLICY "Users can manage export logs with permission"
ON export_logs
FOR ALL
TO authenticated
USING (
  is_super_admin() OR (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
    has_org_admin_permission(auth.uid(), 'view_results')
  )
)
WITH CHECK (
  is_super_admin() OR (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
    has_org_admin_permission(auth.uid(), 'view_results')
  )
);

-- Create a function to check if a user can access system settings
CREATE OR REPLACE FUNCTION can_access_system_settings()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can access system settings
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_system_settings TO authenticated;

-- Create a function to check if a user can access system health
CREATE OR REPLACE FUNCTION can_access_system_health()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can access system health
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_system_health TO authenticated;

-- Create a function to check if a user can access audit logs
CREATE OR REPLACE FUNCTION can_access_audit_logs()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can access audit logs
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_audit_logs TO authenticated;

-- Create a function to check if a user can access access requests
CREATE OR REPLACE FUNCTION can_access_access_requests()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can access access requests
  RETURN is_super_admin();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION can_access_access_requests TO authenticated;