/*
  # Competency Framework Integration

  1. New Tables
    - `competencies`: Stores competency definitions
    - `question_competencies`: Junction table linking questions to competencies
  
  2. Security
    - Enable RLS on all tables
    - Add policies for different user roles
    - Create helper functions for competency management
  
  3. Changes
    - Add triggers for updated_at timestamps
    - Create indexes for performance
*/

-- Create competencies table
CREATE TABLE IF NOT EXISTS competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create question_competencies junction table
CREATE TABLE IF NOT EXISTS question_competencies (
  question_id uuid REFERENCES assessment_questions(id) ON DELETE CASCADE,
  competency_id uuid REFERENCES competencies(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (question_id, competency_id)
);

-- Enable RLS
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_competencies ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_competencies_organization_id ON competencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_question_id ON question_competencies(question_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_competency_id ON question_competencies(competency_id);

-- Create triggers for updated_at
CREATE TRIGGER update_competencies_updated_at
BEFORE UPDATE ON competencies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_question_competencies_updated_at
BEFORE UPDATE ON question_competencies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for competencies
CREATE POLICY "Super admins can manage all competencies"
ON competencies
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

CREATE POLICY "Org admins can manage competencies in their organization"
ON competencies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = competencies.organization_id
    AND has_org_admin_permission(auth.uid(), 'create_assessments')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = competencies.organization_id
    AND has_org_admin_permission(auth.uid(), 'create_assessments')
  )
);

CREATE POLICY "Users can view competencies in their organization"
ON competencies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = competencies.organization_id
  )
);

-- RLS Policies for question_competencies
CREATE POLICY "Super admins can manage all question competencies"
ON question_competencies
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

CREATE POLICY "Org admins can manage question competencies in their organization"
ON question_competencies
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN competencies c ON c.id = question_competencies.competency_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND u.organization_id = c.organization_id
    AND has_org_admin_permission(auth.uid(), 'create_assessments')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN competencies c ON c.id = question_competencies.competency_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND u.organization_id = c.organization_id
    AND has_org_admin_permission(auth.uid(), 'create_assessments')
  )
);

CREATE POLICY "Users can view question competencies in their organization"
ON question_competencies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN competencies c ON c.id = question_competencies.competency_id
    WHERE u.id = auth.uid()
    AND u.organization_id = c.organization_id
  )
);

-- Helper function to get competencies for a question
CREATE OR REPLACE FUNCTION get_question_competencies(question_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description
  FROM competencies c
  JOIN question_competencies qc ON qc.competency_id = c.id
  WHERE qc.question_id = question_id
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (
      users.role = 'super_admin'
      OR users.organization_id = c.organization_id
    )
  );
END;
$$;

-- Helper function to get questions for a competency
CREATE OR REPLACE FUNCTION get_competency_questions(competency_id uuid)
RETURNS TABLE (
  id uuid,
  text text,
  question_type text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.text,
    q.question_type::text
  FROM assessment_questions q
  JOIN question_competencies qc ON qc.question_id = q.id
  WHERE qc.competency_id = competency_id
  AND EXISTS (
    SELECT 1 FROM users u
    JOIN competencies c ON c.id = competency_id
    WHERE u.id = auth.uid()
    AND (
      u.role = 'super_admin'
      OR u.organization_id = c.organization_id
    )
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_question_competencies TO authenticated;
GRANT EXECUTE ON FUNCTION get_competency_questions TO authenticated;

-- Insert some default competencies for demo organizations
INSERT INTO competencies (name, description, organization_id)
VALUES 
('Leadership', 'Ability to lead and inspire teams', 'demo-org-1'),
('Communication', 'Effective verbal and written communication skills', 'demo-org-1'),
('Problem Solving', 'Ability to analyze and solve complex problems', 'demo-org-1'),
('Teamwork', 'Ability to collaborate effectively with others', 'demo-org-1'),
('Technical Skills', 'Proficiency in required technical areas', 'demo-org-1'),
('Innovation', 'Ability to generate new ideas and approaches', 'demo-org-2'),
('Customer Focus', 'Understanding and meeting customer needs', 'demo-org-2'),
('Strategic Thinking', 'Ability to think and plan for the long term', 'demo-org-3')
ON CONFLICT (organization_id, name) DO NOTHING;