-- Critical RLS Policy Fixes for Organization Isolation and Security
-- This migration addresses cross-organization data leakage and improves security

-- First, drop all existing problematic policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on critical tables to rebuild them properly
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'users', 'organizations', 'assessments', 'assessment_assignments', 
            'assessment_responses', 'user_relationships', 'competencies',
            'assessment_organization_assignments', 'support_tickets', 
            'ticket_messages', 'import_logs', 'export_logs'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
    END LOOP;
END $$;

-- Create helper function for secure user context (replaces problematic get_current_user_info)
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
    -- Use JWT claims instead of querying users table to avoid recursion
    RETURN QUERY
    SELECT 
        (auth.jwt() ->> 'sub')::UUID as user_id,
        COALESCE(auth.jwt() ->> 'user_role', 'employee') as user_role,
        auth.jwt() ->> 'organization_id' as organization_id,
        COALESCE(auth.jwt() ->> 'user_role', 'employee') = 'super_admin' as is_super_admin;
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

-- 1. ORGANIZATIONS TABLE - Secure organization access
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

CREATE POLICY "organizations_delete_policy" ON organizations
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE ctx.is_super_admin
        )
    );

-- 2. USERS TABLE - Strict organization isolation
CREATE POLICY "users_select_policy" ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                -- Super admins can see all users
                ctx.is_super_admin OR
                -- Users can only see users from their own organization
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
                -- Super admins can update any user
                ctx.is_super_admin OR
                -- Org admins can update users in their org
                (ctx.organization_id = users.organization_id AND ctx.user_role = 'org_admin') OR
                -- Users can update their own profile
                ctx.user_id = users.id
        )
    );

-- 3. ASSESSMENTS TABLE - Organization-scoped assessments
CREATE POLICY "assessments_select_policy" ON assessments
    FOR SELECT TO authenticated
    USING (
        check_org_access(assessments.organization_id)
    );

CREATE POLICY "assessments_insert_policy" ON assessments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role IN ('org_admin'))
        )
    );

CREATE POLICY "assessments_update_policy" ON assessments
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = assessments.organization_id AND ctx.user_role = 'org_admin') OR
                ctx.user_id = assessments.created_by_id
        )
    );

-- 4. ASSESSMENT ASSIGNMENTS - Strict user and org validation
CREATE POLICY "assessment_assignments_select_policy" ON assessment_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = assessment_assignments.employee_id
            JOIN users rev ON rev.id = assessment_assignments.reviewer_id
            WHERE 
                ctx.is_super_admin OR
                -- Users can see their own assignments (as employee or reviewer)
                (ctx.user_id = assessment_assignments.employee_id OR ctx.user_id = assessment_assignments.reviewer_id) OR
                -- Org admins can see assignments in their organization
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id AND ctx.organization_id = rev.organization_id)
        )
    );

CREATE POLICY "assessment_assignments_insert_policy" ON assessment_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users emp ON emp.id = NEW.employee_id
            JOIN users rev ON rev.id = NEW.reviewer_id
            WHERE 
                ctx.is_super_admin OR
                -- Org admins can create assignments within their organization only
                (ctx.user_role = 'org_admin' 
                 AND ctx.organization_id = emp.organization_id 
                 AND ctx.organization_id = rev.organization_id)
        )
    );

-- 5. ASSESSMENT RESPONSES - Prevent cross-org data leakage
CREATE POLICY "assessment_responses_select_policy" ON assessment_responses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_responses.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                ctx.is_super_admin OR
                -- Only allow access if user is the respondent or employee, and in same org
                ((ctx.user_id = assessment_responses.respondent_id OR ctx.user_id = aa.employee_id)
                 AND ctx.organization_id = emp.organization_id) OR
                -- Org admins can see responses in their organization
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id)
        )
    );

