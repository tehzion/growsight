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