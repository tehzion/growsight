-- Assessment Templates and Defaults Migration
-- This migration adds support for assessment templates, default templates, and template assignments

-- Create assessment_templates table
CREATE TABLE IF NOT EXISTS assessment_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_questions table to store questions for each template
CREATE TABLE IF NOT EXISTS template_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES assessment_templates(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'rating',
    category VARCHAR(100),
    section VARCHAR(100),
    order_index INTEGER NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    options JSONB, -- For multiple choice, dropdown, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create template_assignments table to track which templates are assigned to which organizations
CREATE TABLE IF NOT EXISTS template_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES assessment_templates(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(template_id, organization_id)
);

-- Create default_template_settings table to manage global default templates
CREATE TABLE IF NOT EXISTS default_template_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES assessment_templates(id) ON DELETE SET NULL,
    setting_type VARCHAR(50) NOT NULL, -- 'global_default', 'new_org_default', etc.
    created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(setting_type)
);

-- Add template_id to assessments table
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES assessment_templates(id) ON DELETE SET NULL;

-- Add template_id to assessment_results table for tracking
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES assessment_templates(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_templates_org_id ON assessment_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_is_default ON assessment_templates(is_default);
CREATE INDEX IF NOT EXISTS idx_assessment_templates_is_active ON assessment_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_template_questions_template_id ON template_questions(template_id);
CREATE INDEX IF NOT EXISTS idx_template_questions_order ON template_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_template_assignments_org_id ON template_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_template_assignments_template_id ON template_assignments(template_id);
CREATE INDEX IF NOT EXISTS idx_assessments_template_id ON assessments(template_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_template_id ON assessment_results(template_id);

-- Create RLS policies for assessment_templates
ALTER TABLE assessment_templates ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all templates
CREATE POLICY "Super admins can manage all templates" ON assessment_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Org admins can view and manage templates for their organization
CREATE POLICY "Org admins can manage org templates" ON assessment_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = assessment_templates.organization_id
            AND users.role = 'org_admin'
        )
    );

-- Users can view templates assigned to their organization
CREATE POLICY "Users can view org templates" ON assessment_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = assessment_templates.organization_id
        )
    );

-- Create RLS policies for template_questions
ALTER TABLE template_questions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all template questions
CREATE POLICY "Super admins can manage all template questions" ON template_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Org admins can manage template questions for their organization
CREATE POLICY "Org admins can manage org template questions" ON template_questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM assessment_templates 
            JOIN users ON users.organization_id = assessment_templates.organization_id
            WHERE assessment_templates.id = template_questions.template_id
            AND users.id = auth.uid() 
            AND users.role = 'org_admin'
        )
    );

-- Users can view template questions for their organization
CREATE POLICY "Users can view org template questions" ON template_questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assessment_templates 
            JOIN users ON users.organization_id = assessment_templates.organization_id
            WHERE assessment_templates.id = template_questions.template_id
            AND users.id = auth.uid()
        )
    );

-- Create RLS policies for template_assignments
ALTER TABLE template_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all template assignments
CREATE POLICY "Super admins can manage all template assignments" ON template_assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Org admins can view template assignments for their organization
CREATE POLICY "Org admins can view org template assignments" ON template_assignments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.organization_id = template_assignments.organization_id
            AND users.role = 'org_admin'
        )
    );

-- Create RLS policies for default_template_settings
ALTER TABLE default_template_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can manage default template settings
CREATE POLICY "Only super admins can manage default settings" ON default_template_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Create functions for template management

