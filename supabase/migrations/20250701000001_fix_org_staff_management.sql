-- Organization and Staff Assignment Management Fixes
-- This migration ensures proper organization-staff relationships and profile tagging

-- 1. Ensure proper foreign key constraints for organization-staff relationships
DO $$
BEGIN
    -- Add organization_id constraint to users if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_organization_id_fkey 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;

    -- Add department_id constraint to users if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_department_id_fkey'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_department_id_fkey 
        FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create profile tags table for behavior tracking
CREATE TABLE IF NOT EXISTS profile_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    tag_category TEXT NOT NULL DEFAULT 'behavior',
    tag_value JSONB DEFAULT '{}',
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique tag per user per category
    UNIQUE(user_id, tag_name, tag_category)
);

-- 3. Create user behavior tracking table
CREATE TABLE IF NOT EXISTS user_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    behavior_type TEXT NOT NULL,
    behavior_data JSONB NOT NULL DEFAULT '{}',
    context TEXT,
    recorded_by_id UUID REFERENCES users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    organization_id TEXT NOT NULL,
    
    -- Add constraint to ensure behaviors are within organization
    CONSTRAINT user_behaviors_org_check CHECK (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_id 
            AND u.organization_id = user_behaviors.organization_id
        )
    )
);

-- 4. Create staff assignment tracking table
CREATE TABLE IF NOT EXISTS staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    organization_id TEXT NOT NULL,
    assignment_type TEXT NOT NULL DEFAULT 'permanent',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    assignment_data JSONB DEFAULT '{}',
    created_by_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure all parties are in same organization
    CONSTRAINT staff_assignments_org_consistency CHECK (
        EXISTS (
            SELECT 1 FROM users u1
            WHERE u1.id = staff_id AND u1.organization_id = organization_id
        ) AND
        (supervisor_id IS NULL OR EXISTS (
            SELECT 1 FROM users u2
            WHERE u2.id = supervisor_id AND u2.organization_id = organization_id
        )) AND
        (department_id IS NULL OR EXISTS (
            SELECT 1 FROM departments d
            WHERE d.id = department_id AND d.organization_id = organization_id
        ))
    )
);

-- 5. Enhanced organization membership validation function
CREATE OR REPLACE FUNCTION validate_organization_membership(
    user_id UUID,
    target_org_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_org_id TEXT;
    user_role TEXT;
BEGIN
    -- Get user's organization and role
    SELECT organization_id, role INTO user_org_id, user_role
    FROM users WHERE id = user_id;
    
    -- Super admins can access any organization
    IF user_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;
    
    -- Regular users can only access their own organization
    RETURN user_org_id = target_org_id;
END;
$$;

-- 6. Function to manage staff assignments with validation
CREATE OR REPLACE FUNCTION assign_staff_to_organization(
    p_staff_id UUID,
    p_organization_id TEXT,
    p_supervisor_id UUID DEFAULT NULL,
    p_department_id UUID DEFAULT NULL,
    p_assigned_by_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assignment_id UUID;
    staff_current_org TEXT;
BEGIN
    -- Validate staff exists and get current org
    SELECT organization_id INTO staff_current_org
    FROM users WHERE id = p_staff_id;
    
    IF staff_current_org IS NULL THEN
        RAISE EXCEPTION 'Staff member not found';
    END IF;
    
    -- Validate organization exists
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_organization_id) THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- If moving to different organization, update user record
    IF staff_current_org != p_organization_id THEN
        UPDATE users 
        SET organization_id = p_organization_id,
            department_id = p_department_id,
            updated_at = NOW()
        WHERE id = p_staff_id;
    END IF;
    
    -- Create assignment record
    INSERT INTO staff_assignments (
        staff_id, supervisor_id, department_id, organization_id,
        assignment_type, created_by_id
    ) VALUES (
        p_staff_id, p_supervisor_id, p_department_id, p_organization_id,
        'permanent', p_assigned_by_id
    ) RETURNING id INTO assignment_id;
    
    RETURN assignment_id;
END;
$$;

-- 7. Function to add profile tags with validation
CREATE OR REPLACE FUNCTION add_profile_tag(
    p_user_id UUID,
    p_tag_name TEXT,
    p_tag_category TEXT DEFAULT 'behavior',
    p_tag_value JSONB DEFAULT '{}',
    p_created_by_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    tag_id UUID;
    user_org_id TEXT;
    creator_org_id TEXT;
BEGIN
    -- Validate user exists and get organization
    SELECT organization_id INTO user_org_id
    FROM users WHERE id = p_user_id;
    
    IF user_org_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- If creator specified, validate same organization access
    IF p_created_by_id IS NOT NULL THEN
        SELECT organization_id INTO creator_org_id
        FROM users WHERE id = p_created_by_id;
        
        IF creator_org_id IS NULL THEN
            RAISE EXCEPTION 'Creator not found';
        END IF;
        
        -- Check if creator can tag this user
        IF NOT validate_organization_membership(p_created_by_id, user_org_id) THEN
            RAISE EXCEPTION 'Permission denied: cannot tag user from different organization';
        END IF;
    END IF;
    
    -- Insert or update tag
    INSERT INTO profile_tags (
        user_id, tag_name, tag_category, tag_value, created_by_id
    ) VALUES (
        p_user_id, p_tag_name, p_tag_category, p_tag_value, p_created_by_id
    ) 
    ON CONFLICT (user_id, tag_name, tag_category) 
    DO UPDATE SET 
        tag_value = EXCLUDED.tag_value,
        updated_at = NOW()
    RETURNING id INTO tag_id;
    
    RETURN tag_id;
END;
$$;

-- 8. Function to track user behavior
CREATE OR REPLACE FUNCTION track_user_behavior(
    p_user_id UUID,
    p_behavior_type TEXT,
    p_behavior_data JSONB DEFAULT '{}',
    p_context TEXT DEFAULT NULL,
    p_recorded_by_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    behavior_id UUID;
    user_org_id TEXT;
BEGIN
    -- Get user's organization
    SELECT organization_id INTO user_org_id
    FROM users WHERE id = p_user_id;
    
    IF user_org_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Insert behavior record
    INSERT INTO user_behaviors (
        user_id, behavior_type, behavior_data, context, 
        recorded_by_id, organization_id
    ) VALUES (
        p_user_id, p_behavior_type, p_behavior_data, p_context,
        p_recorded_by_id, user_org_id
    ) RETURNING id INTO behavior_id;
    
    RETURN behavior_id;
END;
$$;

-- 9. RLS Policies for new tables

-- Profile Tags RLS
ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_tags_select_policy" ON profile_tags
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                ctx.organization_id = u.organization_id
        )
    );

CREATE POLICY "profile_tags_insert_policy" ON profile_tags
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = NEW.user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = u.organization_id AND ctx.user_role IN ('org_admin', 'super_admin'))
        )
    );

