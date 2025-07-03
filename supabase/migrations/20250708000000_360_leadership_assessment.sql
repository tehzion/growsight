-- 360° Leadership Assessment Migration
-- This migration adds support for 360° leadership assessments with self-ratings, peer feedback, and organizational benchmarks

-- Create leadership dimensions table
CREATE TABLE IF NOT EXISTS leadership_dimensions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'Communication', 'Strategic Thinking', 'Team Leadership'
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create 360 assessment assignments table
CREATE TABLE IF NOT EXISTS assessment_360_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE CASCADE, -- The person being assessed
    reviewer_id UUID REFERENCES users(id) ON DELETE CASCADE, -- The person providing feedback
    relationship_type VARCHAR(50) NOT NULL, -- 'self', 'peer', 'subordinate', 'supervisor', 'other'
    assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, participant_id, reviewer_id)
);

-- Create 360 assessment responses table
CREATE TABLE IF NOT EXISTS assessment_360_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assignment_id UUID REFERENCES assessment_360_assignments(id) ON DELETE CASCADE,
    question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE,
    dimension_id UUID REFERENCES leadership_dimensions(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10), -- 1-10 scale
    text_response TEXT, -- For open-ended questions
    confidence_level INTEGER CHECK (confidence_level >= 1 AND confidence_level <= 5), -- 1-5 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create 360 assessment summary table for caching aggregated results
CREATE TABLE IF NOT EXISTS assessment_360_summaries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
    participant_id UUID REFERENCES users(id) ON DELETE CASCADE,
    dimension_id UUID REFERENCES leadership_dimensions(id) ON DELETE SET NULL,
    self_rating DECIMAL(4,2),
    self_rating_count INTEGER DEFAULT 0,
    peer_rating DECIMAL(4,2),
    peer_rating_count INTEGER DEFAULT 0,
    subordinate_rating DECIMAL(4,2),
    subordinate_rating_count INTEGER DEFAULT 0,
    supervisor_rating DECIMAL(4,2),
    supervisor_rating_count INTEGER DEFAULT 0,
    overall_others_rating DECIMAL(4,2),
    overall_others_count INTEGER DEFAULT 0,
    department_average DECIMAL(4,2),
    organization_average DECIMAL(4,2),
    gap_analysis DECIMAL(4,2), -- Difference between self and others
    last_calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assessment_id, participant_id, dimension_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leadership_dimensions_org_id ON leadership_dimensions(organization_id);
CREATE INDEX IF NOT EXISTS idx_leadership_dimensions_category ON leadership_dimensions(category);
CREATE INDEX IF NOT EXISTS idx_360_assignments_assessment_id ON assessment_360_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_360_assignments_participant_id ON assessment_360_assignments(participant_id);
CREATE INDEX IF NOT EXISTS idx_360_assignments_reviewer_id ON assessment_360_assignments(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_360_assignments_relationship_type ON assessment_360_assignments(relationship_type);
CREATE INDEX IF NOT EXISTS idx_360_assignments_is_completed ON assessment_360_assignments(is_completed);
CREATE INDEX IF NOT EXISTS idx_360_responses_assignment_id ON assessment_360_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_360_responses_question_id ON assessment_360_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_360_responses_dimension_id ON assessment_360_responses(dimension_id);
CREATE INDEX IF NOT EXISTS idx_360_summaries_assessment_id ON assessment_360_summaries(assessment_id);
CREATE INDEX IF NOT EXISTS idx_360_summaries_participant_id ON assessment_360_summaries(participant_id);
CREATE INDEX IF NOT EXISTS idx_360_summaries_dimension_id ON assessment_360_summaries(dimension_id);

-- Enable RLS on all tables
ALTER TABLE leadership_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_360_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_360_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_360_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies for leadership_dimensions
CREATE POLICY "Super admins can manage all dimensions" ON leadership_dimensions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can manage org dimensions" ON leadership_dimensions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = leadership_dimensions.organization_id
            AND users.role = 'org_admin'
        )
    );

CREATE POLICY "Users can view org dimensions" ON leadership_dimensions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = leadership_dimensions.organization_id
        )
    );

-- RLS policies for assessment_360_assignments
CREATE POLICY "Super admins can view all 360 assignments" ON assessment_360_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can view org 360 assignments" ON assessment_360_assignments
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

CREATE POLICY "Users can view own 360 assignments" ON assessment_360_assignments
    FOR SELECT USING (
        auth.uid() = participant_id OR auth.uid() = reviewer_id
    );

CREATE POLICY "Users can update own 360 assignments" ON assessment_360_assignments
    FOR UPDATE USING (
        auth.uid() = reviewer_id
    );

-- RLS policies for assessment_360_responses
CREATE POLICY "Super admins can view all 360 responses" ON assessment_360_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can view org 360 responses" ON assessment_360_responses
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

CREATE POLICY "Users can view own 360 responses" ON assessment_360_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_360_assignments a
            WHERE a.id = assessment_360_responses.assignment_id
            AND (a.participant_id = auth.uid() OR a.reviewer_id = auth.uid())
        )
    );

CREATE POLICY "Reviewers can create 360 responses" ON assessment_360_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM assessment_360_assignments a
            WHERE a.id = assessment_360_responses.assignment_id
            AND a.reviewer_id = auth.uid()
        )
    );

CREATE POLICY "Reviewers can update own 360 responses" ON assessment_360_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assessment_360_assignments a
            WHERE a.id = assessment_360_responses.assignment_id
            AND a.reviewer_id = auth.uid()
        )
    );

-- RLS policies for assessment_360_summaries
CREATE POLICY "Super admins can view all 360 summaries" ON assessment_360_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can view org 360 summaries" ON assessment_360_summaries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = (
                SELECT organization_id FROM users WHERE id = assessment_360_summaries.participant_id
            )
            AND users.role = 'org_admin'
        )
    );

CREATE POLICY "Users can view own 360 summaries" ON assessment_360_summaries
    FOR SELECT USING (
        auth.uid() = participant_id
    );

-- Create views for 360° reporting

-- View for 360° assessment overview
CREATE OR REPLACE VIEW assessment_360_overview AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    p.email as participant_email,
    p.role as participant_role,
    o.name as organization_name,
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
WHERE a.assessment_type = '360_leadership'
GROUP BY a.id, a.title, p.id, p.first_name, p.last_name, p.email, p.role, o.name;

-- View for dimension-level 360° results
CREATE OR REPLACE VIEW assessment_360_dimension_results AS
SELECT 
    a.id as assessment_id,
    a.title as assessment_title,
    p.id as participant_id,
    p.first_name as participant_first_name,
    p.last_name as participant_last_name,
    ld.id as dimension_id,
    ld.name as dimension_name,
    ld.category as dimension_category,
    aa.relationship_type,
    COUNT(ar.id) as response_count,
    AVG(ar.rating) as average_rating,
    STDDEV(ar.rating) as rating_stddev,
    MIN(ar.rating) as min_rating,
    MAX(ar.rating) as max_rating
FROM assessments a
JOIN assessment_360_assignments aa ON a.id = aa.assessment_id
JOIN users p ON aa.participant_id = p.id
JOIN assessment_360_responses ar ON aa.id = ar.assignment_id
JOIN leadership_dimensions ld ON ar.dimension_id = ld.id
WHERE a.assessment_type = '360_leadership'
AND aa.is_completed = TRUE
GROUP BY a.id, a.title, p.id, p.first_name, p.last_name, ld.id, ld.name, ld.category, aa.relationship_type;

-- Create functions for 360° assessment management

