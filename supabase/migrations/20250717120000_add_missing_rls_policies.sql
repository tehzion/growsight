-- =====================================================================================
-- ADD MISSING RLS POLICIES FOR PRODUCTION SECURITY
-- This migration adds comprehensive Row Level Security policies that are missing
-- from the main schema to ensure proper organization isolation and user access control
-- =====================================================================================

-- =====================================================================================
-- UTILITY FUNCTIONS FOR RLS POLICIES
-- =====================================================================================

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
    
    -- Users can only access their own organization
    RETURN context_rec.organization_id = target_org_id;
END;
$$;

-- =====================================================================================
-- ORGANIZATIONS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_policy" ON organizations;

-- Organizations SELECT policy
CREATE POLICY "organizations_select_policy" ON organizations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = organizations.id
        )
    );

-- Organizations INSERT policy (super admins only)
CREATE POLICY "organizations_insert_policy" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

-- Organizations UPDATE policy
CREATE POLICY "organizations_update_policy" ON organizations
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = organizations.id
        )
    );

-- Organizations DELETE policy (super admins only)
CREATE POLICY "organizations_delete_policy" ON organizations
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

-- =====================================================================================
-- USERS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- Users SELECT policy
CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR 
                ctx.user_id = users.id OR
                ctx.organization_id = users.organization_id
        )
    );

-- Users INSERT policy
CREATE POLICY "users_insert_policy" ON users
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Users UPDATE policy
CREATE POLICY "users_update_policy" ON users
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = users.id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = users.organization_id)
        )
    );

-- Users DELETE policy
CREATE POLICY "users_delete_policy" ON users
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = users.organization_id)
        )
    );

-- =====================================================================================
-- ASSESSMENTS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessments_select_policy" ON assessments;
DROP POLICY IF EXISTS "assessments_insert_policy" ON assessments;
DROP POLICY IF EXISTS "assessments_update_policy" ON assessments;
DROP POLICY IF EXISTS "assessments_delete_policy" ON assessments;

-- Assessments SELECT policy
CREATE POLICY "assessments_select_policy" ON assessments
    FOR SELECT TO authenticated
    USING (
        check_org_access(assessments.organization_id)
    );

-- Assessments INSERT policy
CREATE POLICY "assessments_insert_policy" ON assessments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = NEW.organization_id)
        )
    );

-- Assessments UPDATE policy
CREATE POLICY "assessments_update_policy" ON assessments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = assessments.organization_id) OR
                ctx.user_id = assessments.creator_id
        )
    );

-- Assessments DELETE policy
CREATE POLICY "assessments_delete_policy" ON assessments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = assessments.organization_id) OR
                ctx.user_id = assessments.creator_id
        )
    );

-- =====================================================================================
-- ASSESSMENT SECTIONS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_sections_select_policy" ON assessment_sections;
DROP POLICY IF EXISTS "assessment_sections_insert_policy" ON assessment_sections;
DROP POLICY IF EXISTS "assessment_sections_update_policy" ON assessment_sections;
DROP POLICY IF EXISTS "assessment_sections_delete_policy" ON assessment_sections;

-- Assessment sections SELECT policy
CREATE POLICY "assessment_sections_select_policy" ON assessment_sections
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = assessment_sections.assessment_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment sections INSERT policy
CREATE POLICY "assessment_sections_insert_policy" ON assessment_sections
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = NEW.assessment_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment sections UPDATE policy
CREATE POLICY "assessment_sections_update_policy" ON assessment_sections
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = assessment_sections.assessment_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment sections DELETE policy
CREATE POLICY "assessment_sections_delete_policy" ON assessment_sections
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = assessment_sections.assessment_id
            AND check_org_access(a.organization_id)
        )
    );

-- =====================================================================================
-- ASSESSMENT QUESTIONS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_questions_select_policy" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_insert_policy" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_update_policy" ON assessment_questions;
DROP POLICY IF EXISTS "assessment_questions_delete_policy" ON assessment_questions;