-- Function to create assessment from template
CREATE OR REPLACE FUNCTION create_assessment_from_template(
    template_id UUID,
    organization_id UUID,
    title VARCHAR(255),
    description TEXT DEFAULT NULL,
    created_by_id UUID DEFAULT auth.uid()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_assessment_id UUID;
    question_record RECORD;
BEGIN
    -- Create the assessment
    INSERT INTO assessments (
        title,
        description,
        organization_id,
        template_id,
        created_by_id,
        is_active
    ) VALUES (
        title,
        description,
        organization_id,
        template_id,
        created_by_id,
        TRUE
    ) RETURNING id INTO new_assessment_id;

    -- Copy questions from template
    FOR question_record IN 
        SELECT * FROM template_questions 
        WHERE template_id = create_assessment_from_template.template_id 
        ORDER BY order_index
    LOOP
        INSERT INTO assessment_questions (
            assessment_id,
            question_text,
            question_type,
            category,
            section,
            order_index,
            is_required,
            options
        ) VALUES (
            new_assessment_id,
            question_record.question_text,
            question_record.question_type,
            question_record.category,
            question_record.section,
            question_record.order_index,
            question_record.is_required,
            question_record.options
        );
    END LOOP;

    RETURN new_assessment_id;
END;
$$;

-- Function to set default template
CREATE OR REPLACE FUNCTION set_default_template(
    template_id UUID,
    setting_type VARCHAR(50) DEFAULT 'global_default'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only super admins can set default templates
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can set default templates';
    END IF;

    -- Update or insert default template setting
    INSERT INTO default_template_settings (template_id, setting_type, created_by_id)
    VALUES (template_id, setting_type, auth.uid())
    ON CONFLICT (setting_type) 
    DO UPDATE SET 
        template_id = EXCLUDED.template_id,
        updated_at = NOW(),
        created_by_id = EXCLUDED.created_by_id;
END;
$$;

-- Function to assign template to organization
CREATE OR REPLACE FUNCTION assign_template_to_organization(
    template_id UUID,
    organization_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only super admins can assign templates
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Only super admins can assign templates to organizations';
    END IF;

    -- Insert or update template assignment
    INSERT INTO template_assignments (template_id, organization_id, assigned_by_id)
    VALUES (template_id, organization_id, auth.uid())
    ON CONFLICT (template_id, organization_id) 
    DO UPDATE SET 
        is_active = TRUE,
        assigned_at = NOW(),
        assigned_by_id = EXCLUDED.assigned_by_id;
END;
$$;

-- Function to get default template for organization
CREATE OR REPLACE FUNCTION get_default_template_for_organization(org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    default_template_id UUID;
BEGIN
    -- First check for organization-specific template assignment
    SELECT template_id INTO default_template_id
    FROM template_assignments
    WHERE organization_id = org_id 
    AND is_active = TRUE
    LIMIT 1;

    -- If no organization-specific template, get global default
    IF default_template_id IS NULL THEN
        SELECT template_id INTO default_template_id
        FROM default_template_settings
        WHERE setting_type = 'global_default';
    END IF;

    RETURN default_template_id;
END;
$$;

-- Insert some default templates
INSERT INTO assessment_templates (name, description, is_default, is_active, created_by_id) VALUES
('Standard Leadership Assessment', 'Comprehensive leadership assessment covering communication, decision-making, and team management', TRUE, TRUE, NULL),
('360-Degree Feedback Template', 'Complete 360-degree feedback assessment for comprehensive employee evaluation', FALSE, TRUE, NULL),
('Performance Review Template', 'Standard performance review assessment for annual evaluations', FALSE, TRUE, NULL),
('Skills Assessment Template', 'Technical and soft skills assessment template', FALSE, TRUE, NULL);

-- Set the first template as global default
INSERT INTO default_template_settings (template_id, setting_type, created_by_id) VALUES
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'global_default', NULL);

-- Insert sample questions for the default template
INSERT INTO template_questions (template_id, question_text, question_type, category, section, order_index, is_required) VALUES
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How effectively does this person communicate with team members?', 'rating', 'Communication', 'Leadership Skills', 1, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How well does this person make decisions under pressure?', 'rating', 'Decision Making', 'Leadership Skills', 2, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How effectively does this person manage team conflicts?', 'rating', 'Conflict Management', 'Leadership Skills', 3, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How well does this person inspire and motivate others?', 'rating', 'Motivation', 'Leadership Skills', 4, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How effectively does this person delegate tasks?', 'rating', 'Delegation', 'Management Skills', 5, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How well does this person provide constructive feedback?', 'rating', 'Feedback', 'Management Skills', 6, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How effectively does this person plan and organize work?', 'rating', 'Planning', 'Management Skills', 7, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How well does this person adapt to change?', 'rating', 'Adaptability', 'Personal Qualities', 8, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'How effectively does this person demonstrate integrity and ethics?', 'rating', 'Integrity', 'Personal Qualities', 9, TRUE),
((SELECT id FROM assessment_templates WHERE name = 'Standard Leadership Assessment' LIMIT 1), 'Additional comments or suggestions for improvement:', 'text', 'General', 'Feedback', 10, FALSE);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_assessment_templates_updated_at 
    BEFORE UPDATE ON assessment_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_template_questions_updated_at 
    BEFORE UPDATE ON template_questions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_default_template_settings_updated_at 
    BEFORE UPDATE ON default_template_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 