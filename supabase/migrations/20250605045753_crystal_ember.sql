/*
  # Initial Schema Setup for 360° Feedback Platform

  1. New Tables
    - organizations
      - id (uuid, primary key)
      - name (text)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - users
      - id (uuid, primary key)
      - email (text, unique)
      - first_name (text)
      - last_name (text)
      - role (text)
      - organization_id (uuid, foreign key)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - assessments
      - id (uuid, primary key)
      - title (text)
      - description (text)
      - organization_id (uuid, foreign key)
      - created_by_id (uuid, foreign key)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - assessment_sections
      - id (uuid, primary key)
      - assessment_id (uuid, foreign key)
      - title (text)
      - description (text)
      - order (integer)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - assessment_questions
      - id (uuid, primary key)
      - section_id (uuid, foreign key)
      - text (text)
      - order (integer)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - assessment_assignments
      - id (uuid, primary key)
      - assessment_id (uuid, foreign key)
      - employee_id (uuid, foreign key)
      - reviewer_id (uuid, foreign key)
      - status (text)
      - due_date (timestamp)
      - created_at (timestamp)
      - updated_at (timestamp)
    
    - assessment_responses
      - id (uuid, primary key)
      - assignment_id (uuid, foreign key)
      - question_id (uuid, foreign key)
      - rating (integer)
      - comment (text)
      - respondent_id (uuid, foreign key)
      - created_at (timestamp)
      - updated_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users based on their roles
    - Super admins have full access to all tables
    - Users can only access data within their organization
    - Employees/reviewers can only access their assigned assessments
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'employee', 'reviewer')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessments table
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_sections table
CREATE TABLE IF NOT EXISTS assessment_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_questions table
CREATE TABLE IF NOT EXISTS assessment_questions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id uuid REFERENCES assessment_sections(id) ON DELETE CASCADE,
  text text NOT NULL,
  "order" integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_assignments table
CREATE TABLE IF NOT EXISTS assessment_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create assessment_responses table
CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  question_id uuid REFERENCES assessment_questions(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  respondent_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

-- Create policies for organizations
CREATE POLICY "Super admins can manage organizations"
  ON organizations
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

-- Create policies for users
CREATE POLICY "Super admins can manage users"
  ON users
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view users in their organization"
  ON users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.organization_id = users.organization_id
    )
  );

-- Create policies for assessments
CREATE POLICY "Super admins can manage assessments"
  ON assessments
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view assessments in their organization"
  ON assessments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = assessments.organization_id
    )
  );

-- Create policies for assessment sections
CREATE POLICY "Super admins can manage assessment sections"
  ON assessment_sections
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view assessment sections in their organization"
  ON assessment_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN assessments a ON a.organization_id = u.organization_id
      WHERE u.id = auth.uid()
      AND a.id = assessment_sections.assessment_id
    )
  );

-- Create policies for assessment questions
CREATE POLICY "Super admins can manage assessment questions"
  ON assessment_questions
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view assessment questions in their organization"
  ON assessment_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN assessments a ON a.organization_id = u.organization_id
      JOIN assessment_sections s ON s.assessment_id = a.id
      WHERE u.id = auth.uid()
      AND s.id = assessment_questions.section_id
    )
  );

-- Create policies for assessment assignments
CREATE POLICY "Super admins can manage assessment assignments"
  ON assessment_assignments
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can view and update their assignments"
  ON assessment_assignments
  FOR ALL
  USING (
    employee_id = auth.uid()
    OR reviewer_id = auth.uid()
  );

-- Create policies for assessment responses
CREATE POLICY "Super admins can view all responses"
  ON assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Users can manage their own responses"
  ON assessment_responses
  FOR ALL
  USING (
    respondent_id = auth.uid()
  );

CREATE POLICY "Users can view responses for their assessments"
  ON assessment_responses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessment_assignments aa
      WHERE aa.id = assessment_responses.assignment_id
      AND (aa.employee_id = auth.uid() OR aa.reviewer_id = auth.uid())
    )
  );

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_sections_updated_at
  BEFORE UPDATE ON assessment_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_questions_updated_at
  BEFORE UPDATE ON assessment_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_assignments_updated_at
  BEFORE UPDATE ON assessment_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_responses_updated_at
  BEFORE UPDATE ON assessment_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();