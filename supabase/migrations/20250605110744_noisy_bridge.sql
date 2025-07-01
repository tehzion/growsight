/*
  # Fix Organizations RLS Policies

  1. Changes
    - Add explicit INSERT policy for super admins to create organizations
    - Consolidate existing policies for better clarity
    - Ensure proper RLS coverage for all operations

  2. Security
    - Maintains strict access control where only super admins can manage organizations
    - Users can still view organizations they belong to
*/

-- Drop existing policies to recreate them in a more organized way
DROP POLICY IF EXISTS "Super admins can create organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can delete organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view organizations" ON organizations;

-- Create comprehensive policies
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
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Users can view their organizations"
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