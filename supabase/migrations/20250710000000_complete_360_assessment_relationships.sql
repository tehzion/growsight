-- Complete 360° Assessment Relationships Migration
-- This migration ensures all relationships (Assessment ID, Organization ID, Org Admin ID, Staff ID) are properly linked

-- Update assessments table to ensure proper relationships
ALTER TABLE assessments 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assessment_category VARCHAR(100) DEFAULT 'leadership';

-- Update existing assessments to link to organizations if not already linked
UPDATE assessments 
SET organization_id = (
    SELECT organization_id FROM users WHERE id = assessments.created_by_id
)
WHERE organization_id IS NULL AND created_by_id IS NOT NULL;

-- Create comprehensive 360° assessment overview with all relationships
CREATE OR REPLACE VIEW assessment_360_complete_overview AS
SELECT 
    -- Assessment Information
    a.id as assessment_id,
    a.title as assessment_title,
    a.description as assessment_description,
    a.assessment_type,
    a.assessment_category,
    a.created_at as assessment_created_at,
    a.updated_at as assessment_updated_at,
    
    -- Organization Information
    a.organization_id,
    o.name as organization_name,
    o.domain as organization_domain,
    o.created_at as organization_created_at,
    
    -- Org Admin Information (Assessment Creator)
    a.created_by_id as org_admin_id,
    admin.first_name as org_admin_first_name,
    admin.last_name as org_admin_last_name,
    admin.email as org_admin_email,
    admin.role as org_admin_role,
    
    -- Participant Information
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    p.organization_id as participant_organization_id,
    p.department_id as participant_department_id,
    p.created_at as participant_created_at,
    
    -- Department Information
    d.id as department_id,
    d.name as department_name,
    d.description as department_description,
    
    -- Assignment Information
    aa.id as assignment_id,
    aa.relationship_type,
    aa.is_completed,
    aa.started_at,
    aa.completed_at,
    aa.created_at as assignment_created_at,
    
    -- Reviewer Information
    aa.reviewer_id,
    r.first_name as reviewer_first_name,
    r.last_name as reviewer_last_name,
    r.email as reviewer_email,
    r.role as reviewer_role,
    r.organization_id as reviewer_organization_id,
    r.department_id as reviewer_department_id,
    
    -- Completion Statistics
    COUNT(DISTINCT aa.id) OVER (PARTITION BY a.id, p.id) as total_assignments,
    COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END) OVER (PARTITION BY a.id, p.id) as completed_assignments,
    ROUND(
        (COUNT(DISTINCT CASE WHEN aa.is_completed THEN aa.id END) OVER (PARTITION BY a.id, p.id)::DECIMAL / 
         NULLIF(COUNT(DISTINCT aa.id) OVER (PARTITION BY a.id, p.id), 0)) * 100, 2
    ) as completion_rate,
    
    -- Relationship Type Counts
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'self' THEN aa.id END) OVER (PARTITION BY a.id, p.id) as self_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'peer' THEN aa.id END) OVER (PARTITION BY a.id, p.id) as peer_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'subordinate' THEN aa.id END) OVER (PARTITION BY a.id, p.id) as subordinate_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'supervisor' THEN aa.id END) OVER (PARTITION BY a.id, p.id) as supervisor_assessments,
    COUNT(DISTINCT CASE WHEN aa.relationship_type = 'other' THEN aa.id END) OVER (PARTITION BY a.id, p.id) as other_assessments
    
FROM assessments a
JOIN organizations o ON a.organization_id = o.id
JOIN users admin ON a.created_by_id = admin.id
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN users r ON aa.reviewer_id = r.id
WHERE a.assessment_type = '360_leadership';

-- Create comprehensive 360° results view with all relationships
CREATE OR REPLACE VIEW assessment_360_complete_results AS
SELECT 
    -- Assessment Information
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    a.created_at as assessment_created_at,
    
    -- Organization Information
    a.organization_id,
    o.name as organization_name,
    
    -- Org Admin Information
    a.created_by_id as org_admin_id,
    admin.first_name as org_admin_first_name,
    admin.last_name as org_admin_last_name,
    admin.email as org_admin_email,
    
    -- Participant Information
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    p.organization_id as participant_organization_id,
    p.department_id as participant_department_id,
    
    -- Department Information
    d.id as department_id,
    d.name as department_name,
    
    -- Dimension Information
    ld.id as dimension_id,
    ld.name as dimension_name,
    ld.category as dimension_category,
    ld.description as dimension_description,
    
    -- Assignment Information
    aa.id as assignment_id,
    aa.relationship_type,
    aa.is_completed,
    aa.reviewer_id,
    
    -- Reviewer Information (Anonymous)
    CASE 
        WHEN aa.relationship_type = 'self' THEN 'Self Assessment'
        WHEN aa.relationship_type = 'peer' THEN 'Peer Feedback'
        WHEN aa.relationship_type = 'subordinate' THEN 'Direct Report Feedback'
        WHEN aa.relationship_type = 'supervisor' THEN 'Manager Feedback'
        ELSE 'Other Feedback'
    END as reviewer_type,
    
    -- Response Information
    ar.id as response_id,
    ar.rating,
    ar.text_response,
    ar.confidence_level,
    ar.created_at as response_created_at,
    
    -- Question Information
    aq.id as question_id,
    aq.question_text,
    aq.question_type,
    aq.options
    