-- Assessment questions SELECT policy
CREATE POLICY "assessment_questions_select_policy" ON assessment_questions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_sections s
            JOIN assessments a ON a.id = s.assessment_id
            WHERE s.id = assessment_questions.section_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment questions INSERT policy
CREATE POLICY "assessment_questions_insert_policy" ON assessment_questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_sections s
            JOIN assessments a ON a.id = s.assessment_id
            WHERE s.id = NEW.section_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment questions UPDATE policy
CREATE POLICY "assessment_questions_update_policy" ON assessment_questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_sections s
            JOIN assessments a ON a.id = s.assessment_id
            WHERE s.id = assessment_questions.section_id
            AND check_org_access(a.organization_id)
        )
    );

-- Assessment questions DELETE policy
CREATE POLICY "assessment_questions_delete_policy" ON assessment_questions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_sections s
            JOIN assessments a ON a.id = s.assessment_id
            WHERE s.id = assessment_questions.section_id
            AND check_org_access(a.organization_id)
        )
    );

-- =====================================================================================
-- QUESTION OPTIONS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "question_options_select_policy" ON question_options;
DROP POLICY IF EXISTS "question_options_insert_policy" ON question_options;
DROP POLICY IF EXISTS "question_options_update_policy" ON question_options;
DROP POLICY IF EXISTS "question_options_delete_policy" ON question_options;

-- Question options SELECT policy
CREATE POLICY "question_options_select_policy" ON question_options
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_questions aq
            JOIN assessment_sections s ON s.id = aq.section_id
            JOIN assessments a ON a.id = s.assessment_id
            WHERE aq.id = question_options.question_id
            AND check_org_access(a.organization_id)
        )
    );

-- Question options INSERT policy
CREATE POLICY "question_options_insert_policy" ON question_options
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_questions aq
            JOIN assessment_sections s ON s.id = aq.section_id
            JOIN assessments a ON a.id = s.assessment_id
            WHERE aq.id = NEW.question_id
            AND check_org_access(a.organization_id)
        )
    );

-- Question options UPDATE policy
CREATE POLICY "question_options_update_policy" ON question_options
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_questions aq
            JOIN assessment_sections s ON s.id = aq.section_id
            JOIN assessments a ON a.id = s.assessment_id
            WHERE aq.id = question_options.question_id
            AND check_org_access(a.organization_id)
        )
    );

-- Question options DELETE policy
CREATE POLICY "question_options_delete_policy" ON question_options
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessment_questions aq
            JOIN assessment_sections s ON s.id = aq.section_id
            JOIN assessments a ON a.id = s.assessment_id
            WHERE aq.id = question_options.question_id
            AND check_org_access(a.organization_id)
        )
    );

-- =====================================================================================
-- ASSESSMENT ASSIGNMENTS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_assignments_select_policy" ON assessment_assignments;
DROP POLICY IF EXISTS "assessment_assignments_insert_policy" ON assessment_assignments;
DROP POLICY IF EXISTS "assessment_assignments_update_policy" ON assessment_assignments;
DROP POLICY IF EXISTS "assessment_assignments_delete_policy" ON assessment_assignments;

-- Assessment assignments SELECT policy
CREATE POLICY "assessment_assignments_select_policy" ON assessment_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = assessment_assignments.employee_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = assessment_assignments.employee_id OR
                ctx.organization_id = emp.organization_id
        )
    );

-- Assessment assignments INSERT policy
CREATE POLICY "assessment_assignments_insert_policy" ON assessment_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = NEW.employee_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id)
        )
    );

-- Assessment assignments UPDATE policy
CREATE POLICY "assessment_assignments_update_policy" ON assessment_assignments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = assessment_assignments.employee_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = assessment_assignments.employee_id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id)
        )
    );

-- Assessment assignments DELETE policy
CREATE POLICY "assessment_assignments_delete_policy" ON assessment_assignments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = assessment_assignments.employee_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id)
        )
    );

