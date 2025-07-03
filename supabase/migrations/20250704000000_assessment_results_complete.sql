-- Assessment Results Complete Migration
-- This migration adds RLS enablement and policies for assessment results tables

-- Enable RLS on assessment results tables
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_analytics_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "assessment_results_select_policy" ON assessment_results;
DROP POLICY IF EXISTS "assessment_results_insert_policy" ON assessment_results;
DROP POLICY IF EXISTS "assessment_results_update_policy" ON assessment_results;
DROP POLICY IF EXISTS "assessment_analytics_cache_select_policy" ON assessment_analytics_cache;
DROP POLICY IF EXISTS "assessment_analytics_cache_insert_policy" ON assessment_analytics_cache;
DROP POLICY IF EXISTS "assessment_analytics_cache_update_policy" ON assessment_analytics_cache;

-- ASSESSMENT RESULTS POLICIES
CREATE POLICY "assessment_results_select_policy" ON assessment_results
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_results.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                ctx.is_super_admin OR
                ((ctx.user_id = aa.employee_id OR ctx.user_id = aa.reviewer_id)
                 AND ctx.organization_id = emp.organization_id) OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id)
        )
    );

CREATE POLICY "assessment_results_insert_policy" ON assessment_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = NEW.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                (ctx.user_id = aa.reviewer_id OR ctx.user_id = aa.employee_id)
                AND ctx.organization_id = emp.organization_id
        )
    );

CREATE POLICY "assessment_results_update_policy" ON assessment_results
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN assessment_assignments aa ON aa.id = assessment_results.assignment_id
            JOIN users emp ON emp.id = aa.employee_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.user_role = 'org_admin' AND ctx.organization_id = emp.organization_id) OR
                (ctx.user_id = aa.reviewer_id OR ctx.user_id = aa.employee_id)
        )
    );

-- ASSESSMENT ANALYTICS CACHE POLICIES
CREATE POLICY "assessment_analytics_cache_select_policy" ON assessment_analytics_cache
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = assessment_analytics_cache.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "assessment_analytics_cache_insert_policy" ON assessment_analytics_cache
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "assessment_analytics_cache_update_policy" ON assessment_analytics_cache
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = assessment_analytics_cache.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- Add triggers for updated_at columns
CREATE TRIGGER update_assessment_results_updated_at
    BEFORE UPDATE ON assessment_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_analytics_cache_updated_at
    BEFORE UPDATE ON assessment_analytics_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 