CREATE POLICY "assessment_responses_insert_policy" ON assessment_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = NEW.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                -- Only the assigned reviewer or employee can create responses
                (ctx.user_id = aa.reviewer_id OR ctx.user_id = aa.employee_id)
                AND ctx.organization_id = emp.organization_id
                AND ctx.user_id = NEW.respondent_id
        )
    );

-- 6. USER RELATIONSHIPS - Organization boundary enforcement
CREATE POLICY "user_relationships_select_policy" ON user_relationships
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u1 ON u1.id = user_relationships.user_id
            JOIN users u2 ON u2.id = user_relationships.related_user_id
            WHERE 
                ctx.is_super_admin OR
                -- Users can see their own relationships
                (ctx.user_id = user_relationships.user_id OR ctx.user_id = user_relationships.related_user_id) OR
                -- Org admins can see relationships within their org
                (ctx.user_role = 'org_admin' 
                 AND ctx.organization_id = u1.organization_id 
                 AND ctx.organization_id = u2.organization_id)
        )
    );

-- 7. COMPETENCIES - Organization-scoped
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

-- 8. SUPPORT TICKETS - Organization isolation
CREATE POLICY "support_tickets_select_policy" ON support_tickets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                -- Staff members can see their own tickets
                ctx.user_id = support_tickets.staff_member_id OR
                -- Assigned support staff can see tickets
                ctx.user_id = support_tickets.assigned_to_id OR
                -- Org admins can see tickets from their organization
                (ctx.user_role = 'org_admin' AND ctx.organization_id = support_tickets.organization_id)
        )
    );

CREATE POLICY "support_tickets_insert_policy" ON support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                -- Only allow creating tickets for own organization
                ctx.organization_id = NEW.organization_id
                AND ctx.user_id = NEW.staff_member_id
        )
    );

-- 9. TICKET MESSAGES - Secure conversation access
CREATE POLICY "ticket_messages_select_policy" ON ticket_messages
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = ticket_messages.ticket_id
            WHERE 
                ctx.is_super_admin OR
                -- Only participants in the ticket conversation can see messages
                (ctx.user_id = st.staff_member_id OR 
                 ctx.user_id = st.assigned_to_id OR
                 ctx.user_id = ticket_messages.sender_id)
                AND ctx.organization_id = st.organization_id
        )
    );

-- 10. IMPORT/EXPORT LOGS - Organization isolation
CREATE POLICY "import_logs_select_policy" ON import_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = import_logs.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "export_logs_select_policy" ON export_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = export_logs.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- 11. ASSESSMENT ORGANIZATION ASSIGNMENTS - Prevent cross-org assignment
CREATE POLICY "assessment_org_assignments_select_policy" ON assessment_organization_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = assessment_organization_assignments.organization_id
        )
    );

CREATE POLICY "assessment_org_assignments_insert_policy" ON assessment_organization_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessments a ON a.id = NEW.assessment_id
            WHERE 
                ctx.is_super_admin OR
                -- Only allow assigning assessments from same organization
                (ctx.organization_id = NEW.organization_id 
                 AND ctx.organization_id = a.organization_id
                 AND ctx.user_role = 'org_admin')
        )
    );

-- Ensure RLS is enabled on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_organization_assignments ENABLE ROW LEVEL SECURITY;

-- Create indexes for policy performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_employee_id ON assessment_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_reviewer_id ON assessment_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assignment_id ON assessment_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_respondent_id ON assessment_responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_staff_member_id ON support_tickets(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_competencies_organization_id ON competencies(organization_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_org_context() TO authenticated;
GRANT EXECUTE ON FUNCTION check_org_access(TEXT) TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_org_context() IS 'Securely retrieves user context from JWT claims to avoid RLS recursion';
COMMENT ON FUNCTION check_org_access(TEXT) IS 'Validates if current user can access specified organization data';

-- Migration complete
INSERT INTO migrations (name, executed_at) VALUES ('20250701000000_fix_critical_rls_policies', NOW())
ON CONFLICT (name) DO NOTHING;