-- =====================================================================================
-- ASSESSMENT RESPONSES TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_responses_select_policy" ON assessment_responses;
DROP POLICY IF EXISTS "assessment_responses_insert_policy" ON assessment_responses;
DROP POLICY IF EXISTS "assessment_responses_update_policy" ON assessment_responses;
DROP POLICY IF EXISTS "assessment_responses_delete_policy" ON assessment_responses;

-- Assessment responses SELECT policy
CREATE POLICY "assessment_responses_select_policy" ON assessment_responses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_responses.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id OR
                ctx.organization_id = emp.organization_id
        )
    );

-- Assessment responses INSERT policy
CREATE POLICY "assessment_responses_insert_policy" ON assessment_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = NEW.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- Assessment responses UPDATE policy
CREATE POLICY "assessment_responses_update_policy" ON assessment_responses
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_responses.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- Assessment responses DELETE policy
CREATE POLICY "assessment_responses_delete_policy" ON assessment_responses
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_responses.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- =====================================================================================
-- ASSESSMENT PROGRESS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_progress_select_policy" ON assessment_progress;
DROP POLICY IF EXISTS "assessment_progress_insert_policy" ON assessment_progress;
DROP POLICY IF EXISTS "assessment_progress_update_policy" ON assessment_progress;
DROP POLICY IF EXISTS "assessment_progress_delete_policy" ON assessment_progress;

-- Assessment progress SELECT policy
CREATE POLICY "assessment_progress_select_policy" ON assessment_progress
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_progress.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id OR
                ctx.organization_id = emp.organization_id
        )
    );

-- Assessment progress INSERT policy
CREATE POLICY "assessment_progress_insert_policy" ON assessment_progress
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = NEW.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- Assessment progress UPDATE policy
CREATE POLICY "assessment_progress_update_policy" ON assessment_progress
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_progress.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- Assessment progress DELETE policy
CREATE POLICY "assessment_progress_delete_policy" ON assessment_progress
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_progress.assignment_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = aa.employee_id
        )
    );

-- =====================================================================================
-- USER RELATIONSHIPS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "user_relationships_select_policy" ON user_relationships;
DROP POLICY IF EXISTS "user_relationships_insert_policy" ON user_relationships;
DROP POLICY IF EXISTS "user_relationships_update_policy" ON user_relationships;
DROP POLICY IF EXISTS "user_relationships_delete_policy" ON user_relationships;

-- User relationships SELECT policy
CREATE POLICY "user_relationships_select_policy" ON user_relationships
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u1 ON u1.id = user_relationships.user_id
            JOIN users u2 ON u2.id = user_relationships.related_user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = user_relationships.user_id OR
                ctx.user_id = user_relationships.related_user_id OR
                ctx.organization_id = u1.organization_id
        )
    );

-- User relationships INSERT policy
CREATE POLICY "user_relationships_insert_policy" ON user_relationships
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u1 ON u1.id = NEW.user_id
            JOIN users u2 ON u2.id = NEW.related_user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u1.organization_id) OR
                ctx.user_id = NEW.user_id
        )
    );

-- User relationships UPDATE policy
CREATE POLICY "user_relationships_update_policy" ON user_relationships
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u1 ON u1.id = user_relationships.user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u1.organization_id) OR
                ctx.user_id = user_relationships.user_id
        )
    );

-- User relationships DELETE policy
CREATE POLICY "user_relationships_delete_policy" ON user_relationships
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u1 ON u1.id = user_relationships.user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = u1.organization_id) OR
                ctx.user_id = user_relationships.user_id
        )
    );

-- =====================================================================================
-- SUPPORT TICKETS TABLE RLS POLICIES
-- =====================================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "support_tickets_select_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_insert_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_update_policy" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_delete_policy" ON support_tickets;

-- Support tickets SELECT policy
CREATE POLICY "support_tickets_select_policy" ON support_tickets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_tickets.requester_id OR
                ctx.user_id = support_tickets.staff_member_id OR
                ctx.organization_id = support_tickets.organization_id
        )
    );

