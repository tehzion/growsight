/*
  # Add Organization Admin Role

  1. Changes
    - Update users table role constraint to include 'org_admin'
    - Add new RLS policies for organization admin role
    - Update existing policies to handle org_admin permissions

  2. Security
    - Organization admins can manage users within their organization
    - Organization admins can manage assessments within their organization
    - Organization admins can view results within their organization
*/

-- Update the role constraint to include org_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer'));

-- Update policies for users table
DROP POLICY IF EXISTS "Super admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create new policies for users
CREATE POLICY "Super admins can manage users"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'super_admin'
  )
);

CREATE POLICY "Org admins can manage users in their organization"
ON users
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'org_admin' 
    AND u.organization_id = users.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid() 
    AND u.role = 'org_admin' 
    AND u.organization_id = users.organization_id
  )
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

-- Update policies for assessments table
DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;

CREATE POLICY "Super admins can manage assessments"
ON assessments
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

CREATE POLICY "Org admins can manage assessments in their organization"
ON assessments
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = assessments.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = assessments.organization_id
  )
);

CREATE POLICY "Users can view assessments in their organization"
ON assessments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = assessments.organization_id
  )
);

-- Update policies for assessment sections
DROP POLICY IF EXISTS "Super admins can manage assessment sections" ON assessment_sections;
DROP POLICY IF EXISTS "Users can view assessment sections in their organization" ON assessment_sections;

CREATE POLICY "Super admins can manage assessment sections"
ON assessment_sections
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

CREATE POLICY "Org admins can manage assessment sections in their organization"
ON assessment_sections
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_sections.assessment_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_sections.assessment_id
  )
);

CREATE POLICY "Users can view assessment sections in their organization"
ON assessment_sections
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND a.id = assessment_sections.assessment_id
  )
);

-- Update policies for assessment questions
DROP POLICY IF EXISTS "Super admins can manage assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Users can view assessment questions in their organization" ON assessment_questions;

CREATE POLICY "Super admins can manage assessment questions"
ON assessment_questions
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

CREATE POLICY "Org admins can manage assessment questions in their organization"
ON assessment_questions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND s.id = assessment_questions.section_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND s.id = assessment_questions.section_id
  )
);

CREATE POLICY "Users can view assessment questions in their organization"
ON assessment_questions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    WHERE u.id = auth.uid()
    AND s.id = assessment_questions.section_id
  )
);