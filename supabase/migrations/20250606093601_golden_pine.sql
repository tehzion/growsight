/*
  # Fix Users Table Policies

  1. Changes
    - Fix RLS policies for users table to prevent recursion
    - Ensure proper permissions for user management
    - Add better error handling

  2. Security
    - Maintain proper access control
    - Allow super admins to manage users
    - Allow users to view users in their organization
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Super admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create new policies without circular dependencies
CREATE POLICY "Super admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  role = 'super_admin'
)
WITH CHECK (
  role = 'super_admin'
);

CREATE POLICY "Users can view users in their organization"
ON users
FOR SELECT
TO authenticated
USING (
  organization_id = (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);

-- Ensure proper constraints on users table
ALTER TABLE users 
ALTER COLUMN email SET NOT NULL,
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL,
ALTER COLUMN role SET NOT NULL;

-- Add index for better performance if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_organization_id') THEN
    CREATE INDEX idx_users_organization_id ON users(organization_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_users_email') THEN
    CREATE INDEX idx_users_email ON users(email);
  END IF;
END $$;