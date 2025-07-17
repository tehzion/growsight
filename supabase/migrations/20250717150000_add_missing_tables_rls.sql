-- =====================================================================================
-- ADD RLS POLICIES FOR NEW TABLES
-- This migration adds Row Level Security policies for the newly created tables
-- =====================================================================================

-- =====================================================================================
-- DEPARTMENTS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "departments_select_policy" ON departments;
DROP POLICY IF EXISTS "departments_insert_policy" ON departments;
DROP POLICY IF EXISTS "departments_update_policy" ON departments;
DROP POLICY IF EXISTS "departments_delete_policy" ON departments;

-- Departments SELECT policy
CREATE POLICY "departments_select_policy" ON departments
    FOR SELECT TO authenticated
    USING (
        check_org_access(departments.organization_id)
    );

-- Departments INSERT policy
CREATE POLICY "departments_insert_policy" ON departments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Departments UPDATE policy
CREATE POLICY "departments_update_policy" ON departments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = departments.organization_id)
        )
    );

-- Departments DELETE policy
CREATE POLICY "departments_delete_policy" ON departments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = departments.organization_id)
        )
    );

-- =====================================================================================
-- COMPETENCIES TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "competencies_select_policy" ON competencies;
DROP POLICY IF EXISTS "competencies_insert_policy" ON competencies;
DROP POLICY IF EXISTS "competencies_update_policy" ON competencies;
DROP POLICY IF EXISTS "competencies_delete_policy" ON competencies;

-- Competencies SELECT policy
CREATE POLICY "competencies_select_policy" ON competencies
    FOR SELECT TO authenticated
    USING (
        check_org_access(competencies.organization_id)
    );

-- Competencies INSERT policy
CREATE POLICY "competencies_insert_policy" ON competencies
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Competencies UPDATE policy
CREATE POLICY "competencies_update_policy" ON competencies
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = competencies.organization_id)
        )
    );

-- Competencies DELETE policy
CREATE POLICY "competencies_delete_policy" ON competencies
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = competencies.organization_id)
        )
    );

-- =====================================================================================
-- QUESTION COMPETENCIES TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "question_competencies_select_policy" ON question_competencies;
DROP POLICY IF EXISTS "question_competencies_insert_policy" ON question_competencies;
DROP POLICY IF EXISTS "question_competencies_update_policy" ON question_competencies;
DROP POLICY IF EXISTS "question_competencies_delete_policy" ON question_competencies;

-- Question competencies SELECT policy
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

-- Question competencies INSERT policy
CREATE POLICY "question_competencies_insert_policy" ON question_competencies
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN competencies c ON c.id = NEW.competency_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = c.organization_id)
        )
    );

-- Question competencies UPDATE policy
CREATE POLICY "question_competencies_update_policy" ON question_competencies
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN competencies c ON c.id = question_competencies.competency_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = c.organization_id)
        )
    );

-- Question competencies DELETE policy
CREATE POLICY "question_competencies_delete_policy" ON question_competencies
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN competencies c ON c.id = question_competencies.competency_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = c.organization_id)
        )
    );

-- =====================================================================================
-- PROFILE TAGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profile_tags_select_policy" ON profile_tags;
DROP POLICY IF EXISTS "profile_tags_insert_policy" ON profile_tags;
DROP POLICY IF EXISTS "profile_tags_update_policy" ON profile_tags;
DROP POLICY IF EXISTS "profile_tags_delete_policy" ON profile_tags;

-- Profile tags SELECT policy
CREATE POLICY "profile_tags_select_policy" ON profile_tags
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = profile_tags.user_id OR
                ctx.organization_id = u.organization_id
        )
    );

-- Profile tags INSERT policy
CREATE POLICY "profile_tags_insert_policy" ON profile_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = NEW.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = NEW.user_id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u.organization_id)
        )
    );

-- Profile tags UPDATE policy
CREATE POLICY "profile_tags_update_policy" ON profile_tags
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = profile_tags.user_id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u.organization_id)
        )
    );

-- Profile tags DELETE policy
CREATE POLICY "profile_tags_delete_policy" ON profile_tags
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = profile_tags.user_id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u.organization_id)
        )
    );

