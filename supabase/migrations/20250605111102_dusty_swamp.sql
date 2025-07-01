/*
  # Fix Assessment Policies

  1. Changes
    - Add proper RLS policies for assessments table
    - Allow super admins to manage all assessments
    - Allow users to view assessments in their organization
    - Fix policy checks for assessment creation

  2. Security
    - Enable RLS on assessments table
    - Add policies for different user roles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;

-- Create new policies
CREATE POLICY "Super admins can manage assessments"
ON assessments
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

CREATE POLICY "Users can view assessments in their organization"
ON assessments
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = assessments.organization_id
  )
);