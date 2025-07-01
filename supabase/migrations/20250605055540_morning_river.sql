/*
  # Assessment Organization Assignments

  1. New Tables
    - `assessment_organization_assignments`
      - `id` (uuid, primary key)
      - `assessment_id` (uuid, foreign key to assessments)
      - `organization_id` (uuid, foreign key to organizations)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for super admins and organization users
*/

DO $$ BEGIN
  -- Create table if it doesn't exist
  CREATE TABLE IF NOT EXISTS assessment_organization_assignments (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
    organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(assessment_id, organization_id)
  );

  -- Enable RLS if not already enabled
  ALTER TABLE assessment_organization_assignments ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage organization assignments" ON assessment_organization_assignments;
  DROP POLICY IF EXISTS "Users can view assignments for their organization" ON assessment_organization_assignments;

  -- Create new policies
  CREATE POLICY "Super admins can manage organization assignments"
    ON assessment_organization_assignments
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );

  CREATE POLICY "Users can view assignments for their organization"
    ON assessment_organization_assignments
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.organization_id = assessment_organization_assignments.organization_id
      )
    );

  -- Create updated_at trigger if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_assessment_organization_assignments_updated_at'
  ) THEN
    CREATE TRIGGER update_assessment_organization_assignments_updated_at
      BEFORE UPDATE ON assessment_organization_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;