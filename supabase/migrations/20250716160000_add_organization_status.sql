-- Add organization status support
-- This migration adds status tracking to organizations

-- Add status column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended'));

-- Add status change tracking
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status_changed_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- Update existing organizations to have active status
UPDATE organizations 
SET status = 'active', 
    status_changed_at = CURRENT_TIMESTAMP 
WHERE status IS NULL;

-- Add organization status change log table
CREATE TABLE IF NOT EXISTS organization_status_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for status log queries
CREATE INDEX IF NOT EXISTS idx_organization_status_log_org_id ON organization_status_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_status_log_created_at ON organization_status_log(created_at);

-- Enable RLS on organization_status_log
ALTER TABLE organization_status_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for organization_status_log
CREATE POLICY "Super admins can view all organization status logs" ON organization_status_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

CREATE POLICY "Super admins can insert organization status logs" ON organization_status_log
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_organization_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO organization_status_log (
            organization_id,
            old_status,
            new_status,
            changed_by,
            reason
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.status_changed_by,
            'Status changed via admin interface'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status change logging
DROP TRIGGER IF EXISTS trigger_log_organization_status_change ON organizations;
CREATE TRIGGER trigger_log_organization_status_change
    AFTER UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION log_organization_status_change();

-- Update the existing organizations RLS policy to include status
DROP POLICY IF EXISTS "Super admins can update organizations" ON organizations;
CREATE POLICY "Super admins can update organizations" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );