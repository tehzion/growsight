-- =====================================================================================
-- ROOT ACCESS REQUESTS MIGRATION
-- Creates system for requesting root/super_admin access with approval workflow
-- =====================================================================================

-- Create root_access_requests table
CREATE TABLE IF NOT EXISTS root_access_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    justification TEXT NOT NULL,
    company_name TEXT,
    position TEXT,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID,
    reviewer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Prevent duplicate requests from same email
    UNIQUE(email)
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_root_access_requests_status ON root_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_root_access_requests_email ON root_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_root_access_requests_requested_at ON root_access_requests(requested_at);

-- Enable RLS
ALTER TABLE root_access_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Only super_admin can view all requests
CREATE POLICY "Super admin can view all root access requests"
    ON root_access_requests FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Only super_admin can update requests (approve/reject)
CREATE POLICY "Super admin can update root access requests"
    ON root_access_requests FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'super_admin'
        )
    );

-- Anyone can create a root access request (public endpoint)
CREATE POLICY "Anyone can create root access requests"
    ON root_access_requests FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Add foreign key constraint for reviewer
ALTER TABLE root_access_requests 
ADD CONSTRAINT fk_root_access_requests_reviewer 
FOREIGN KEY (reviewed_by) REFERENCES users(id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_root_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_root_access_requests_updated_at
    BEFORE UPDATE ON root_access_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_root_access_requests_updated_at();

-- Add comment for documentation
COMMENT ON TABLE root_access_requests IS 'Stores requests for root/super_admin access requiring approval';
COMMENT ON COLUMN root_access_requests.status IS 'Request status: pending, approved, rejected';
COMMENT ON COLUMN root_access_requests.justification IS 'Business justification for root access';
COMMENT ON COLUMN root_access_requests.reviewed_by IS 'Super admin who reviewed the request';