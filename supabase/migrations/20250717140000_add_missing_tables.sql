-- =====================================================================================
-- ADD MISSING TABLES FOR COMPLETE FEATURE SET
-- This migration adds branding, import/export, competency, and department tables
-- =====================================================================================

-- =====================================================================================
-- DEPARTMENTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    parent_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT departments_name_org_unique UNIQUE (name, organization_id),
    CONSTRAINT departments_no_self_parent CHECK (id != parent_department_id)
);

-- =====================================================================================
-- COMPETENCIES TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' CHECK (category IN ('leadership', 'technical', 'behavioral', 'communication', 'general')),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT competencies_name_org_unique UNIQUE (name, organization_id)
);

-- =====================================================================================
-- QUESTION COMPETENCIES TABLE (Many-to-Many)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS question_competencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT question_competencies_unique UNIQUE (question_id, competency_id)
);

-- =====================================================================================
-- PROFILE TAGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS profile_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    tag_value TEXT,
    tag_type TEXT DEFAULT 'skill' CHECK (tag_type IN ('skill', 'strength', 'development', 'behavior', 'achievement')),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'assessment', 'peer_feedback', 'ai_analysis')),
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT profile_tags_user_tag_unique UNIQUE (user_id, tag_name, tag_type)
);

-- =====================================================================================
-- USER BEHAVIORS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    behavior_type TEXT NOT NULL CHECK (behavior_type IN ('engagement', 'collaboration', 'communication', 'leadership', 'problem_solving')),
    behavior_score DECIMAL(5,2) CHECK (behavior_score >= 0),
    measurement_period TEXT DEFAULT 'monthly' CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly')),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_behaviors_user_org_check CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_id 
            AND u.organization_id = organization_id
        )
    )
);

-- =====================================================================================
-- STAFF ASSIGNMENTS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    role_title TEXT,
    assignment_type TEXT DEFAULT 'permanent' CHECK (assignment_type IN ('permanent', 'temporary', 'contract', 'consultant')),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT staff_assignments_dates_check CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT staff_assignments_user_org_unique UNIQUE (user_id, organization_id, start_date)
);

-- =====================================================================================
-- WEB BRANDING SETTINGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS web_branding_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    primary_color TEXT DEFAULT '#2563EB',
    secondary_color TEXT DEFAULT '#7E22CE',
    accent_color TEXT DEFAULT '#14B8A6',
    logo_url TEXT,
    favicon_url TEXT,
    company_name TEXT,
    font_family TEXT DEFAULT 'Inter',
    button_style TEXT DEFAULT 'rounded' CHECK (button_style IN ('rounded', 'pill', 'square')),
    dark_mode_enabled BOOLEAN DEFAULT false,
    custom_css TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT web_branding_settings_org_unique UNIQUE (organization_id)
);

-- =====================================================================================
-- EMAIL BRANDING SETTINGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS email_branding_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email_header_color TEXT DEFAULT '#2563EB',
    email_footer_text TEXT,
    email_logo_url TEXT,
    sender_name TEXT,
    reply_to_email TEXT,
    email_signature TEXT,
    template_style TEXT DEFAULT 'modern' CHECK (template_style IN ('modern', 'classic', 'minimal')),
    custom_html_header TEXT,
    custom_html_footer TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT email_branding_settings_org_unique UNIQUE (organization_id)
);

-- =====================================================================================
-- PDF BRANDING SETTINGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS pdf_branding_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    header_logo_url TEXT,
    header_text TEXT,
    footer_text TEXT,
    primary_color TEXT DEFAULT '#2563EB',
    secondary_color TEXT DEFAULT '#7E22CE',
    font_family TEXT DEFAULT 'Helvetica',
    include_watermark BOOLEAN DEFAULT false,
    watermark_text TEXT,
    page_layout TEXT DEFAULT 'portrait' CHECK (page_layout IN ('portrait', 'landscape')),
    include_timestamp BOOLEAN DEFAULT true,
    include_page_numbers BOOLEAN DEFAULT true,
    custom_css TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pdf_branding_settings_org_unique UNIQUE (organization_id)
);

-- =====================================================================================
-- IMPORT LOGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL CHECK (import_type IN ('users', 'assessments', 'responses', 'competencies', 'departments')),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    error_summary TEXT,
    validation_errors JSONB,
    import_summary JSONB,
    started_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- EXPORT LOGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS export_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL CHECK (export_type IN ('users', 'assessments', 'responses', 'reports', 'analytics')),
    export_format TEXT DEFAULT 'csv' CHECK (export_format IN ('csv', 'xlsx', 'pdf', 'json')),
    file_name TEXT NOT NULL,
    file_size BIGINT,
    total_records INTEGER DEFAULT 0,
    export_filters JSONB,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- CREATE INDEXES FOR NEW TABLES
-- =====================================================================================

