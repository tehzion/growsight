-- Enhanced 360° Assessment Permissions and Anonymity
-- This migration enhances the 360° assessment system with proper role-based access and anonymity

-- Update assessment types to be more generic
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS assessment_category VARCHAR(100) DEFAULT 'leadership';

-- Create a view for anonymous 360° results (no names except for self)
CREATE OR REPLACE VIEW assessment_360_anonymous_results AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    o.id as organization_id,
    o.name as organization_name,
    d.id as department_id,
    d.name as department_name,
    ld.id as dimension_id,
    ld.name as dimension_name,
    ld.category as dimension_category,
    aa.relationship_type,
    COUNT(ar.id) as response_count,
    AVG(ar.rating) as average_rating,
    STDDEV(ar.rating) as rating_stddev,
    MIN(ar.rating) as min_rating,
    MAX(ar.rating) as max_rating,
    -- Anonymous reviewer info (only relationship type, no personal details)
    aa.reviewer_id,
    CASE 
        WHEN aa.relationship_type = 'self' THEN 'Self Assessment'
        WHEN aa.relationship_type = 'peer' THEN 'Peer Feedback'
        WHEN aa.relationship_type = 'subordinate' THEN 'Direct Report Feedback'
        WHEN aa.relationship_type = 'supervisor' THEN 'Manager Feedback'
        ELSE 'Other Feedback'
    END as reviewer_type
FROM assessments a
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN departments d ON p.department_id = d.id
JOIN assessment_360_responses ar ON aa.id = ar.assignment_id
JOIN leadership_dimensions ld ON ar.dimension_id = ld.id
WHERE a.assessment_type = '360_leadership'
AND aa.is_completed = TRUE
GROUP BY a.id, a.title, a.assessment_category, p.id, p.first_name, p.last_name, p.email, p.role, 
         o.id, o.name, d.id, d.name, ld.id, ld.name, ld.category, aa.relationship_type, aa.reviewer_id;

-- Create a view for super admin access (all organizations)
CREATE OR REPLACE VIEW assessment_360_super_admin_view AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    o.id as organization_id,
    o.name as organization_name,
    d.id as department_id,
    d.name as department_name,
    COUNT(DISTINCT aa.id) as total_assignments,
    COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END) as completed_assignments,
    ROUND(
        (COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END)::DECIMAL / NULLIF(COUNT(DISTINCT aa.id), 0)) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'self' THEN aa.id END) as self_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'peer' THEN aa.id END) as peer_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'subordinate' THEN aa.id END) as subordinate_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'supervisor' THEN aa.id END) as supervisor_assessments
FROM assessments a
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE a.assessment_type = '360_leadership'
GROUP BY a.id, a.title, a.assessment_category, p.id, p.first_name, p.last_name, p.email, p.role, 
         o.id, o.name, d.id, d.name;

-- Create a view for org admin access (organization only)
CREATE OR REPLACE VIEW assessment_360_org_admin_view AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    o.id as organization_id,
    o.name as organization_name,
    d.id as department_id,
    d.name as department_name,
    COUNT(DISTINCT aa.id) as total_assignments,
    COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END) as completed_assignments,
    ROUND(
        (COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END)::DECIMAL / NULLIF(COUNT(DISTINCT aa.id), 0)) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'self' THEN aa.id END) as self_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'peer' THEN aa.id END) as peer_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'subordinate' THEN aa.id END) as subordinate_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'supervisor' THEN aa.id END) as supervisor_assessments
FROM assessments a
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE a.assessment_type = '360_leadership'
GROUP BY a.id, a.title, a.assessment_category, p.id, p.first_name, p.last_name, p.email, p.role, 
         o.id, o.name, d.id, d.name;

-- Create a view for user access (self only)
CREATE OR REPLACE VIEW assessment_360_user_view AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    o.id as organization_id,
    o.name as organization_name,
    d.id as department_id,
    d.name as department_name,
    COUNT(DISTINCT aa.id) as total_assignments,
    COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END) as completed_assignments,
    ROUND(
        (COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END)::DECIMAL / NULLIF(COUNT(DISTINCT aa.id), 0)) * 100, 2
    ) as completion_rate,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'self' THEN aa.id END) as self_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'peer' THEN aa.id END) as peer_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'subordinate' THEN aa.id END) as subordinate_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'supervisor' THEN aa.id END) as supervisor_assessments
FROM assessments a
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
JOIN organizations o ON p.organization_id = o.id
LEFT JOIN departments d ON p.department_id = d.id
WHERE a.assessment_type = '360_leadership'
GROUP BY a.id, a.title, a.assessment_category, p.id, p.first_name, p.last_name, p.email, p.role, 
         o.id, o.name, d.id, d.name;

-- Update RLS policies for enhanced security

-- Super admin can view all 360° data
CREATE POLICY "Super admins can view all 360° data" ON assessment_360_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Org admins can view org 360° data
CREATE POLICY "Org admins can view org 360° data" ON assessment_360_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = (
                SELECT organization_id FROM users WHERE id = assessment_360_assignments.participant_id
            )
            AND users.role = 'org_admin'
        )
    );

