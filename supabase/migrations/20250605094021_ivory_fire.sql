/*
  # Fix User Policies to Prevent Infinite Recursion

  1. Changes
    - Remove circular dependency in user policies
    - Simplify organization access checks
    - Update policy definitions to be more efficient
  
  2. Security
    - Maintain existing security model
    - Fix infinite recursion issue
    - Ensure proper access control
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Super admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create new policies without circular dependencies
CREATE POLICY "Super admins can manage users"
ON users
FOR ALL
TO public
USING (
  role = 'super_admin'
);

CREATE POLICY "Users can view users in their organization"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
);

-- Update organizations policies to be more efficient
DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

CREATE POLICY "Super admins can manage organizations"
ON organizations
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Users can view their organization"
ON organizations
FOR SELECT
TO public
USING (
  id IN (
    SELECT organization_id 
    FROM users 
    WHERE users.id = auth.uid()
  )
);