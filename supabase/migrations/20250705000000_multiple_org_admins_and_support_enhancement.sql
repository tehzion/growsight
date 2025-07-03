-- Multiple Org Admins and Support Enhancement Migration
-- This migration adds support for multiple org admins per organization and enhanced support system

-- =====================================================================================
-- SECTION 1: ENHANCE ORGANIZATIONS TABLE
-- =====================================================================================

-- Add support for multiple org admins per organization
-- Create organization_admin_assignments table to track multiple org admins
CREATE TABLE IF NOT EXISTS organization_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_primary boolean DEFAULT false,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user per organization
  UNIQUE(organization_id, user_id)
);

-- =====================================================================================
-- SECTION 2: ENHANCE DEPARTMENTS TABLE
-- =====================================================================================

-- Add department admin support
ALTER TABLE departments ADD COLUMN IF NOT EXISTS department_admin_id uuid REFERENCES users(id) ON DELETE SET NULL;

-- Create department_admin_assignments table for multiple department admins
CREATE TABLE IF NOT EXISTS department_admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  is_primary boolean DEFAULT false,
  permissions jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure unique user per department
  UNIQUE(department_id, user_id)
);

-- =====================================================================================
-- SECTION 3: ENHANCE SUPPORT SYSTEM
-- =====================================================================================

-- Create support tickets table with enhanced contact options
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text UNIQUE NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  
  -- Contact information
  contact_type text NOT NULL CHECK (contact_type IN ('department_admin', 'org_admin', 'all_org_admins', 'super_admin', 'other')),
  contact_recipients jsonb NOT NULL DEFAULT '[]', -- Array of user IDs to contact
  contact_departments jsonb DEFAULT '[]', -- Array of department IDs for department-specific contacts
  
  -- Ticket details
  subject text NOT NULL,
  description text NOT NULL,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('technical', 'assessment', 'user_management', 'billing', 'general', 'other')),
  
  -- Assessment-related fields (if applicable)
  assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  assessment_result_id uuid REFERENCES assessment_results(id) ON DELETE SET NULL,
  
  -- Response tracking
  assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create support ticket responses table
CREATE TABLE IF NOT EXISTS support_ticket_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response_text text NOT NULL,
  is_internal boolean DEFAULT false, -- Internal notes vs user-visible responses
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create support ticket attachments table
CREATE TABLE IF NOT EXISTS support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  response_id uuid REFERENCES support_ticket_responses(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size integer,
  file_type text,
  uploaded_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- =====================================================================================
-- SECTION 4: ENHANCE ASSESSMENT RESULTS WITH ASSESSMENT ID
-- =====================================================================================

-- Add assessment_id to assessment_results if not exists
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE;

-- Update existing assessment_results to link to assessments via assignments
UPDATE assessment_results 
SET assessment_id = aa.assessment_id
FROM assessment_assignments aa
WHERE assessment_results.assignment_id = aa.id
AND assessment_results.assessment_id IS NULL;

-- =====================================================================================
-- SECTION 5: INDEXES
-- =====================================================================================

-- Organization admin indexes
CREATE INDEX IF NOT EXISTS idx_org_admin_assignments_org_id ON organization_admin_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_admin_assignments_user_id ON organization_admin_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_org_admin_assignments_primary ON organization_admin_assignments(organization_id, is_primary);

-- Department admin indexes
CREATE INDEX IF NOT EXISTS idx_dept_admin_assignments_dept_id ON department_admin_assignments(department_id);
CREATE INDEX IF NOT EXISTS idx_dept_admin_assignments_user_id ON department_admin_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_dept_admin_assignments_primary ON department_admin_assignments(department_id, is_primary);
CREATE INDEX IF NOT EXISTS idx_departments_admin_id ON departments(department_admin_id);

-- Support ticket indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_dept_id ON support_tickets(department_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assessment_id ON support_tickets(assessment_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assessment_result_id ON support_tickets(assessment_result_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);

-- Support ticket responses indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_responses_ticket_id ON support_ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_responses_user_id ON support_ticket_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_responses_created_at ON support_ticket_responses(created_at);

-- Support ticket attachments indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_ticket_id ON support_ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_attachments_response_id ON support_ticket_attachments(response_id);

-- Assessment results indexes
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment_id ON assessment_results(assessment_id);

-- =====================================================================================
-- SECTION 6: FUNCTIONS
-- =====================================================================================

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    ticket_num text;
    counter integer;
BEGIN
    -- Get current date in YYYYMMDD format
    ticket_num := to_char(current_date, 'YYYYMMDD');
    
    -- Get count of tickets for today
    SELECT COALESCE(COUNT(*), 0) + 1 INTO counter
    FROM support_tickets
    WHERE DATE(created_at) = current_date;
    
    -- Format: YYYYMMDD-XXXX (4-digit counter)
    ticket_num := ticket_num || '-' || lpad(counter::text, 4, '0');
    
    RETURN ticket_num;
END;
$$;

-- Function to get organization admins
CREATE OR REPLACE FUNCTION get_organization_admins(org_id uuid)
RETURNS TABLE (
    user_id uuid,
    user_name text,
    user_email text,
    is_primary boolean,
    permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        oaa.is_primary,
        oaa.permissions
    FROM organization_admin_assignments oaa
    JOIN users u ON u.id = oaa.user_id
    WHERE oaa.organization_id = org_id
    ORDER BY oaa.is_primary DESC, u.first_name, u.last_name;
END;
$$;

-- Function to get department admins
CREATE OR REPLACE FUNCTION get_department_admins(dept_id uuid)
RETURNS TABLE (
    user_id uuid,
    user_name text,
    user_email text,
    is_primary boolean,
    permissions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        daa.is_primary,
        daa.permissions
    FROM department_admin_assignments daa
    JOIN users u ON u.id = daa.user_id
    WHERE daa.department_id = dept_id
    ORDER BY daa.is_primary DESC, u.first_name, u.last_name;
END;
$$;

-- Function to get user's contact options
CREATE OR REPLACE FUNCTION get_user_contact_options(user_uuid uuid)
RETURNS TABLE (
    contact_type text,
    contact_label text,
    contact_recipients jsonb,
    contact_departments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_dept_id uuid;
    user_org_id uuid;
    user_dept_name text;
BEGIN
    -- Get user's department and organization
    SELECT department_id, organization_id INTO user_dept_id, user_org_id
    FROM users WHERE id = user_uuid;
    
    -- Get department name if exists
    SELECT name INTO user_dept_name
    FROM departments WHERE id = user_dept_id;
    
    -- Return contact options
    RETURN QUERY
    
    -- Department admins (if user has a department)
    SELECT 
        'department_admin'::text as contact_type,
        (user_dept_name || ' Admins')::text as contact_label,
        COALESCE(
            (SELECT jsonb_agg(u.user_id)
             FROM get_department_admins(user_dept_id) u),
            '[]'::jsonb
        ) as contact_recipients,
        jsonb_build_array(user_dept_id) as contact_departments
    WHERE user_dept_id IS NOT NULL
    
    UNION ALL
    
    -- All org admins
    SELECT 
        'org_admin'::text as contact_type,
        'All Org Admins'::text as contact_label,
        COALESCE(
            (SELECT jsonb_agg(u.user_id)
             FROM get_organization_admins(user_org_id) u),
            '[]'::jsonb
        ) as contact_recipients,
        '[]'::jsonb as contact_departments
    
    UNION ALL
    
    -- Super admin (for system-wide issues)
    SELECT 
        'super_admin'::text as contact_type,
        'Super Admin'::text as contact_label,
        (SELECT jsonb_agg(id) FROM users WHERE role = 'super_admin') as contact_recipients,
        '[]'::jsonb as contact_departments
    
    UNION ALL
    
    -- Other (custom contact)
    SELECT 
        'other'::text as contact_type,
        'Other'::text as contact_label,
        '[]'::jsonb as contact_recipients,
        '[]'::jsonb as contact_departments;
END;
$$;

-- =====================================================================================
-- SECTION 7: TRIGGERS
-- =====================================================================================

-- Trigger to auto-generate ticket number
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := generate_ticket_number();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
    BEFORE INSERT ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_number();

-- Trigger to update updated_at columns
CREATE TRIGGER update_organization_admin_assignments_updated_at
    BEFORE UPDATE ON organization_admin_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_department_admin_assignments_updated_at
    BEFORE UPDATE ON department_admin_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_ticket_responses_updated_at
    BEFORE UPDATE ON support_ticket_responses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- SECTION 8: RLS POLICIES
-- =====================================================================================

-- Enable RLS on new tables
ALTER TABLE organization_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Organization admin assignment policies
CREATE POLICY "org_admin_assignments_select_policy" ON organization_admin_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = organization_admin_assignments.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "org_admin_assignments_insert_policy" ON organization_admin_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- Department admin assignment policies
CREATE POLICY "dept_admin_assignments_select_policy" ON department_admin_assignments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN departments d ON d.id = department_admin_assignments.department_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = d.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "dept_admin_assignments_insert_policy" ON department_admin_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN departments d ON d.id = NEW.department_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = d.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- Support ticket policies
CREATE POLICY "support_tickets_select_policy" ON support_tickets
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_tickets.user_id OR
                ctx.user_id = ANY(support_tickets.contact_recipients::uuid[]) OR
                (ctx.organization_id = support_tickets.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "support_tickets_insert_policy" ON support_tickets
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.user_id = NEW.user_id AND
                ctx.organization_id = NEW.organization_id
        )
    );

CREATE POLICY "support_tickets_update_policy" ON support_tickets
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_tickets.user_id OR
                ctx.user_id = support_tickets.assigned_to_id OR
                (ctx.organization_id = support_tickets.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- Support ticket response policies
CREATE POLICY "support_ticket_responses_select_policy" ON support_ticket_responses
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = support_ticket_responses.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_ticket_responses.user_id OR
                (ctx.organization_id = st.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "support_ticket_responses_insert_policy" ON support_ticket_responses
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = NEW.ticket_id
            WHERE 
                ctx.user_id = NEW.user_id OR
                (ctx.organization_id = st.organization_id AND ctx.user_role = 'org_admin')
        )
    );

-- Support ticket attachment policies
CREATE POLICY "support_ticket_attachments_select_policy" ON support_ticket_attachments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = support_ticket_attachments.ticket_id
            WHERE 
                ctx.is_super_admin OR
                ctx.user_id = support_ticket_attachments.uploaded_by_id OR
                (ctx.organization_id = st.organization_id AND ctx.user_role = 'org_admin')
        )
    );

CREATE POLICY "support_ticket_attachments_insert_policy" ON support_ticket_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN support_tickets st ON st.id = NEW.ticket_id
            WHERE 
                ctx.user_id = NEW.uploaded_by_id OR
                (ctx.organization_id = st.organization_id AND ctx.user_role = 'org_admin')
        )
    ); 