FROM assessments a
JOIN organizations o ON a.organization_id = o.id
JOIN users admin ON a.created_by_id = admin.id
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
JOIN assessment_360_responses ar ON aa.id = ar.assignment_id
JOIN leadership_dimensions ld ON ar.dimension_id = ld.id
JOIN assessment_questions aq ON ar.question_id = aq.id
WHERE a.assessment_type = '360_leadership'
AND aa.is_completed = TRUE;

-- Create comprehensive 360° summary view with all relationships
CREATE OR REPLACE VIEW assessment_360_complete_summary AS
SELECT 
    -- Assessment Information
    a.id as assessment_id,
    a.title as assessment_title,
    a.assessment_category,
    a.created_at as assessment_created_at,
    
    -- Organization Information
    a.organization_id,
    o.name as organization_name,
    
    -- Org Admin Information
    a.created_by_id as org_admin_id,
    admin.first_name as org_admin_first_name,
    admin.last_name as org_admin_last_name,
    admin.email as org_admin_email,
    
    -- Participant Information
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    p.organization_id as participant_organization_id,
    p.department_id as participant_department_id,
    
    -- Department Information
    d.id as department_id,
    d.name as department_name,
    
    -- Dimension Information
    ld.id as dimension_id,
    ld.name as dimension_name,
    ld.category as dimension_category,
    
    -- Summary Statistics
    s.self_rating,
    s.self_rating_count,
    s.peer_rating,
    s.peer_rating_count,
    s.subordinate_rating,
    s.subordinate_rating_count,
    s.supervisor_rating,
    s.supervisor_rating_count,
    s.overall_others_rating,
    s.overall_others_count,
    s.department_average,
    s.organization_average,
    s.gap_analysis,
    s.last_calculated_at
    
FROM assessments a
JOIN organizations o ON a.organization_id = o.id
JOIN users admin ON a.created_by_id = admin.id
JOIN assessment_360_summaries s ON a.id = s.assessment_id
JOIN users p ON s.participant_id = p.id
LEFT JOIN departments d ON p.department_id = d.id
JOIN leadership_dimensions ld ON s.dimension_id = ld.id
WHERE a.assessment_type = '360_leadership';

-- Function to get 360° results by role with all relationships
CREATE OR REPLACE FUNCTION get_360_results_by_role_complete(
    p_assessment_id UUID DEFAULT NULL,
    p_participant_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_org_admin_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL
)
RETURNS TABLE (
    assessment_id UUID,
    assessment_title VARCHAR,
    assessment_category VARCHAR,
    organization_id UUID,
    organization_name VARCHAR,
    org_admin_id UUID,
    org_admin_first_name VARCHAR,
    org_admin_last_name VARCHAR,
    org_admin_email VARCHAR,
    participant_id UUID,
    participant_first_name VARCHAR,
    participant_last_name VARCHAR,
    participant_email VARCHAR,
    participant_role VARCHAR,
    participant_organization_id UUID,
    participant_department_id UUID,
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
        SELECT * FROM assessment_360_complete_overview
        WHERE (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id)
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        AND (p_org_admin_id IS NULL OR org_admin_id = p_org_admin_id)
        AND (p_department_id IS NULL OR department_id = p_department_id);
        
    ELSIF EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'org_admin') THEN
        -- Org admin sees only their organization's data
        RETURN QUERY
        SELECT * FROM assessment_360_complete_overview
        WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id)
        AND (p_org_admin_id IS NULL OR org_admin_id = p_org_admin_id)
        AND (p_department_id IS NULL OR department_id = p_department_id);
        
    ELSE
        -- Regular users see only their own data
        RETURN QUERY
        SELECT * FROM assessment_360_complete_overview
        WHERE participant_id = auth.uid()
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
    END IF;
END;
$$;