-- Support tickets INSERT policy
CREATE POLICY "support_tickets_insert_policy" ON support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = NEW.requester_id OR
                ctx.organization_id = NEW.organization_id
        )
    );

-- Support tickets UPDATE policy
CREATE POLICY "support_tickets_update_policy" ON support_tickets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_tickets.requester_id OR
                ctx.user_id = support_tickets.staff_member_id OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = support_tickets.organization_id)
        )
    );

-- Support tickets DELETE policy
CREATE POLICY "support_tickets_delete_policy" ON support_tickets
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = support_tickets.organization_id)
        )
    );

-- =====================================================================================
-- ADDITIONAL TABLE RLS POLICIES
-- =====================================================================================

-- User preferences RLS policies
DROP POLICY IF EXISTS "user_preferences_select_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_insert_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_update_policy" ON user_preferences;
DROP POLICY IF EXISTS "user_preferences_delete_policy" ON user_preferences;

CREATE POLICY "user_preferences_select_policy" ON user_preferences
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_preferences.user_id
        )
    );

CREATE POLICY "user_preferences_insert_policy" ON user_preferences
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = NEW.user_id
        )
    );

CREATE POLICY "user_preferences_update_policy" ON user_preferences
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_preferences.user_id
        )
    );

CREATE POLICY "user_preferences_delete_policy" ON user_preferences
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_preferences.user_id
        )
    );

-- User sessions RLS policies
DROP POLICY IF EXISTS "user_sessions_select_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_insert_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_update_policy" ON user_sessions;
DROP POLICY IF EXISTS "user_sessions_delete_policy" ON user_sessions;

CREATE POLICY "user_sessions_select_policy" ON user_sessions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_sessions.user_id OR ctx.is_super_admin
        )
    );

CREATE POLICY "user_sessions_insert_policy" ON user_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = NEW.user_id
        )
    );

CREATE POLICY "user_sessions_update_policy" ON user_sessions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_sessions.user_id OR ctx.is_super_admin
        )
    );

CREATE POLICY "user_sessions_delete_policy" ON user_sessions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = user_sessions.user_id OR ctx.is_super_admin
        )
    );

-- User activity log RLS policies
DROP POLICY IF EXISTS "user_activity_log_select_policy" ON user_activity_log;
DROP POLICY IF EXISTS "user_activity_log_insert_policy" ON user_activity_log;

CREATE POLICY "user_activity_log_select_policy" ON user_activity_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.user_id = user_activity_log.user_id
        )
    );

CREATE POLICY "user_activity_log_insert_policy" ON user_activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.user_id = NEW.user_id
        )
    );

-- Access requests RLS policies
DROP POLICY IF EXISTS "access_requests_select_policy" ON access_requests;
DROP POLICY IF EXISTS "access_requests_insert_policy" ON access_requests;
DROP POLICY IF EXISTS "access_requests_update_policy" ON access_requests;

CREATE POLICY "access_requests_select_policy" ON access_requests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = access_requests.organization_id
        )
    );

CREATE POLICY "access_requests_insert_policy" ON access_requests
    FOR INSERT TO authenticated
    WITH CHECK (TRUE); -- Anyone can create access requests

CREATE POLICY "access_requests_update_policy" ON access_requests
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.organization_id = access_requests.organization_id
        )
    );

-- Assessment organization assignments RLS policies
DROP POLICY IF EXISTS "assessment_organization_assignments_select_policy" ON assessment_organization_assignments;
DROP POLICY IF EXISTS "assessment_organization_assignments_insert_policy" ON assessment_organization_assignments;
DROP POLICY IF EXISTS "assessment_organization_assignments_update_policy" ON assessment_organization_assignments;
DROP POLICY IF EXISTS "assessment_organization_assignments_delete_policy" ON assessment_organization_assignments;

