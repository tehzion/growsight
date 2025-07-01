/*
  # Add Organization Admin Role and Update Permissions

  1. Role Updates
    - Add 'org_admin' role to user role constraint
    - Update all RLS policies to support organization admin permissions

  2. Permission Structure
    - Super Admin: Full system access
    - Organization Admin: Manage users and assessments within their organization
    - Employee/Reviewer: Access to their organization's content

  3. Security
    - Update RLS policies for all tables
    - Ensure proper access control for organization admins
*/

-- Update the role constraint to include org_admin
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
  
  -- Add new constraint with org_admin role
  ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer'));
END $$;

-- Update policies for users table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage users" ON users;
  DROP POLICY IF EXISTS "Org admins can manage users in their organization" ON users;
  DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
END $$;

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
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage assessments" ON assessments;
  DROP POLICY IF EXISTS "Org admins can manage assessments in their organization" ON assessments;
  DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;
END $$;

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
TO authenticated
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
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage assessment sections" ON assessment_sections;
  DROP POLICY IF EXISTS "Org admins can manage assessment sections in their organization" ON assessment_sections;
  DROP POLICY IF EXISTS "Users can view assessment sections in their organization" ON assessment_sections;
END $$;

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
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage assessment questions" ON assessment_questions;
  DROP POLICY IF EXISTS "Org admins can manage assessment questions in their organization" ON assessment_questions;
  DROP POLICY IF EXISTS "Users can view assessment questions in their organization" ON assessment_questions;
END $$;

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

-- Update policies for question options
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage question options" ON question_options;
  DROP POLICY IF EXISTS "Org admins can manage question options in their organization" ON question_options;
  DROP POLICY IF EXISTS "Users can view question options in their organization" ON question_options;
END $$;

CREATE POLICY "Super admins can manage question options"
ON question_options
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

CREATE POLICY "Org admins can manage question options in their organization"
ON question_options
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    JOIN assessment_questions q ON q.section_id = s.id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND q.id = question_options.question_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    JOIN assessment_questions q ON q.section_id = s.id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND q.id = question_options.question_id
  )
);

CREATE POLICY "Users can view question options in their organization"
ON question_options
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    JOIN assessment_sections s ON s.assessment_id = a.id
    JOIN assessment_questions q ON q.section_id = s.id
    WHERE u.id = auth.uid()
    AND q.id = question_options.question_id
  )
);

-- Update policies for assessment assignments
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Super admins can manage assessment assignments" ON assessment_assignments;
  DROP POLICY IF EXISTS "Org admins can manage assessment assignments in their organization" ON assessment_assignments;
  DROP POLICY IF EXISTS "Users can view and update their assignments" ON assessment_assignments;
END $$;

CREATE POLICY "Super admins can manage assessment assignments"
ON assessment_assignments
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

CREATE POLICY "Org admins can manage assessment assignments in their organization"
ON assessment_assignments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
);

CREATE POLICY "Users can view and update their assignments"
ON assessment_assignments
FOR ALL
TO authenticated
USING (
  (employee_id = auth.uid()) OR (reviewer_id = auth.uid())
)
WITH CHECK (
  (employee_id = auth.uid()) OR (reviewer_id = auth.uid())
);