-- Departments indexes
CREATE INDEX IF NOT EXISTS idx_departments_organization_id ON departments(organization_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id ON departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_departments_created_by ON departments(created_by);

-- Competencies indexes
CREATE INDEX IF NOT EXISTS idx_competencies_organization_id ON competencies(organization_id);
CREATE INDEX IF NOT EXISTS idx_competencies_category ON competencies(category);
CREATE INDEX IF NOT EXISTS idx_competencies_created_by ON competencies(created_by);

-- Question competencies indexes
CREATE INDEX IF NOT EXISTS idx_question_competencies_question_id ON question_competencies(question_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_competency_id ON question_competencies(competency_id);

-- Profile tags indexes
CREATE INDEX IF NOT EXISTS idx_profile_tags_user_id ON profile_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_tag_name ON profile_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_profile_tags_tag_type ON profile_tags(tag_type);
CREATE INDEX IF NOT EXISTS idx_profile_tags_source ON profile_tags(source);
CREATE INDEX IF NOT EXISTS idx_profile_tags_created_by ON profile_tags(created_by);

-- User behaviors indexes
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_organization_id ON user_behaviors(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_type ON user_behaviors(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_recorded_at ON user_behaviors(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_recorded_by ON user_behaviors(recorded_by);

-- Staff assignments indexes
CREATE INDEX IF NOT EXISTS idx_staff_assignments_user_id ON staff_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_organization_id ON staff_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_department_id ON staff_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_active ON staff_assignments(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_staff_assignments_dates ON staff_assignments(start_date, end_date);

-- Branding settings indexes
CREATE INDEX IF NOT EXISTS idx_web_branding_settings_organization_id ON web_branding_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_branding_settings_organization_id ON email_branding_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_pdf_branding_settings_organization_id ON pdf_branding_settings(organization_id);

-- Import logs indexes
CREATE INDEX IF NOT EXISTS idx_import_logs_organization_id ON import_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_import_logs_type ON import_logs(import_type);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_by ON import_logs(started_by);
CREATE INDEX IF NOT EXISTS idx_import_logs_started_at ON import_logs(started_at DESC);

-- Export logs indexes
CREATE INDEX IF NOT EXISTS idx_export_logs_organization_id ON export_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_type ON export_logs(export_type);
CREATE INDEX IF NOT EXISTS idx_export_logs_status ON export_logs(status);
CREATE INDEX IF NOT EXISTS idx_export_logs_requested_by ON export_logs(requested_by);
CREATE INDEX IF NOT EXISTS idx_export_logs_requested_at ON export_logs(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_logs_expires_at ON export_logs(expires_at);

-- =====================================================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================================================

-- Add updated_at triggers for new tables
CREATE TRIGGER update_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_competencies_updated_at
    BEFORE UPDATE ON competencies
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

CREATE TRIGGER update_web_branding_settings_updated_at
    BEFORE UPDATE ON web_branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_branding_settings_updated_at
    BEFORE UPDATE ON email_branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_branding_settings_updated_at
    BEFORE UPDATE ON pdf_branding_settings
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

-- =====================================================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_competencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- INSERT DEFAULT BRANDING SETTINGS
-- =====================================================================================

-- Insert default branding settings for existing organizations
INSERT INTO web_branding_settings (organization_id, company_name, created_by)
SELECT 
    o.id,
    o.name,
    (SELECT id FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin') LIMIT 1)
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM web_branding_settings w WHERE w.organization_id = o.id
)
AND EXISTS (
    SELECT 1 FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin')
);

INSERT INTO email_branding_settings (organization_id, sender_name, created_by)
SELECT 
    o.id,
    o.name,
    (SELECT id FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin') LIMIT 1)
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM email_branding_settings e WHERE e.organization_id = o.id
)
AND EXISTS (
    SELECT 1 FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin')
);

INSERT INTO pdf_branding_settings (organization_id, header_text, created_by)
SELECT 
    o.id,
    o.name,
    (SELECT id FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin') LIMIT 1)
FROM organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM pdf_branding_settings p WHERE p.organization_id = o.id
)
AND EXISTS (
    SELECT 1 FROM users WHERE organization_id = o.id AND role IN ('super_admin', 'org_admin')
);

-- =====================================================================================
-- VALIDATION COMMENT
-- =====================================================================================

-- This migration adds the complete set of missing tables for:
-- 1. Organization management (departments, staff assignments)
-- 2. Competency framework (competencies, question competencies)
-- 3. User profiling (profile tags, user behaviors)
-- 4. Branding management (web, email, PDF settings)
-- 5. Import/export logging (import logs, export logs)
-- 6. All tables have proper RLS enabled
-- 7. Indexes for performance optimization
-- 8. Triggers for updated_at timestamps
-- 9. Default branding settings for existing organizations

COMMENT ON TABLE departments IS 'Organization department hierarchy and management';
COMMENT ON TABLE competencies IS 'Competency framework for skill assessment';
COMMENT ON TABLE profile_tags IS 'User skill and behavior tagging system';
COMMENT ON TABLE user_behaviors IS 'User behavior tracking and analytics';
COMMENT ON TABLE staff_assignments IS 'Staff assignment and role management';
COMMENT ON TABLE web_branding_settings IS 'Web interface branding customization';
COMMENT ON TABLE email_branding_settings IS 'Email template branding customization';
COMMENT ON TABLE pdf_branding_settings IS 'PDF report branding customization';
COMMENT ON TABLE import_logs IS 'Data import operation logging';
COMMENT ON TABLE export_logs IS 'Data export operation logging';