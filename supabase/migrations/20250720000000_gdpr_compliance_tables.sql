-- =====================================================================================
-- GDPR COMPLIANCE TABLES MIGRATION
-- =====================================================================================
-- This migration creates all necessary tables for GDPR compliance
-- Includes consent management, data export/erasure requests, and processing activities

-- =====================================================================================
-- CONSENT RECORDS TABLE
-- =====================================================================================
-- Stores user consent for different types of data processing
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'functional', 'necessary')),
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- DATA EXPORT REQUESTS TABLE
-- =====================================================================================
-- Stores user requests for data export (GDPR Article 20 - Right to Data Portability)
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('full_export', 'specific_data')),
    data_types TEXT[],
    format TEXT NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'pdf')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    reason TEXT,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    download_url TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- DATA DELETION REQUESTS TABLE
-- =====================================================================================
-- Stores user requests for data deletion (GDPR Article 17 - Right to Erasure)
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('soft_delete', 'hard_delete')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
    reason TEXT NOT NULL,
    retention_period INTEGER NOT NULL DEFAULT 0, -- days
    confirm_deletion BOOLEAN NOT NULL DEFAULT false,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- DATA PROCESSING ACTIVITIES TABLE
-- =====================================================================================
-- Stores records of data processing activities (GDPR Article 30 - Records of Processing)
CREATE TABLE IF NOT EXISTS data_processing_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity TEXT NOT NULL,
    purpose TEXT NOT NULL,
    legal_basis TEXT NOT NULL CHECK (legal_basis IN ('consent', 'contract', 'legal_obligation', 'vital_interests', 'public_task', 'legitimate_interests')),
    data_types TEXT[] NOT NULL,
    retention TEXT NOT NULL,
    automated BOOLEAN NOT NULL DEFAULT false,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================================================

-- Consent records indexes
CREATE INDEX IF NOT EXISTS idx_consent_records_user_id ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_consent_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted_at ON consent_records(granted_at);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_consent ON consent_records(user_id, consent_type, granted_at);

-- Data export requests indexes
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_requested_at ON data_export_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_status ON data_export_requests(user_id, status);

-- Data deletion requests indexes
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_status ON data_deletion_requests(user_id, status);

-- Data processing activities indexes
CREATE INDEX IF NOT EXISTS idx_data_processing_activities_user_id ON data_processing_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_activities_timestamp ON data_processing_activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_data_processing_activities_legal_basis ON data_processing_activities(legal_basis);
CREATE INDEX IF NOT EXISTS idx_data_processing_activities_user_timestamp ON data_processing_activities(user_id, timestamp);

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================================

-- Enable RLS on all GDPR tables
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_activities ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- CONSENT RECORDS RLS POLICIES
-- =====================================================================================

-- Users can view their own consent records
CREATE POLICY "Users can view own consent records" ON consent_records
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own consent records
CREATE POLICY "Users can insert own consent records" ON consent_records
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own consent records
CREATE POLICY "Users can update own consent records" ON consent_records
    FOR UPDATE USING (auth.uid() = user_id);

-- Org admins can view consent records for their organization
CREATE POLICY "Org admins can view organization consent records" ON consent_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'org_admin'
            AND u.organization_id = (
                SELECT organization_id FROM users WHERE id = consent_records.user_id
            )
        )
    );

-- =====================================================================================
-- DATA EXPORT REQUESTS RLS POLICIES
-- =====================================================================================

-- Users can view their own export requests
CREATE POLICY "Users can view own export requests" ON data_export_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own export requests
CREATE POLICY "Users can insert own export requests" ON data_export_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own export requests
CREATE POLICY "Users can update own export requests" ON data_export_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- Org admins can view export requests for their organization
CREATE POLICY "Org admins can view organization export requests" ON data_export_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'org_admin'
            AND u.organization_id = (
                SELECT organization_id FROM users WHERE id = data_export_requests.user_id
            )
        )
    );

-- =====================================================================================
-- DATA DELETION REQUESTS RLS POLICIES
-- =====================================================================================

-- Users can view their own deletion requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own deletion requests
CREATE POLICY "Users can insert own deletion requests" ON data_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own deletion requests
CREATE POLICY "Users can update own deletion requests" ON data_deletion_requests
    FOR UPDATE USING (auth.uid() = user_id);

-- Org admins can view deletion requests for their organization
CREATE POLICY "Org admins can view organization deletion requests" ON data_deletion_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'org_admin'
            AND u.organization_id = (
                SELECT organization_id FROM users WHERE id = data_deletion_requests.user_id
            )
        )
    );

-- =====================================================================================
-- DATA PROCESSING ACTIVITIES RLS POLICIES
-- =====================================================================================

-- Users can view their own processing activities
CREATE POLICY "Users can view own processing activities" ON data_processing_activities
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert processing activities for any user
CREATE POLICY "System can insert processing activities" ON data_processing_activities
    FOR INSERT WITH CHECK (true);

-- Org admins can view processing activities for their organization
CREATE POLICY "Org admins can view organization processing activities" ON data_processing_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'org_admin'
            AND u.organization_id = (
                SELECT organization_id FROM users WHERE id = data_processing_activities.user_id
            )
        )
    );

-- =====================================================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_consent_records_updated_at 
    BEFORE UPDATE ON consent_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_export_requests_updated_at 
    BEFORE UPDATE ON data_export_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_deletion_requests_updated_at 
    BEFORE UPDATE ON data_deletion_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- HELPER FUNCTIONS
-- =====================================================================================

-- Function to get user's current consent status
CREATE OR REPLACE FUNCTION get_user_consent_status(user_uuid UUID)
RETURNS TABLE(consent_type TEXT, granted BOOLEAN, granted_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (cr.consent_type)
        cr.consent_type,
        cr.granted,
        cr.granted_at
    FROM consent_records cr
    WHERE cr.user_id = user_uuid
    ORDER BY cr.consent_type, cr.granted_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has valid consent
CREATE OR REPLACE FUNCTION has_valid_consent(user_uuid UUID, consent_type_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    has_consent BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM consent_records cr
        WHERE cr.user_id = user_uuid
        AND cr.consent_type = consent_type_param
        AND cr.granted = true
        AND cr.withdrawn_at IS NULL
        ORDER BY cr.granted_at DESC
        LIMIT 1
    ) INTO has_consent;
    
    RETURN has_consent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================================
-- INITIAL DATA (DEFAULT CONSENT RECORDS)
-- =====================================================================================

-- Insert default necessary consent for existing users
INSERT INTO consent_records (user_id, consent_type, granted, version)
SELECT 
    id as user_id,
    'necessary' as consent_type,
    true as granted,
    '1.0' as version
FROM users
WHERE id NOT IN (
    SELECT user_id FROM consent_records WHERE consent_type = 'necessary'
);

-- =====================================================================================
-- MIGRATION COMPLETE
-- ===================================================================================== 