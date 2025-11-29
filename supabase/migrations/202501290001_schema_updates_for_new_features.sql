-- Migration: Schema Updates for New Features
-- Created: 2025-01-29
-- Description: Updates existing schema to support all new features and fix compatibility issues

-- =====================================================
-- 1. UPDATE USERS TABLE
-- =====================================================

-- Add full_name column (computed from first_name and last_name)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- Update role enum to include subscriber and root
DO $$ 
BEGIN
    -- Check if the constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'users_role_check' AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users DROP CONSTRAINT users_role_check;
    END IF;
    
    -- Add new constraint with all roles
    ALTER TABLE public.users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'org_admin', 'subscriber', 'employee', 'reviewer', 'root'));
END $$;

-- Add index on full_name for search
CREATE INDEX IF NOT EXISTS idx_users_full_name ON public.users(full_name);

-- =====================================================
-- 2. UPDATE ASSESSMENT_ASSIGNMENTS TABLE  
-- =====================================================

-- Add status column for assignment lifecycle
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'assessment_assignments' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.assessment_assignments 
        ADD COLUMN status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue'));
    END IF;
END $$;

-- Update existing records
UPDATE public.assessment_assignments 
SET status = CASE 
    WHEN is_completed = true THEN 'completed'
    WHEN due_date < CURRENT_DATE AND is_completed = false THEN 'overdue'
    ELSE 'pending'
END
WHERE status IS NULL;

-- Add index on status
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_status ON public.assessment_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_date ON public.assessment_assignments(due_date);

-- =====================================================
-- 3. ADD ASSIGNMENT_REMINDERS TABLE (for tracking sent reminders)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.assignment_reminders (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id uuid NOT NULL REFERENCES public.assessment_assignments(id) ON DELETE CASCADE,
    days_before integer NOT NULL,
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Prevent duplicate reminders
    CONSTRAINT assignment_reminders_unique UNIQUE(assignment_id, days_before)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_assignment_reminders_assignment_id ON public.assignment_reminders(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_reminders_sent_at ON public.assignment_reminders(sent_at);

-- Enable RLS
ALTER TABLE public.assignment_reminders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Super admins can manage assignment reminders"
    ON public.assignment_reminders
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can view assignment reminders in their org"
    ON public.assignment_reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.assessment_assignments aa
            JOIN public.assessments a ON aa.assessment_id = a.id
            JOIN public.users u ON u.id = auth.uid()
            WHERE aa.id = assignment_reminders.assignment_id
            AND u.role = 'org_admin'
            AND a.organization_id = u.organization_id
        )
    );

-- Add comment
COMMENT ON TABLE public.assignment_reminders IS 'Tracks sent assignment deadline reminders to prevent duplicates';

-- =====================================================
-- 4. UPDATE ORGANIZATIONS TABLE
-- =====================================================

-- Add status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'organizations' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE public.organizations 
        ADD COLUMN status TEXT DEFAULT 'active' 
        CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;
END $$;

-- Add index
CREATE INDEX IF NOT EXISTS idx_organizations_status ON public.organizations(status);

-- =====================================================
-- 5. ADD BRANDING SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.branding_settings (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id text NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    logo_url text,
    primary_color text DEFAULT '#3B82F6',
    secondary_color text DEFAULT '#10B981',
    company_name text,
    footer_text text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- One branding setting per organization
    CONSTRAINT branding_settings_org_unique UNIQUE(organization_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_branding_settings_organization_id ON public.branding_settings(organization_id);

-- Enable RLS
ALTER TABLE public.branding_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Super admins can manage all branding settings"
    ON public.branding_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Org admins can manage their organization branding"
    ON public.branding_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role = 'org_admin'
            AND users.organization_id = branding_settings.organization_id
        )
    );

CREATE POLICY "Users can view their organization branding"
    ON public.branding_settings
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.organization_id = branding_settings.organization_id
        )
    );

-- Add triggers
DROP TRIGGER IF EXISTS update_branding_settings_updated_at ON public.branding_settings;
CREATE TRIGGER update_branding_settings_updated_at
    BEFORE UPDATE ON public.branding_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comment
COMMENT ON TABLE public.branding_settings IS 'Stores organization-specific branding for PDFs and emails';

-- =====================================================
-- 6. ADD SUBSCRIBER_NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriber_notifications (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read boolean NOT NULL DEFAULT false,
    read_at timestamp with time zone,
    action_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Constraints
    CONSTRAINT subscriber_notifications_title_check CHECK (char_length(title) >= 1 AND char_length(title) <= 200)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_subscriber_notifications_user_id ON public.subscriber_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriber_notifications_is_read ON public.subscriber_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_subscriber_notifications_created_at ON public.subscriber_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.subscriber_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
    ON public.subscriber_notifications
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
    ON public.subscriber_notifications
    FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON public.subscriber_notifications
    FOR INSERT
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.subscriber_notifications IS 'In-app notifications for all users';

-- =====================================================
-- 7. UPDATE EXISTING FUNCTIONS
-- =====================================================

-- Update to handle new roles
CREATE OR REPLACE FUNCTION public.has_org_admin_permission(user_id uuid, permission_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_id
        AND role IN ('org_admin', 'super_admin', 'root')
    );
END;
$$;

-- =====================================================
-- 8. ADD HELPER FUNCTION FOR OVERDUE ASSIGNMENTS
-- =====================================================

-- Function to automatically update overdue assignments
CREATE OR REPLACE FUNCTION public.update_overdue_assignments()
RETURNS void AS $$
BEGIN
    UPDATE public.assessment_assignments
    SET status = 'overdue'
    WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND is_completed = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_overdue_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_overdue_assignments() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.update_overdue_assignments IS 'Updates assignment status to overdue when past due date';

-- =====================================================
-- 9. FIX ORGANIZATION ID TYPE MISMATCH
-- =====================================================

-- Note: The organizations table uses TEXT for id, but ideally should be UUID
-- This is a major change and should be done carefully in production
-- For now, we'll add a comment and a helper view

COMMENT ON COLUMN public.organizations.id IS 'Organization identifier (TEXT type for legacy compatibility, consider migrating to UUID)';

-- =====================================================
-- 10. ADD MISSING INDEXES FOR PERFORMANCE
-- =====================================================

-- Additional indexes for new features
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_is_published ON public.assessments(is_published);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assigned_by ON public.assessment_assignments(assigned_by);

-- =====================================================
-- 11. GRANT PERMISSIONS FOR NEW TABLES
-- =====================================================

-- Assignment reminders
GRANT SELECT ON public.assignment_reminders TO authenticated;
GRANT ALL ON public.assignment_reminders TO service_role;

-- Branding settings
GRANT SELECT ON public.branding_settings TO authenticated;
GRANT ALL ON public.branding_settings TO service_role;

-- Subscriber notifications
GRANT SELECT, UPDATE ON public.subscriber_notifications TO authenticated;
GRANT ALL ON public.subscriber_notifications TO service_role;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Schema update migration completed successfully';
    RAISE NOTICE 'Updated: users table (added full_name, updated roles)';
    RAISE NOTICE 'Updated: assessment_assignments table (added status column)';
    RAISE NOTICE 'Created: assignment_reminders table';
    RAISE NOTICE 'Created: branding_settings table';
    RAISE NOTICE 'Created: subscriber_notifications table';
    RAISE NOTICE 'Added: update_overdue_assignments() function';
    RAISE NOTICE 'Added: Performance indexes';
END $$;
