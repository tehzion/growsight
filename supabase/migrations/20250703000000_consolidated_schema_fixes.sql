/*
  # Consolidated Schema Fixes Migration
  
  This migration consolidates the failed migrations into a single, properly ordered migration:
  - 20250629153806_sparkling_canyon.sql (PDF Branding Settings)
  - 20250629162040_golden_tooth.sql (Departments, Import/Export, Subscriber Role)
  - 20250629181355_fierce_poetry.sql (Competency Framework)
  - 20250701000000_fix_critical_rls_policies.sql (RLS Policy Fixes)
  - 20250701000001_fix_org_staff_management.sql (Staff Management)
  
  Dependencies are organized in proper order to prevent failures.
*/

-- =====================================================================================
-- SECTION 1: UTILITY FUNCTIONS (Create all required functions first)
-- =====================================================================================

-- Create update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create helper function for organization admin permissions (simplified version)
CREATE OR REPLACE FUNCTION has_org_admin_permission(user_id uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Simple check if user is org_admin or super_admin
  -- This avoids complex permission tables for now
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role IN ('org_admin', 'super_admin')
  );
END;
$$;

-- Create safe user context function for self-hosted Supabase
CREATE OR REPLACE FUNCTION get_user_org_context()
RETURNS TABLE (
    user_id UUID,
    user_role TEXT,
    organization_id TEXT,
    is_super_admin BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- For self-hosted Supabase, fall back to direct user lookup if JWT functions fail
    RETURN QUERY
    SELECT 
        COALESCE(
            (auth.jwt() ->> 'sub')::UUID,
            auth.uid()
        ) as user_id,
        COALESCE(
            auth.jwt() ->> 'user_role',
            (SELECT role FROM users WHERE id = auth.uid())
        ) as user_role,
        COALESCE(
            auth.jwt() ->> 'organization_id',
            (SELECT organization_id FROM users WHERE id = auth.uid())
        ) as organization_id,
        COALESCE(
            (auth.jwt() ->> 'user_role') = 'super_admin',
            (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
        ) as is_super_admin;
EXCEPTION WHEN OTHERS THEN
    -- Fallback for self-hosted environments where JWT functions may not work
    RETURN QUERY
    SELECT 
        auth.uid() as user_id,
        COALESCE(u.role, 'employee') as user_role,
        u.organization_id as organization_id,
        COALESCE(u.role = 'super_admin', false) as is_super_admin
    FROM users u
    WHERE u.id = auth.uid();
END;
$$;

-- Create organization boundary check function
CREATE OR REPLACE FUNCTION check_org_access(target_org_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    context_rec RECORD;
BEGIN
    SELECT * INTO context_rec FROM get_user_org_context();
    
    -- Super admins can access any organization
    IF context_rec.is_super_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users can only access their own organization
    RETURN context_rec.organization_id = target_org_id;
END;
$$;

-- Create organization membership validation function
CREATE OR REPLACE FUNCTION validate_organization_membership(
    user_id UUID,
    target_org_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_org_id TEXT;
    user_role TEXT;
BEGIN
    -- Get user's organization and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM users WHERE id = user_id;
    
    -- Super admins can access any organization
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users can only access their own organization
    RETURN user_org_id = target_org_id;
END;
$$;

-- =====================================================================================
-- SECTION 2: SCHEMA UPDATES (Update existing tables)
-- =====================================================================================

-- Add 'subscriber' role to user role constraint
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
  
  -- Add new constraint with subscriber role
  ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'));
END $$;

-- Add department_id to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id uuid;

-- Add organization constraints if they don't exist
DO $$
BEGIN
    -- Add organization_id constraint to users if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================================================
-- SECTION 3: NEW TABLES (Create all new tables with dependencies in order)
-- =====================================================================================

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Add department foreign key to users table now that departments table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_department_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;

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

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'pdf', 'xlsx')),
  import_type text NOT NULL CHECK (import_type IN ('users', 'assessments', 'responses')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_processed integer DEFAULT 0,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create export_logs table
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exported_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'pdf', 'xlsx')),
  export_type text NOT NULL CHECK (export_type IN ('users', 'assessments', 'responses', 'results', 'analytics')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_exported integer DEFAULT 0,
  is_anonymized boolean DEFAULT false,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  download_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create PDF branding settings table
CREATE TABLE IF NOT EXISTS pdf_branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url text,
  company_name text NOT NULL,
  primary_color text NOT NULL DEFAULT '#2563EB',
  secondary_color text NOT NULL DEFAULT '#7E22CE',
  footer_text text,
  include_timestamp boolean NOT NULL DEFAULT true,
  include_page_numbers boolean NOT NULL DEFAULT true,
  default_template text NOT NULL DEFAULT 'standard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id)
);

-- Create profile tags table
CREATE TABLE IF NOT EXISTS profile_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    tag_category TEXT NOT NULL DEFAULT 'behavior',
    tag_value JSONB DEFAULT '{}',
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique tag per user per category
    UNIQUE(user_id, tag_name, tag_category)
);