-- =====================================================================================
-- USER BEHAVIORS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_behaviors_select_policy" ON user_behaviors;
DROP POLICY IF EXISTS "user_behaviors_insert_policy" ON user_behaviors;
DROP POLICY IF EXISTS "user_behaviors_update_policy" ON user_behaviors;
DROP POLICY IF EXISTS "user_behaviors_delete_policy" ON user_behaviors;

-- User behaviors SELECT policy
CREATE POLICY "user_behaviors_select_policy" ON user_behaviors
    FOR SELECT TO authenticated
    USING (
        check_org_access(user_behaviors.organization_id)
    );

-- User behaviors INSERT policy
CREATE POLICY "user_behaviors_insert_policy" ON user_behaviors
    FOR INSERT TO authenticated
    WITH CHECK (
        check_org_access(NEW.organization_id)
    );

-- User behaviors UPDATE policy
CREATE POLICY "user_behaviors_update_policy" ON user_behaviors
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = user_behaviors.organization_id) OR
                ctx.user_id = user_behaviors.recorded_by
        )
    );

-- User behaviors DELETE policy
CREATE POLICY "user_behaviors_delete_policy" ON user_behaviors
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = user_behaviors.organization_id) OR
                ctx.user_id = user_behaviors.recorded_by
        )
    );

-- =====================================================================================
-- STAFF ASSIGNMENTS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "staff_assignments_select_policy" ON staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_insert_policy" ON staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_update_policy" ON staff_assignments;
DROP POLICY IF EXISTS "staff_assignments_delete_policy" ON staff_assignments;

-- Staff assignments SELECT policy
CREATE POLICY "staff_assignments_select_policy" ON staff_assignments
    FOR SELECT TO authenticated
    USING (
        check_org_access(staff_assignments.organization_id)
    );

-- Staff assignments INSERT policy
CREATE POLICY "staff_assignments_insert_policy" ON staff_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Staff assignments UPDATE policy
CREATE POLICY "staff_assignments_update_policy" ON staff_assignments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = staff_assignments.organization_id)
        )
    );

-- Staff assignments DELETE policy
CREATE POLICY "staff_assignments_delete_policy" ON staff_assignments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = staff_assignments.organization_id)
        )
    );

-- =====================================================================================
-- WEB BRANDING SETTINGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "web_branding_settings_select_policy" ON web_branding_settings;
DROP POLICY IF EXISTS "web_branding_settings_insert_policy" ON web_branding_settings;
DROP POLICY IF EXISTS "web_branding_settings_update_policy" ON web_branding_settings;
DROP POLICY IF EXISTS "web_branding_settings_delete_policy" ON web_branding_settings;

-- Web branding settings SELECT policy
CREATE POLICY "web_branding_settings_select_policy" ON web_branding_settings
    FOR SELECT TO authenticated
    USING (
        check_org_access(web_branding_settings.organization_id)
    );

-- Web branding settings INSERT policy
CREATE POLICY "web_branding_settings_insert_policy" ON web_branding_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Web branding settings UPDATE policy
CREATE POLICY "web_branding_settings_update_policy" ON web_branding_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = web_branding_settings.organization_id)
        )
    );

-- Web branding settings DELETE policy
CREATE POLICY "web_branding_settings_delete_policy" ON web_branding_settings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = web_branding_settings.organization_id)
        )
    );

-- =====================================================================================
-- EMAIL BRANDING SETTINGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "email_branding_settings_select_policy" ON email_branding_settings;
DROP POLICY IF EXISTS "email_branding_settings_insert_policy" ON email_branding_settings;
DROP POLICY IF EXISTS "email_branding_settings_update_policy" ON email_branding_settings;
DROP POLICY IF EXISTS "email_branding_settings_delete_policy" ON email_branding_settings;

-- Email branding settings SELECT policy
CREATE POLICY "email_branding_settings_select_policy" ON email_branding_settings
    FOR SELECT TO authenticated
    USING (
        check_org_access(email_branding_settings.organization_id)
    );

-- Email branding settings INSERT policy
CREATE POLICY "email_branding_settings_insert_policy" ON email_branding_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Email branding settings UPDATE policy
CREATE POLICY "email_branding_settings_update_policy" ON email_branding_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = email_branding_settings.organization_id)
        )
    );

-- Email branding settings DELETE policy
CREATE POLICY "email_branding_settings_delete_policy" ON email_branding_settings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = email_branding_settings.organization_id)
        )
    );

