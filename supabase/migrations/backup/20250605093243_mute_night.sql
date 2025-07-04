-- Fix potential issues with organizations table
ALTER TABLE organizations
ALTER COLUMN name SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT now(),
ALTER COLUMN updated_at SET DEFAULT now();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);

-- Ensure RLS policies are correctly set
DO $$ BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage organizations" ON organizations;
  DROP POLICY IF EXISTS "Users can view their organization" ON organizations;

  -- Recreate policies with correct permissions
  CREATE POLICY "Super admins can manage organizations"
    ON organizations
    FOR ALL
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
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.organization_id = organizations.id
      )
    );
END $$;