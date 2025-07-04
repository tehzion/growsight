/*
  # Fix Organizations RLS Policy

  1. Changes
    - Add RLS policy to allow super admins to create organizations
    - Add RLS policy to allow super admins to manage organizations
    - Add RLS policy to allow users to view their organizations

  2. Security
    - Enable RLS on organizations table
    - Add policies for:
      - Super admin management
      - User organization viewing
*/

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;

-- Create new policies
CREATE POLICY "Super admins can manage organizations"
ON organizations
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