/*
  # Add Organization Assignments

  1. New Tables
    - `assessment_organization_assignments`
      - Links assessments to organizations they are assigned to
      - Enables tracking which organizations can access each assessment

  2. Changes
    - Add organization assignments table
    - Add RLS policies for organization assignments
    - Add trigger to maintain updated_at
*/

-- Create assessment organization assignments table
CREATE TABLE IF NOT EXISTS assessment_organization_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, organization_id)
);

-- Enable RLS
ALTER TABLE assessment_organization_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Add updated_at trigger
CREATE TRIGGER update_assessment_organization_assignments_updated_at
  BEFORE UPDATE ON assessment_organization_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();