CREATE POLICY "assessment_organization_assignments_select_policy" ON assessment_organization_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM assessments a
            WHERE a.id = assessment_organization_assignments.assessment_id
            AND check_org_access(a.organization_id)
        )
    );

CREATE POLICY "assessment_organization_assignments_insert_policy" ON assessment_organization_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

CREATE POLICY "assessment_organization_assignments_update_policy" ON assessment_organization_assignments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

CREATE POLICY "assessment_organization_assignments_delete_policy" ON assessment_organization_assignments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

-- Assessment notifications RLS policies
DROP POLICY IF EXISTS "assessment_notifications_select_policy" ON assessment_notifications;
DROP POLICY IF EXISTS "assessment_notifications_insert_policy" ON assessment_notifications;
DROP POLICY IF EXISTS "assessment_notifications_update_policy" ON assessment_notifications;

CREATE POLICY "assessment_notifications_select_policy" ON assessment_notifications
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.user_id = assessment_notifications.user_id
        )
    );

CREATE POLICY "assessment_notifications_insert_policy" ON assessment_notifications
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.user_id = NEW.user_id
        )
    );

CREATE POLICY "assessment_notifications_update_policy" ON assessment_notifications
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.user_id = assessment_notifications.user_id
        )
    );

-- Ticket messages RLS policies
DROP POLICY IF EXISTS "ticket_messages_select_policy" ON ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_insert_policy" ON ticket_messages;
DROP POLICY IF EXISTS "ticket_messages_update_policy" ON ticket_messages;

CREATE POLICY "ticket_messages_select_policy" ON ticket_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = ticket_messages.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = st.requester_id OR
                ctx.user_id = st.staff_member_id OR
                ctx.organization_id = st.organization_id
        )
    );

CREATE POLICY "ticket_messages_insert_policy" ON ticket_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = NEW.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = st.requester_id OR
                ctx.user_id = st.staff_member_id OR
                ctx.organization_id = st.organization_id
        )
    );

CREATE POLICY "ticket_messages_update_policy" ON ticket_messages
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin OR ctx.user_id = ticket_messages.sender_id
        )
    );

-- Ticket attachments RLS policies
DROP POLICY IF EXISTS "ticket_attachments_select_policy" ON ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_insert_policy" ON ticket_attachments;
DROP POLICY IF EXISTS "ticket_attachments_delete_policy" ON ticket_attachments;

CREATE POLICY "ticket_attachments_select_policy" ON ticket_attachments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = ticket_attachments.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = st.requester_id OR
                ctx.user_id = st.staff_member_id OR
                ctx.organization_id = st.organization_id
        )
    );

CREATE POLICY "ticket_attachments_insert_policy" ON ticket_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = NEW.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = st.requester_id OR
                ctx.user_id = st.staff_member_id OR
                ctx.organization_id = st.organization_id
        )
    );

CREATE POLICY "ticket_attachments_delete_policy" ON ticket_attachments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = ticket_attachments.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = st.requester_id OR
                ctx.user_id = st.staff_member_id
        )
    );

-- =====================================================================================
-- GRANT PERMISSIONS TO HELPER FUNCTIONS
-- =====================================================================================

GRANT EXECUTE ON FUNCTION get_user_org_context() TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_access(text) TO authenticated;
GRANT EXECUTE ON FUNCTION user_in_organization(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION has_org_admin_permission(uuid, text) TO authenticated;

-- =====================================================================================
-- VALIDATION COMMENT
-- =====================================================================================

-- This migration adds comprehensive RLS policies to enforce:
-- 1. Organization isolation - Users can only access data from their organization
-- 2. Role-based access control - Super admins, org admins, and users have appropriate permissions
-- 3. Data privacy - Users can only access their own data or data they're authorized to see
-- 4. Audit security - All table operations are protected by RLS policies

COMMENT ON FUNCTION get_user_org_context() IS 'Returns user context for RLS policies with fallback for self-hosted environments';
COMMENT ON FUNCTION check_org_access(text) IS 'Checks if current user can access data from target organization';