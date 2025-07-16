-- Add organization period management
-- This migration adds period tracking and automatic status transitions

-- Add period fields to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS period_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS period_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_transition_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 0;

-- Add assessment date management
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assessment_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS assessment_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS set_by_super_admin BOOLEAN DEFAULT false;

-- Create organization periods table for historical tracking
CREATE TABLE IF NOT EXISTS organization_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    period_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status_at_start TEXT DEFAULT 'active',
    status_at_end TEXT DEFAULT 'inactive',
    auto_transitioned BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Create indexes for period queries
CREATE INDEX IF NOT EXISTS idx_organization_periods_org_id ON organization_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_periods_dates ON organization_periods(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_organizations_period_end ON organizations(period_end_date) WHERE auto_transition_enabled = true;

-- Enable RLS on organization_periods
ALTER TABLE organization_periods ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_periods
CREATE POLICY "Super admins can view all organization periods" ON organization_periods
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can insert organization periods" ON organization_periods
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Function to automatically transition organizations past their period
CREATE OR REPLACE FUNCTION auto_transition_expired_organizations()
RETURNS INTEGER AS $$
DECLARE
    org_record RECORD;
    transition_count INTEGER := 0;
BEGIN
    -- Find organizations that have passed their end date and need transition
    FOR org_record IN
        SELECT id, name, period_end_date, grace_period_days
        FROM organizations
        WHERE auto_transition_enabled = true
        AND period_end_date IS NOT NULL
        AND period_end_date + INTERVAL '1 day' * COALESCE(grace_period_days, 0) < NOW()
        AND status = 'active'
    LOOP
        -- Update organization status to inactive
        UPDATE organizations 
        SET status = 'inactive',
            status_changed_at = NOW(),
            status_changed_by = NULL
        WHERE id = org_record.id;
        
        -- Log the status change
        INSERT INTO organization_status_log (
            organization_id,
            old_status,
            new_status,
            changed_by,
            reason
        ) VALUES (
            org_record.id,
            'active',
            'inactive',
            NULL,
            'Automatic transition after period end date'
        );
        
        -- Record the period completion
        INSERT INTO organization_periods (
            organization_id,
            period_start_date,
            period_end_date,
            status_at_start,
            status_at_end,
            auto_transitioned,
            notes
        ) VALUES (
            org_record.id,
            COALESCE(
                (SELECT period_start_date FROM organizations WHERE id = org_record.id),
                org_record.period_end_date - INTERVAL '1 year'
            ),
            org_record.period_end_date,
            'active',
            'inactive',
            true,
            'Auto-transitioned to inactive after period ended'
        );
        
        transition_count := transition_count + 1;
    END LOOP;
    
    RETURN transition_count;
END;
$$ LANGUAGE plpgsql;

-- Function to set organization period
CREATE OR REPLACE FUNCTION set_organization_period(
    org_id TEXT,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    enable_auto_transition BOOLEAN DEFAULT true,
    grace_days INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO current_user_id;
    
    -- Check if user is super admin
    SELECT role INTO current_user_role 
    FROM users 
    WHERE id = current_user_id;
    
    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can set organization periods';
    END IF;
    
    -- Validate dates
    IF start_date >= end_date THEN
        RAISE EXCEPTION 'Start date must be before end date';
    END IF;
    
    -- Update organization with new period
    UPDATE organizations 
    SET period_start_date = start_date,
        period_end_date = end_date,
        auto_transition_enabled = enable_auto_transition,
        grace_period_days = grace_days,
        status = 'active',
        status_changed_at = NOW(),
        status_changed_by = current_user_id,
        updated_at = NOW()
    WHERE id = org_id;
    
    -- Log the period setting
    INSERT INTO organization_status_log (
        organization_id,
        old_status,
        new_status,
        changed_by,
        reason
    ) VALUES (
        org_id,
        'inactive',
        'active',
        current_user_id,
        'Organization period set from ' || start_date || ' to ' || end_date
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job placeholder (would need to be set up in production)
-- This would run daily to check for expired organizations
COMMENT ON FUNCTION auto_transition_expired_organizations() IS 'Run this function daily via cron job or scheduled task to automatically transition expired organizations';

-- Add assessment result preservation policy
ALTER TABLE assessment_responses 
ADD COLUMN IF NOT EXISTS preserved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS preservation_reason TEXT;

-- Function to preserve assessment results when organization becomes inactive
CREATE OR REPLACE FUNCTION preserve_assessment_results()
RETURNS TRIGGER AS $$
BEGIN
    -- If organization is being set to inactive, preserve all assessment results
    IF OLD.status = 'active' AND NEW.status = 'inactive' THEN
        UPDATE assessment_responses 
        SET preserved_at = NOW(),
            preservation_reason = 'Organization transitioned to inactive status'
        WHERE assessment_id IN (
            SELECT id FROM assessments WHERE organization_id = NEW.id
        ) AND preserved_at IS NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assessment result preservation
DROP TRIGGER IF EXISTS trigger_preserve_assessment_results ON organizations;
CREATE TRIGGER trigger_preserve_assessment_results
    AFTER UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION preserve_assessment_results();

-- Add function to reactivate organization
CREATE OR REPLACE FUNCTION reactivate_organization(
    org_id TEXT,
    new_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_id UUID;
    current_user_role TEXT;
BEGIN
    -- Get current user
    SELECT auth.uid() INTO current_user_id;
    
    -- Check if user is super admin
    SELECT role INTO current_user_role 
    FROM users 
    WHERE id = current_user_id;
    
    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can reactivate organizations';
    END IF;
    
    -- Update organization status
    UPDATE organizations 
    SET status = 'active',
        status_changed_at = NOW(),
        status_changed_by = current_user_id,
        period_end_date = COALESCE(new_end_date, period_end_date),
        updated_at = NOW()
    WHERE id = org_id;
    
    -- Log the reactivation
    INSERT INTO organization_status_log (
        organization_id,
        old_status,
        new_status,
        changed_by,
        reason
    ) VALUES (
        org_id,
        'inactive',
        'active',
        current_user_id,
        'Organization reactivated by super admin'
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;