-- Function to create 360° assessment assignment
CREATE OR REPLACE FUNCTION create_360_assessment_assignment(
    p_assessment_id UUID,
    p_participant_id UUID,
    p_reviewer_id UUID,
    p_relationship_type VARCHAR(50),
    p_assigned_by_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_assignment_id UUID;
BEGIN
    -- Check if assignment already exists
    SELECT id INTO new_assignment_id
    FROM assessment_360_assignments
    WHERE assessment_id = p_assessment_id
    AND participant_id = p_participant_id
    AND reviewer_id = p_reviewer_id;
    
    IF new_assignment_id IS NOT NULL THEN
        RETURN new_assignment_id;
    END IF;
    
    -- Create new assignment
    INSERT INTO assessment_360_assignments (
        assessment_id,
        participant_id,
        reviewer_id,
        relationship_type,
        assigned_by_id
    ) VALUES (
        p_assessment_id,
        p_participant_id,
        p_reviewer_id,
        p_relationship_type,
        p_assigned_by_id
    ) RETURNING id INTO new_assignment_id;
    
    RETURN new_assignment_id;
END;
$$;

-- Function to calculate 360° assessment summaries
CREATE OR REPLACE FUNCTION calculate_360_assessment_summary(
    p_assessment_id UUID,
    p_participant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    dimension_record RECORD;
    self_avg DECIMAL(4,2);
    peer_avg DECIMAL(4,2);
    peer_count INTEGER;
    subordinate_avg DECIMAL(4,2);
    subordinate_count INTEGER;
    supervisor_avg DECIMAL(4,2);
    supervisor_count INTEGER;
    overall_others_avg DECIMAL(4,2);
    overall_others_count INTEGER;
    dept_avg DECIMAL(4,2);
    org_avg DECIMAL(4,2);
BEGIN
    -- Get all dimensions for this assessment
    FOR dimension_record IN 
        SELECT DISTINCT ld.id, ld.name
        FROM leadership_dimensions ld
        JOIN assessment_360_responses ar ON ld.id = ar.dimension_id
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
    LOOP
        -- Calculate self rating
        SELECT AVG(ar.rating), COUNT(ar.rating)
        INTO self_avg, peer_count
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
        AND aa.relationship_type = 'self'
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate peer rating
        SELECT AVG(ar.rating), COUNT(ar.rating)
        INTO peer_avg, peer_count
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
        AND aa.relationship_type = 'peer'
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate subordinate rating
        SELECT AVG(ar.rating), COUNT(ar.rating)
        INTO subordinate_avg, subordinate_count
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
        AND aa.relationship_type = 'subordinate'
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate supervisor rating
        SELECT AVG(ar.rating), COUNT(ar.rating)
        INTO supervisor_avg, supervisor_count
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
        AND aa.relationship_type = 'supervisor'
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate overall others rating (excluding self)
        SELECT AVG(ar.rating), COUNT(ar.rating)
        INTO overall_others_avg, overall_others_count
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND aa.participant_id = p_participant_id
        AND aa.relationship_type != 'self'
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate department average
        SELECT AVG(ar.rating)
        INTO dept_avg
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        JOIN users u ON aa.participant_id = u.id
        WHERE aa.assessment_id = p_assessment_id
        AND u.organization_id = (SELECT organization_id FROM users WHERE id = p_participant_id)
        AND ar.dimension_id = dimension_record.id;
        
        -- Calculate organization average
        SELECT AVG(ar.rating)
        INTO org_avg
        FROM assessment_360_responses ar
        JOIN assessment_360_assignments aa ON ar.assignment_id = aa.id
        WHERE aa.assessment_id = p_assessment_id
        AND ar.dimension_id = dimension_record.id;
        
        -- Insert or update summary
        INSERT INTO assessment_360_summaries (
            assessment_id,
            participant_id,
            dimension_id,
            self_rating,
            self_rating_count,
            peer_rating,
            peer_rating_count,
            subordinate_rating,
            subordinate_rating_count,
            supervisor_rating,
            supervisor_rating_count,
            overall_others_rating,
            overall_others_count,
            department_average,
            organization_average,
            gap_analysis,
            last_calculated_at
        ) VALUES (
            p_assessment_id,
            p_participant_id,
            dimension_record.id,
            self_avg,
            COALESCE(peer_count, 0),
            peer_avg,
            peer_count,
            subordinate_avg,
            subordinate_count,
            supervisor_avg,
            supervisor_count,
            overall_others_avg,
            overall_others_count,
            dept_avg,
            org_avg,
            COALESCE(overall_others_avg, 0) - COALESCE(self_avg, 0),
            NOW()
        )
        ON CONFLICT (assessment_id, participant_id, dimension_id)
        DO UPDATE SET
            self_rating = EXCLUDED.self_rating,
            self_rating_count = EXCLUDED.self_rating_count,
            peer_rating = EXCLUDED.peer_rating,
            peer_rating_count = EXCLUDED.peer_rating_count,
            subordinate_rating = EXCLUDED.subordinate_rating,
            subordinate_rating_count = EXCLUDED.subordinate_rating_count,
            supervisor_rating = EXCLUDED.supervisor_rating,
            supervisor_rating_count = EXCLUDED.supervisor_rating_count,
            overall_others_rating = EXCLUDED.overall_others_rating,
            overall_others_count = EXCLUDED.overall_others_count,
            department_average = EXCLUDED.department_average,
            organization_average = EXCLUDED.organization_average,
            gap_analysis = EXCLUDED.gap_analysis,
            last_calculated_at = NOW(),
            updated_at = NOW();
    END LOOP;
END;
$$;

-- Function to get 360° assessment results for a participant
CREATE OR REPLACE FUNCTION get_360_assessment_results(
    p_assessment_id UUID,
    p_participant_id UUID
)
RETURNS TABLE (
    dimension_id UUID,
    dimension_name VARCHAR,
    dimension_category VARCHAR,
    self_rating DECIMAL(4,2),
    self_count INTEGER,
    peer_rating DECIMAL(4,2),
    peer_count INTEGER,
    subordinate_rating DECIMAL(4,2),
    subordinate_count INTEGER,
    supervisor_rating DECIMAL(4,2),
    supervisor_count INTEGER,
    overall_others_rating DECIMAL(4,2),
    overall_others_count INTEGER,
    department_average DECIMAL(4,2),
    organization_average DECIMAL(4,2),
    gap_analysis DECIMAL(4,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Calculate summaries first
    PERFORM calculate_360_assessment_summary(p_assessment_id, p_participant_id);
    
    -- Return results
    RETURN QUERY
    SELECT 
        s.dimension_id,
        ld.name as dimension_name,
        ld.category as dimension_category,
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
        s.gap_analysis
    FROM assessment_360_summaries s
    JOIN leadership_dimensions ld ON s.dimension_id = ld.id
    WHERE s.assessment_id = p_assessment_id
    AND s.participant_id = p_participant_id
    ORDER BY ld.category, ld.name;
END;
$$;

-- Grant permissions
GRANT SELECT ON assessment_360_overview TO authenticated;
GRANT SELECT ON assessment_360_dimension_results TO authenticated;
GRANT EXECUTE ON FUNCTION create_360_assessment_assignment(UUID, UUID, UUID, VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_360_assessment_summary(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_360_assessment_results(UUID, UUID) TO authenticated; 