-- Create user behavior tracking table
CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    behavior_type TEXT NOT NULL,
    behavior_data JSONB NOT NULL DEFAULT '{}',
    context TEXT,
    recorded_by_id UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id TEXT NOT NULL
);

-- Create staff assignment tracking table
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    organization_id TEXT NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'permanent',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    assignment_data JSONB DEFAULT '{}',
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- SECTION 4: INDEXES (Create performance indexes)
-- =====================================================================================

-- Competencies indexes
CREATE INDEX IF NOT EXISTS idx_competencies_organization_id ON competencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_question_id ON question_competencies(question_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_competency_id ON question_competencies(competency_id);

-- Import/Export logs indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_organization_id ON import_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_organization_id ON export_logs(organization_id);

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- Profile and behavior indexes
CREATE INDEX IF NOT EXISTS idx_profile_tags_user_id ON profile_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_category ON profile_tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_type ON user_behaviors(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_org_id ON user_behaviors(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_id ON staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_org_id ON staff_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_supervisor_id ON staff_assignments(supervisor_id);

-- RLS performance indexes
CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_employee_id ON assessment_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_reviewer_id ON assessment_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assignment_id ON assessment_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_respondent_id ON assessment_responses(respondent_id);

-- =====================================================================================
-- SECTION 5: ENABLE RLS (Enable Row Level Security on all tables)
-- =====================================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on core tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- SECTION 6: DROP EXISTING POLICIES (Clean slate for policy creation)
-- =====================================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop existing policies on tables we're updating
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'organizations', 'assessments', 'assessment_assignments', 
            'assessment_responses', 'user_relationships', 'competencies',
            'departments', 'import_logs', 'export_logs', 'pdf_branding_settings',
            'profile_tags', 'user_behaviors', 'staff_assignments'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- =====================================================================================
-- SECTION 7: CREATE RLS POLICIES (Create all policies with proper dependencies)
-- =====================================================================================

-- ORGANIZATIONS POLICIES
CREATE POLICY "organizations_select_policy" ON organizations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = organizations.id
        )
    );

CREATE POLICY "organizations_insert_policy" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

CREATE POLICY "organizations_update_policy" ON organizations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = organizations.id
        )
    );

-- USERS POLICIES
CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = users.organization_id
        )
    );

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = users.organization_id AND ctx.user_role = 'org_admin') OR
                ctx.user_id = users.id
        )
    );

-- DEPARTMENTS POLICIES
CREATE POLICY "departments_select_policy" ON departments
    FOR SELECT TO authenticated
    USING (
        check_org_access(departments.organization_id)
    );

CREATE POLICY "departments_insert_policy" ON departments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "departments_update_policy" ON departments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = departments.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- COMPETENCIES POLICIES
CREATE POLICY "competencies_select_policy" ON competencies
    FOR SELECT TO authenticated
    USING (
        check_org_access(competencies.organization_id)
    );

CREATE POLICY "competencies_insert_policy" ON competencies
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- QUESTION COMPETENCIES POLICIES
CREATE POLICY "question_competencies_select_policy" ON question_competencies
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN competencies c ON c.id = question_competencies.competency_id
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = c.organization_id
        )
    );

CREATE POLICY "question_competencies_insert_policy" ON question_competencies
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN competencies c ON c.id = NEW.competency_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = c.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- IMPORT LOGS POLICIES
CREATE POLICY "import_logs_select_policy" ON import_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = import_logs.organization_id AND ctx.user_role = 'org_admin') OR
                ctx.user_id = import_logs.imported_by_id
        )
    );

