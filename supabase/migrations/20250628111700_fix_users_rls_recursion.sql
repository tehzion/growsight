-- Fix infinite recursion in users table RLS policies
-- Problem: policies were querying users table from within users table policies
-- Solution: Use auth.users table and create non-recursive policies

-- Drop all existing problematic policies on users table
DROP POLICY IF EXISTS "Super admins can manage users" ON users;
DROP POLICY IF EXISTS "Org admins can manage users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create a helper function to get current user's data without recursion
-- This function queries the users table once and caches the result
CREATE OR REPLACE FUNCTION get_current_user_info()
RETURNS TABLE(user_id uuid, user_role text, user_org_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT id, role, organization_id
  FROM users
  WHERE id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_user_info() TO authenticated;

-- Create non-recursive RLS policies using the helper function

-- 1. Super admins can do everything
CREATE POLICY "Super admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT user_role FROM get_current_user_info()) = 'super_admin'
)
WITH CHECK (
  (SELECT user_role FROM get_current_user_info()) = 'super_admin'
);

-- 2. Org admins can manage users in their organization
CREATE POLICY "Org admins can manage users in their organization"
ON users
FOR ALL
TO authenticated
USING (
  (SELECT user_role FROM get_current_user_info()) = 'org_admin'
  AND organization_id = (SELECT user_org_id FROM get_current_user_info())
)
WITH CHECK (
  (SELECT user_role FROM get_current_user_info()) = 'org_admin'
  AND organization_id = (SELECT user_org_id FROM get_current_user_info())
);

-- 3. Users can view users in their organization
CREATE POLICY "Users can view users in their organization"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT user_org_id FROM get_current_user_info())
);

-- 4. Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
);

-- 5. Users can update their own profile (limited fields)
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
)
WITH CHECK (
  id = auth.uid()
  -- Prevent users from changing their role or organization_id
  AND role = (SELECT role FROM users WHERE id = auth.uid())
  AND organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);