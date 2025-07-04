/*
  # Fix Organizations RLS Policies

  1. Changes
    - Add RLS policy to allow super admins to create organizations
    - Add RLS policy to allow super admins to update organizations
    - Add RLS policy to allow super admins to delete organizations

  2. Security
    - Enable RLS on organizations table (already enabled)
    - Add policies for INSERT, UPDATE, and DELETE operations
    - Restrict operations to super_admin users only
*/

-- Drop existing policies to recreate them with proper permissions
DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

-- Create comprehensive policies for all operations
CREATE POLICY "Super admins can create organizations"
  ON organizations
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Super admins can update organizations"
  ON organizations
  FOR UPDATE
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

CREATE POLICY "Super admins can delete organizations"
  ON organizations
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view organizations"
  ON organizations
  FOR SELECT
  TO public
  USING (
    -- Allow super admins to view all organizations
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
    OR
    -- Allow users to view their own organization
    id IN (
      SELECT organization_id
      FROM users
      WHERE users.id = auth.uid()
    )
  );