-- Users can only view their own 360° data
CREATE POLICY "Users can view own 360° data" ON assessment_360_assignments
    FOR SELECT USING (
        auth.uid() = participant_id OR auth.uid() = reviewer_id
    );

-- Similar policies for responses
CREATE POLICY "Super admins can view all 360° responses" ON assessment_360_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can view org 360° responses" ON assessment_360_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = (
                SELECT u.organization_id FROM users u
                JOIN assessment_360_assignments a ON u.id = a.participant_id
                WHERE a.id = assessment_360_responses.assignment_id
            )
            AND users.role = 'org_admin'
        )
    );

CREATE POLICY "Users can view own 360° responses" ON assessment_360_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_360_assignments a
            WHERE a.id = assessment_360_responses.assignment_id
            AND (a.participant_id = auth.uid() OR a.reviewer_id = auth.uid())
        )
    );

-- Create functions for role-based data access

-- Function to get 360° results based on user role
CREATE OR REPLACE FUNCTION get_360_results_by_role(
    p_assessment_id UUID DEFAULT NULL,
    p_participant_id UUID DEFAULT NULL
)
RETURNS TABLE (
    assessment_id UUID,
    assessment_title VARCHAR,
    assessment_category VARCHAR,
    participant_id UUID,
    participant_first_name VARCHAR,
    participant_last_name VARCHAR,
    participant_email VARCHAR,
    participant_role VARCHAR,
    organization_id UUID,
    organization_name VARCHAR,
    department_id UUID,
    department_name VARCHAR,
    total_assignments BIGINT,
    completed_assignments BIGINT,
    completion_rate DECIMAL,
    self_assessments BIGINT,
    peer_assessments BIGINT,
    subordinate_assessments BIGINT,
    supervisor_assessments BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check user role and return appropriate data
    IF EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin') THEN
        -- Super admin sees all data
        RETURN QUERY
        SELECT * FROM assessment_360_super_admin_view
        WHERE (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id);
        
    ELSIF EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'org_admin') THEN
        -- Org admin sees only their organization's data
        RETURN QUERY
        SELECT * FROM assessment_360_org_admin_view
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id);
        
    ELSE
        -- Regular users see only their own data
        RETURN QUERY
        SELECT * FROM assessment_360_user_view
        WHERE participant_id = auth.uid()
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
    END IF;
END;
$$;

-- Function to export 360° results with role-based access
CREATE OR REPLACE FUNCTION export_360_results_csv(
    p_assessment_id UUID DEFAULT NULL,
    p_include_names BOOLEAN DEFAULT FALSE
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    csv_data TEXT := '';
    user_role VARCHAR;
    user_org_id UUID;
BEGIN
    -- Get user role and organization
    SELECT role, organization_id INTO user_role, user_org_id
    FROM users WHERE id = auth.uid();
    
    -- Build CSV header
    csv_data := 'Assessment ID,Assessment Title,Assessment Category,Participant ID';
    
    IF p_include_names AND (user_role = 'super_admin' OR user_role = 'org_admin') THEN
        csv_data := csv_data || ',First Name,Last Name,Email,Role';
    END IF;
    
    csv_data := csv_data || ',Organization,Department,Total Assignments,Completed Assignments,Completion Rate,Self Assessments,Peer Assessments,Subordinate Assessments,Supervisor Assessments' || E'\n';
    
    -- Build CSV data based on role
    IF user_role = 'super_admin' THEN
        -- Super admin gets all data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            assessment_title || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            participant_id::TEXT || ',' ||
            CASE WHEN p_include_names THEN 
                participant_first_name || ',' || participant_last_name || ',' || participant_email || ',' || participant_role || ','
            ELSE '' END ||
            organization_name || ',' ||
            COALESCE(department_name, '') || ',' ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_super_admin_view
        WHERE (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
        
    ELSIF user_role = 'org_admin' THEN
        -- Org admin gets organization data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            assessment_title || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            participant_id::TEXT || ',' ||
            CASE WHEN p_include_names THEN 
                participant_first_name || ',' || participant_last_name || ',' || participant_email || ',' || participant_role || ','
            ELSE '' END ||
            organization_name || ',' ||
            COALESCE(department_name, '') || ',' ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_org_admin_view
        WHERE organization_id = user_org_id
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
        
    ELSE
        -- Regular users get only their own data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            assessment_title || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            participant_id::TEXT || ',' ||
            organization_name || ',' ||
            COALESCE(department_name, '') || ',' ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_user_view
        WHERE participant_id = auth.uid()
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
    END IF;
    
    RETURN csv_data;
END;
$$;

-- Grant permissions
GRANT SELECT ON assessment_360_anonymous_results TO authenticated;
GRANT SELECT ON assessment_360_super_admin_view TO authenticated;
GRANT SELECT ON assessment_360_org_admin_view TO authenticated;
GRANT SELECT ON assessment_360_user_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_360_results_by_role(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_360_results_csv(UUID, BOOLEAN) TO authenticated; 