-- =====================================================================================
-- PDF BRANDING SETTINGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "pdf_branding_settings_select_policy" ON pdf_branding_settings;
DROP POLICY IF EXISTS "pdf_branding_settings_insert_policy" ON pdf_branding_settings;
DROP POLICY IF EXISTS "pdf_branding_settings_update_policy" ON pdf_branding_settings;
DROP POLICY IF EXISTS "pdf_branding_settings_delete_policy" ON pdf_branding_settings;

-- PDF branding settings SELECT policy
CREATE POLICY "pdf_branding_settings_select_policy" ON pdf_branding_settings
    FOR SELECT TO authenticated
    USING (
        check_org_access(pdf_branding_settings.organization_id)
    );

-- PDF branding settings INSERT policy
CREATE POLICY "pdf_branding_settings_insert_policy" ON pdf_branding_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- PDF branding settings UPDATE policy
CREATE POLICY "pdf_branding_settings_update_policy" ON pdf_branding_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = pdf_branding_settings.organization_id)
        )
    );

-- PDF branding settings DELETE policy
CREATE POLICY "pdf_branding_settings_delete_policy" ON pdf_branding_settings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = pdf_branding_settings.organization_id)
        )
    );

-- =====================================================================================
-- IMPORT LOGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "import_logs_select_policy" ON import_logs;
DROP POLICY IF EXISTS "import_logs_insert_policy" ON import_logs;
DROP POLICY IF EXISTS "import_logs_update_policy" ON import_logs;
DROP POLICY IF EXISTS "import_logs_delete_policy" ON import_logs;

-- Import logs SELECT policy
CREATE POLICY "import_logs_select_policy" ON import_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = import_logs.organization_id
        )
    );

-- Import logs INSERT policy
CREATE POLICY "import_logs_insert_policy" ON import_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Import logs UPDATE policy
CREATE POLICY "import_logs_update_policy" ON import_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = import_logs.organization_id)
        )
    );

-- Import logs DELETE policy
CREATE POLICY "import_logs_delete_policy" ON import_logs
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = import_logs.organization_id)
        )
    );

-- =====================================================================================
-- EXPORT LOGS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "export_logs_select_policy" ON export_logs;
DROP POLICY IF EXISTS "export_logs_insert_policy" ON export_logs;
DROP POLICY IF EXISTS "export_logs_update_policy" ON export_logs;
DROP POLICY IF EXISTS "export_logs_delete_policy" ON export_logs;

-- Export logs SELECT policy
CREATE POLICY "export_logs_select_policy" ON export_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = export_logs.organization_id
        )
    );

-- Export logs INSERT policy
CREATE POLICY "export_logs_insert_policy" ON export_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Export logs UPDATE policy
CREATE POLICY "export_logs_update_policy" ON export_logs
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = export_logs.organization_id)
        )
    );

-- Export logs DELETE policy
CREATE POLICY "export_logs_delete_policy" ON export_logs
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = export_logs.organization_id)
        )
    );

-- =====================================================================================
-- VALIDATION COMMENT
-- =====================================================================================

-- This migration adds comprehensive RLS policies for all new tables to ensure:
-- 1. Organization isolation - Data is scoped to organizations
-- 2. Role-based access control - Super admins and org admins have appropriate permissions
-- 3. User data privacy - Profile tags and behaviors are properly protected
-- 4. Branding management - Only admins can modify branding settings
-- 5. Import/export security - Logs are organization-scoped
-- 6. Competency security - Competencies are organization-scoped
-- 7. Department management - Departments are organization-scoped

COMMENT ON POLICY "departments_select_policy" ON departments IS 'Organization-scoped department access';
COMMENT ON POLICY "competencies_select_policy" ON competencies IS 'Organization-scoped competency access';
COMMENT ON POLICY "profile_tags_select_policy" ON profile_tags IS 'User and organization-scoped profile tag access';
COMMENT ON POLICY "web_branding_settings_select_policy" ON web_branding_settings IS 'Organization-scoped web branding access';
COMMENT ON POLICY "import_logs_select_policy" ON import_logs IS 'Organization-scoped import log access';
COMMENT ON POLICY "export_logs_select_policy" ON export_logs IS 'Organization-scoped export log access';