-- Reporting and Access Control Migration
-- This migration ensures all database tables, policies, and functions work properly
-- for the reporting system and role-based access control

-- Ensure all core tables exist with proper structure
-- Users table enhancements
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Organizations table enhancements
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 100;

-- Assessments table enhancements
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS assessment_type VARCHAR(50) DEFAULT 'custom';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS estimated_duration INTEGER; -- in minutes

-- Assessment results table enhancements
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS time_spent INTEGER; -- in seconds
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Create reporting views for better performance
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    u.organization_id,
    o.name as organization_name,
    u.last_login,
    u.login_count,
    COUNT(ar.id) as total_assessments,
    COUNT(CASE WHEN ar.is_completed THEN 1 END) as completed_assessments,
    AVG(CASE WHEN ar.is_completed THEN ar.total_score END) as average_score,
    MAX(ar.created_at) as last_assessment_date
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
LEFT JOIN assessment_results ar ON u.id = ar.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.organization_id, o.name, u.last_login, u.login_count;

-- Create organization performance view
CREATE OR REPLACE VIEW organization_performance AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.created_at,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '7 days' THEN u.id END) as active_users_7d,
    COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END) as active_users_30d,
    COUNT(DISTINCT a.id) as total_assessments,
    COUNT(DISTINCT ar.id) as total_results,
    COUNT(DISTINCT CASE WHEN ar.is_completed THEN ar.id END) as completed_results,
    AVG(CASE WHEN ar.is_completed THEN ar.total_score END) as average_score,
    AVG(CASE WHEN ar.is_completed THEN ar.time_spent END) as average_time_spent
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = TRUE
LEFT JOIN assessments a ON o.id = a.organization_id AND a.is_active = TRUE
LEFT JOIN assessment_results ar ON a.id = ar.assessment_id
WHERE o.is_active = TRUE
GROUP BY o.id, o.name, o.created_at;

-- Create assessment performance view
CREATE OR REPLACE VIEW assessment_performance AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    a.description,
    a.organization_id,
    o.name as organization_name,
    a.assessment_type,
    a.created_at,
    COUNT(ar.id) as total_assignments,
    COUNT(CASE WHEN ar.is_completed THEN 1 END) as completed_assignments,
    ROUND(
        (COUNT(CASE WHEN ar.is_completed THEN 1 END)::DECIMAL / NULLIF(COUNT(ar.id), 0)) * 100, 2
    ) as completion_rate,
    AVG(CASE WHEN ar.is_completed THEN ar.total_score END) as average_score,
    AVG(CASE WHEN ar.is_completed THEN ar.time_spent END) as average_time_spent,
    MIN(ar.created_at) as first_submission,
    MAX(ar.created_at) as last_submission
FROM assessments a
LEFT JOIN organizations o ON a.organization_id = o.id
LEFT JOIN assessment_results ar ON a.id = ar.assessment_id
WHERE a.is_active = TRUE
GROUP BY a.id, a.title, a.description, a.organization_id, o.name, a.assessment_type, a.created_at;

-- Create daily activity view for trends
CREATE OR REPLACE VIEW daily_activity AS
SELECT 
    DATE(ar.created_at) as activity_date,
    ar.organization_id,
    o.name as organization_name,
    COUNT(DISTINCT ar.user_id) as unique_users,
    COUNT(ar.id) as total_submissions,
    COUNT(CASE WHEN ar.is_completed THEN 1 END) as completed_submissions,
    AVG(CASE WHEN ar.is_completed THEN ar.total_score END) as average_score
FROM assessment_results ar
LEFT JOIN organizations o ON ar.organization_id = o.id
WHERE ar.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(ar.created_at), ar.organization_id, o.name
ORDER BY activity_date DESC;

-- Ensure RLS is enabled on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Enhanced RLS policies for users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super admins can manage all users" ON users;
CREATE POLICY "Super admins can manage all users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Org admins can manage org users" ON users;
CREATE POLICY "Org admins can manage org users" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users admin_user
            WHERE admin_user.id = auth.uid() 
            AND admin_user.role = 'org_admin'
            AND admin_user.organization_id = users.organization_id
        )
    );

-- Enhanced RLS policies for organizations table
DROP POLICY IF EXISTS "Super admins can manage all organizations" ON organizations;
CREATE POLICY "Super admins can manage all organizations" ON organizations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Org admins can view own organization" ON organizations;
CREATE POLICY "Org admins can view own organization" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = organizations.id
            AND users.role = 'org_admin'
        )
    );

-- Enhanced RLS policies for assessments table
DROP POLICY IF EXISTS "Super admins can manage all assessments" ON assessments;
CREATE POLICY "Super admins can manage all assessments" ON assessments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Org admins can manage org assessments" ON assessments;
CREATE POLICY "Org admins can manage org assessments" ON assessments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = assessments.organization_id
            AND users.role = 'org_admin'
        )
    );

DROP POLICY IF EXISTS "Users can view org assessments" ON assessments;
CREATE POLICY "Users can view org assessments" ON assessments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = assessments.organization_id
        )
    );

-- Enhanced RLS policies for assessment_results table
DROP POLICY IF EXISTS "Super admins can view all results" ON assessment_results;
CREATE POLICY "Super admins can view all results" ON assessment_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Org admins can view org results" ON assessment_results;
CREATE POLICY "Org admins can view org results" ON assessment_results
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = assessment_results.organization_id
            AND users.role = 'org_admin'
        )
    );

