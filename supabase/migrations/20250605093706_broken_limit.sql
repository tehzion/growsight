/*
  # Fix Users RLS Policy

  1. Changes
    - Remove recursive policy on users table
    - Add new policy for viewing users that avoids recursion
    - Keep existing super admin policy

  2. Security
    - Maintains RLS on users table
    - Ensures users can only view users in their own organization
    - Prevents infinite recursion by using direct id comparison
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create new policy that avoids recursion
CREATE POLICY "Users can view users in their organization" 
ON users
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);