-- Function to export 360° results with all relationships
CREATE OR REPLACE FUNCTION export_360_results_complete_csv(
    p_assessment_id UUID DEFAULT NULL,
    p_participant_id UUID DEFAULT NULL,
    p_organization_id UUID DEFAULT NULL,
    p_org_admin_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_include_names BOOLEAN DEFAULT FALSE,
    p_include_details BOOLEAN DEFAULT FALSE
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
    csv_data := 'Assessment ID,Assessment Title,Assessment Category,Organization ID,Organization Name,Org Admin ID,Org Admin Name,Org Admin Email';
    
    IF p_include_names THEN
        csv_data := csv_data || ',Participant ID,Participant Name,Participant Email,Participant Role,Department ID,Department Name';
    END IF;
    
    csv_data := csv_data || ',Total Assignments,Completed Assignments,Completion Rate,Self Assessments,Peer Assessments,Subordinate Assessments,Supervisor Assessments';
    
    IF p_include_details THEN
        csv_data := csv_data || ',Dimension ID,Dimension Name,Dimension Category,Self Rating,Others Rating,Department Average,Organization Average,Gap Analysis';
    END IF;
    
    csv_data := csv_data || E'\n';
    
    -- Build CSV data based on role
    IF user_role = 'super_admin' THEN
        -- Super admin gets all data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            COALESCE(assessment_title, '') || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            organization_id::TEXT || ',' ||
            COALESCE(organization_name, '') || ',' ||
            org_admin_id::TEXT || ',' ||
            COALESCE(org_admin_first_name, '') || ' ' || COALESCE(org_admin_last_name, '') || ',' ||
            COALESCE(org_admin_email, '') || ',' ||
            CASE WHEN p_include_names THEN 
                participant_id::TEXT || ',' || COALESCE(participant_first_name, '') || ' ' || COALESCE(participant_last_name, '') || ',' || COALESCE(participant_email, '') || ',' || COALESCE(participant_role, '') || ',' || COALESCE(department_id::TEXT, '') || ',' || COALESCE(department_name, '') || ','
            ELSE '' END ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_complete_overview
        WHERE (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id)
        AND (p_organization_id IS NULL OR organization_id = p_organization_id)
        AND (p_org_admin_id IS NULL OR org_admin_id = p_org_admin_id)
        AND (p_department_id IS NULL OR department_id = p_department_id);
        
    ELSIF user_role = 'org_admin' THEN
        -- Org admin gets organization data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            COALESCE(assessment_title, '') || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            organization_id::TEXT || ',' ||
            COALESCE(organization_name, '') || ',' ||
            org_admin_id::TEXT || ',' ||
            COALESCE(org_admin_first_name, '') || ' ' || COALESCE(org_admin_last_name, '') || ',' ||
            COALESCE(org_admin_email, '') || ',' ||
            CASE WHEN p_include_names THEN 
                participant_id::TEXT || ',' || COALESCE(participant_first_name, '') || ' ' || COALESCE(participant_last_name, '') || ',' || COALESCE(participant_email, '') || ',' || COALESCE(participant_role, '') || ',' || COALESCE(department_id::TEXT, '') || ',' || COALESCE(department_name, '') || ','
            ELSE '' END ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_complete_overview
        WHERE organization_id = user_org_id
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id)
        AND (p_participant_id IS NULL OR participant_id = p_participant_id)
        AND (p_org_admin_id IS NULL OR org_admin_id = p_org_admin_id)
        AND (p_department_id IS NULL OR department_id = p_department_id);
        
    ELSE
        -- Regular users get only their own data
        SELECT string_agg(
            assessment_id::TEXT || ',' ||
            COALESCE(assessment_title, '') || ',' ||
            COALESCE(assessment_category, '') || ',' ||
            organization_id::TEXT || ',' ||
            COALESCE(organization_name, '') || ',' ||
            org_admin_id::TEXT || ',' ||
            COALESCE(org_admin_first_name, '') || ' ' || COALESCE(org_admin_last_name, '') || ',' ||
            COALESCE(org_admin_email, '') || ',' ||
            participant_id::TEXT || ',' || COALESCE(participant_first_name, '') || ' ' || COALESCE(participant_last_name, '') || ',' || COALESCE(participant_email, '') || ',' || COALESCE(participant_role, '') || ',' || COALESCE(department_id::TEXT, '') || ',' || COALESCE(department_name, '') || ',' ||
            total_assignments::TEXT || ',' ||
            completed_assignments::TEXT || ',' ||
            completion_rate::TEXT || ',' ||
            self_assessments::TEXT || ',' ||
            peer_assessments::TEXT || ',' ||
            subordinate_assessments::TEXT || ',' ||
            supervisor_assessments::TEXT,
            E'\n'
        ) INTO csv_data
        FROM assessment_360_complete_overview
        WHERE participant_id = auth.uid()
        AND (p_assessment_id IS NULL OR assessment_id = p_assessment_id);
    END IF;
    
    RETURN csv_data;
END;
$$;

-- Grant permissions
GRANT SELECT ON assessment_360_complete_overview TO authenticated;
GRANT SELECT ON assessment_360_complete_results TO authenticated;
GRANT SELECT ON assessment_360_complete_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_360_results_by_role_complete(UUID, UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION export_360_results_complete_csv(UUID, UUID, UUID, UUID, UUID, BOOLEAN, BOOLEAN) TO authenticated; 