CREATE POLICY "import_logs_insert_policy" ON import_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- EXPORT LOGS POLICIES
CREATE POLICY "export_logs_select_policy" ON export_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = export_logs.organization_id AND ctx.user_role = 'org_admin') OR
                ctx.user_id = export_logs.exported_by_id
        )
    );

CREATE POLICY "export_logs_insert_policy" ON export_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- PDF BRANDING SETTINGS POLICIES
CREATE POLICY "pdf_branding_settings_select_policy" ON pdf_branding_settings
    FOR SELECT TO authenticated
    USING (
        check_org_access(pdf_branding_settings.organization_id)
    );

CREATE POLICY "pdf_branding_settings_insert_policy" ON pdf_branding_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "pdf_branding_settings_update_policy" ON pdf_branding_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = pdf_branding_settings.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- PROFILE TAGS POLICIES
CREATE POLICY "profile_tags_select_policy" ON profile_tags
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = u.organization_id
        )
    );

CREATE POLICY "profile_tags_insert_policy" ON profile_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = NEW.user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = u.organization_id AND ctx.user_role IN ('org_admin', 'super_admin'))
        )
    );

-- USER BEHAVIORS POLICIES
CREATE POLICY "user_behaviors_select_policy" ON user_behaviors
    FOR SELECT TO authenticated
    USING (
        check_org_access(user_behaviors.organization_id)
    );

CREATE POLICY "user_behaviors_insert_policy" ON user_behaviors
    FOR INSERT TO authenticated
    WITH CHECK (
        check_org_access(NEW.organization_id)
    );

-- STAFF ASSIGNMENTS POLICIES
CREATE POLICY "staff_assignments_select_policy" ON staff_assignments
    FOR SELECT TO authenticated
    USING (
        check_org_access(staff_assignments.organization_id)
    );

CREATE POLICY "staff_assignments_insert_policy" ON staff_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role IN ('org_admin', 'super_admin'))
        )
    );

-- =====================================================================================
-- SECTION 8: CREATE TRIGGERS (Add updated_at triggers)
-- =====================================================================================

DO $$
BEGIN
  -- Drop existing triggers to avoid conflicts
  DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
  DROP TRIGGER IF EXISTS update_competencies_updated_at ON competencies;
  DROP TRIGGER IF EXISTS update_question_competencies_updated_at ON question_competencies;
  DROP TRIGGER IF EXISTS update_import_logs_updated_at ON import_logs;
  DROP TRIGGER IF EXISTS update_export_logs_updated_at ON export_logs;
  DROP TRIGGER IF EXISTS update_pdf_branding_settings_updated_at ON pdf_branding_settings;
  DROP TRIGGER IF EXISTS update_profile_tags_updated_at ON profile_tags;
  DROP TRIGGER IF EXISTS update_staff_assignments_updated_at ON staff_assignments;
  
  -- Create triggers
  CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_competencies_updated_at
    BEFORE UPDATE ON competencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_question_competencies_updated_at
    BEFORE UPDATE ON question_competencies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_import_logs_updated_at
    BEFORE UPDATE ON import_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_export_logs_updated_at
    BEFORE UPDATE ON export_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_pdf_branding_settings_updated_at
    BEFORE UPDATE ON pdf_branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_profile_tags_updated_at
    BEFORE UPDATE ON profile_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

  CREATE TRIGGER update_staff_assignments_updated_at
    BEFORE UPDATE ON staff_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
END $$;

-- =====================================================================================
-- SECTION 9: BUSINESS LOGIC FUNCTIONS (Create helper functions)
-- =====================================================================================