CREATE POLICY "profile_tags_update_policy" ON profile_tags
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            JOIN users u ON u.id = profile_tags.user_id
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = u.organization_id AND ctx.user_role IN ('org_admin', 'super_admin')) OR
                ctx.user_id = profile_tags.created_by_id
        )
    );

-- User Behaviors RLS
ALTER TABLE user_behaviors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_behaviors_select_policy" ON user_behaviors
    FOR SELECT TO authenticated
    USING (
        check_org_access(user_behaviors.organization_id)
    );

CREATE POLICY "user_behaviors_insert_policy" ON user_behaviors
    FOR INSERT TO authenticated
    WITH CHECK (
        check_org_access(NEW.organization_id)
    );

-- Staff Assignments RLS
ALTER TABLE staff_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_assignments_select_policy" ON staff_assignments
    FOR SELECT TO authenticated
    USING (
        check_org_access(staff_assignments.organization_id)
    );

CREATE POLICY "staff_assignments_insert_policy" ON staff_assignments
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM get_user_org_context() ctx
            WHERE 
                ctx.is_super_admin OR
                (ctx.organization_id = NEW.organization_id AND ctx.user_role IN ('org_admin', 'super_admin'))
        )
    );

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_tags_user_id ON profile_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_tags_category ON profile_tags(tag_category);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_user_id ON user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_type ON user_behaviors(behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behaviors_org_id ON user_behaviors(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_staff_id ON staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_org_id ON staff_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_staff_assignments_supervisor_id ON staff_assignments(supervisor_id);

-- 11. Create triggers for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
DO $$
BEGIN
    -- Profile tags trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profile_tags_updated_at') THEN
        CREATE TRIGGER update_profile_tags_updated_at
            BEFORE UPDATE ON profile_tags
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    -- Staff assignments trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_assignments_updated_at') THEN
        CREATE TRIGGER update_staff_assignments_updated_at
            BEFORE UPDATE ON staff_assignments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION validate_organization_membership(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_staff_to_organization(UUID, TEXT, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_profile_tag(UUID, TEXT, TEXT, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION track_user_behavior(UUID, TEXT, JSONB, TEXT, UUID) TO authenticated;

-- Migration complete
INSERT INTO migrations (name, executed_at) VALUES ('20250701000001_fix_org_staff_management', NOW())
ON CONFLICT (name) DO NOTHING;