DROP POLICY IF EXISTS "Users can view own results" ON assessment_results;
CREATE POLICY "Users can view own results" ON assessment_results
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own results" ON assessment_results;
CREATE POLICY "Users can create own results" ON assessment_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own results" ON assessment_results;
CREATE POLICY "Users can update own results" ON assessment_results
    FOR UPDATE USING (auth.uid() = user_id);

-- Create functions for reporting and analytics

-- Function to get user activity statistics
CREATE OR REPLACE FUNCTION get_user_activity_stats(
    org_id UUID DEFAULT NULL,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_users INTEGER,
    active_users_7d INTEGER,
    active_users_30d INTEGER,
    total_assessments INTEGER,
    completed_assessments INTEGER,
    average_completion_rate DECIMAL,
    average_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT u.id)::INTEGER as total_users,
        COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '7 days' THEN u.id END)::INTEGER as active_users_7d,
        COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END)::INTEGER as active_users_30d,
        COUNT(DISTINCT ar.id)::INTEGER as total_assessments,
        COUNT(DISTINCT CASE WHEN ar.is_completed THEN ar.id END)::INTEGER as completed_assessments,
        ROUND(
            (COUNT(DISTINCT CASE WHEN ar.is_completed THEN ar.id END)::DECIMAL / NULLIF(COUNT(DISTINCT ar.id), 0)) * 100, 2
        ) as average_completion_rate,
        ROUND(AVG(CASE WHEN ar.is_completed THEN ar.total_score END), 2) as average_score
    FROM users u
    LEFT JOIN assessment_results ar ON u.id = ar.user_id
    WHERE u.is_active = TRUE
    AND (org_id IS NULL OR u.organization_id = org_id)
    AND (start_date IS NULL OR ar.created_at >= start_date)
    AND (end_date IS NULL OR ar.created_at <= end_date);
END;
$$;

-- Function to get assessment performance statistics
CREATE OR REPLACE FUNCTION get_assessment_performance_stats(
    org_id UUID DEFAULT NULL,
    assessment_id UUID DEFAULT NULL
)
RETURNS TABLE (
    assessment_id UUID,
    assessment_title VARCHAR,
    organization_name VARCHAR,
    total_assignments INTEGER,
    completed_assignments INTEGER,
    completion_rate DECIMAL,
    average_score DECIMAL,
    average_time_spent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ap.assessment_id,
        ap.assessment_title,
        ap.organization_name,
        ap.total_assignments,
        ap.completed_assignments,
        ap.completion_rate,
        ap.average_score,
        ap.average_time_spent::INTEGER
    FROM assessment_performance ap
    WHERE (org_id IS NULL OR ap.organization_id = org_id)
    AND (assessment_id IS NULL OR ap.assessment_id = assessment_id)
    ORDER BY ap.completion_rate DESC;
END;
$$;

-- Function to get organization performance statistics
CREATE OR REPLACE FUNCTION get_organization_performance_stats()
RETURNS TABLE (
    organization_id UUID,
    organization_name VARCHAR,
    total_users INTEGER,
    active_users_7d INTEGER,
    active_users_30d INTEGER,
    total_assessments INTEGER,
    total_results INTEGER,
    completed_results INTEGER,
    average_score DECIMAL,
    average_time_spent INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        op.organization_id,
        op.organization_name,
        op.total_users,
        op.active_users_7d,
        op.active_users_30d,
        op.total_assessments,
        op.total_results,
        op.completed_results,
        op.average_score,
        op.average_time_spent::INTEGER
    FROM organization_performance op
    ORDER BY op.total_users DESC;
END;
$$;

-- Function to update user login statistics
CREATE OR REPLACE FUNCTION update_user_login_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    NEW.last_login = NOW();
    NEW.login_count = COALESCE(OLD.login_count, 0) + 1;
    RETURN NEW;
END;
$$;

-- Create trigger for user login tracking
DROP TRIGGER IF EXISTS update_user_login_trigger ON users;
CREATE TRIGGER update_user_login_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    WHEN (OLD.last_login IS DISTINCT FROM NEW.last_login)
    EXECUTE FUNCTION update_user_login_stats();

-- Function to calculate assessment completion time
CREATE OR REPLACE FUNCTION calculate_assessment_completion_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
        NEW.completed_at = NOW();
        IF NEW.started_at IS NOT NULL THEN
            NEW.time_spent = EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for assessment completion tracking
DROP TRIGGER IF EXISTS calculate_completion_time_trigger ON assessment_results;
CREATE TRIGGER calculate_completion_time_trigger
    BEFORE UPDATE ON assessment_results
    FOR EACH ROW
    WHEN (OLD.is_completed IS DISTINCT FROM NEW.is_completed)
    EXECUTE FUNCTION calculate_assessment_completion_time();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_is_active ON assessments(is_active);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON assessment_results(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment_id ON assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_organization_id ON assessment_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_is_completed ON assessment_results(is_completed);
CREATE INDEX IF NOT EXISTS idx_assessment_results_created_at ON assessment_results(created_at);

CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations(is_active);

-- Grant necessary permissions to authenticated users
GRANT SELECT ON user_activity_summary TO authenticated;
GRANT SELECT ON organization_performance TO authenticated;
GRANT SELECT ON assessment_performance TO authenticated;
GRANT SELECT ON daily_activity TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_activity_stats(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_assessment_performance_stats(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_performance_stats() TO authenticated; 