-- Function to get PDF branding settings
CREATE OR REPLACE FUNCTION get_pdf_branding_settings(org_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  logo_url text,
  company_name text,
  primary_color text,
  secondary_color text,
  footer_text text,
  include_timestamp boolean,
  include_page_numbers boolean,
  default_template text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view these settings
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return settings
  RETURN QUERY
  SELECT 
    pbs.id,
    pbs.organization_id,
    pbs.logo_url,
    pbs.company_name,
    pbs.primary_color,
    pbs.secondary_color,
    pbs.footer_text,
    pbs.include_timestamp,
    pbs.include_page_numbers,
    pbs.default_template
  FROM pdf_branding_settings pbs
  WHERE pbs.organization_id = org_id;
END;
$$;

-- Function to get competencies for a question
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

-- Function to get questions for a competency
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

-- Function to create department
CREATE OR REPLACE FUNCTION create_department(
  p_organization_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_parent_department_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  department_id uuid;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (
        role = 'org_admin'
        AND organization_id = p_organization_id
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Check if parent department exists and belongs to the same organization
  IF p_parent_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM departments
    WHERE id = p_parent_department_id
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Parent department not found or belongs to a different organization';
  END IF;

  -- Create department
  INSERT INTO departments (
    organization_id,
    name,
    description,
    parent_department_id,
    created_by_id
  ) VALUES (
    p_organization_id,
    p_name,
    p_description,
    p_parent_department_id,
    auth.uid()
  ) RETURNING id INTO department_id;

  RETURN department_id;
END;
$$;

-- =====================================================================================
-- SECTION 10: GRANT PERMISSIONS (Grant execute permissions)
-- =====================================================================================

GRANT EXECUTE ON FUNCTION get_user_org_context() TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_access(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_organization_membership(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_org_admin_permission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pdf_branding_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_question_competencies(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_competency_questions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_department(UUID, TEXT, TEXT, UUID) TO authenticated;

-- =====================================================================================
-- SECTION 11: INSERT DEFAULT DATA (Insert safe default data)
-- =====================================================================================

-- Insert default competencies for existing organizations (only for demo organizations)
INSERT INTO competencies (name, description, organization_id)
SELECT 
    comp.name,
    comp.description,
    o.id
FROM organizations o
CROSS JOIN (
    VALUES 
    ('Leadership', 'Ability to lead and inspire teams'),
    ('Communication', 'Effective verbal and written communication skills'),
    ('Problem Solving', 'Ability to analyze and solve complex problems'),
    ('Teamwork', 'Ability to collaborate effectively with others'),
    ('Technical Skills', 'Proficiency in required technical areas')
) AS comp(name, description)
WHERE o.id IN (
    SELECT id FROM organizations 
    WHERE name ILIKE '%demo%' OR id::text LIKE 'demo-%'
)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert default PDF branding settings for existing organizations (with system user as creator)
INSERT INTO pdf_branding_settings (
  organization_id,
  company_name,
  primary_color,
  secondary_color,
  footer_text,
  default_template,
  created_by_id
)
SELECT 
  o.id,
  o.name,
  '#2563EB',
  '#7E22CE',
  '© ' || EXTRACT(YEAR FROM CURRENT_DATE) || ' ' || o.name || '. All rights reserved.',
  'standard',
  -- Use the first super_admin user as creator, or NULL if none exists
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
FROM organizations o
ON CONFLICT (organization_id) DO NOTHING;

-- =====================================================================================
-- SECTION 12: MIGRATION TRACKING
-- =====================================================================================

-- Create migrations table if it doesn't exist
CREATE TABLE IF NOT EXISTS migrations (
    name text PRIMARY KEY,
    executed_at timestamptz DEFAULT now()
);

-- Mark this migration as complete and mark failed migrations as superseded
INSERT INTO migrations (name, executed_at) VALUES 
    ('20250703000000_consolidated_schema_fixes', NOW()),
    ('20250629153806_sparkling_canyon_superseded', NOW()),
    ('20250629162040_golden_tooth_superseded', NOW()),
    ('20250629181355_fierce_poetry_superseded', NOW()),
    ('20250701000000_fix_critical_rls_policies_superseded', NOW()),
    ('20250701000001_fix_org_staff_management_superseded', NOW())
ON CONFLICT (name) DO UPDATE SET executed_at = NOW();

-- Add comments for documentation
COMMENT ON FUNCTION get_user_org_context() IS 'Securely retrieves user context with fallback for self-hosted Supabase';
COMMENT ON FUNCTION check_org_access(TEXT) IS 'Validates if current user can access specified organization data';
COMMENT ON TABLE pdf_branding_settings IS 'Organization-specific PDF branding and layout settings';
COMMENT ON TABLE competencies IS 'Skills and competencies framework for assessments';
COMMENT ON TABLE departments IS 'Organizational department structure with hierarchy support';
COMMENT ON TABLE profile_tags IS 'User behavior and characteristic tags for enhanced profiles';
COMMENT ON TABLE staff_assignments IS 'Staff assignment tracking with supervisor and department relationships'; 