-- =====================================================================================
-- ADD COMPREHENSIVE NOTIFICATIONS SYSTEM
-- This migration adds support for in-app notifications and enhanced notification features
-- Compatible with existing notification system in the database
-- =====================================================================================

-- Extend existing notification_type enum to include in-app notification types
DO $$ BEGIN
    -- Add new notification types to existing enum
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'deadline_reminder';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'results_available';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'system_update';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'welcome_message';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'organization_update';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'user_mention';
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feedback_received';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notification priority levels
DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create in-app notifications table (separate from assessment_notifications)
CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority notification_priority DEFAULT 'medium',
    read BOOLEAN DEFAULT false,
    action_url TEXT,
    action_text TEXT,
    metadata JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type notification_type NOT NULL,
    in_app_enabled BOOLEAN DEFAULT true,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    frequency TEXT DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'daily', 'weekly', 'disabled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type)
);

-- Create notification delivery log table
CREATE TABLE IF NOT EXISTS notification_delivery_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES user_notifications(id) ON DELETE CASCADE,
    delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'push')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    error_message TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update users table to include subscriber role if not already present
DO $$ 
BEGIN
    -- Check if 'subscriber' is already in the check constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%users_role_check%' 
        AND check_clause LIKE '%subscriber%'
    ) THEN
        -- Drop the existing constraint
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
        
        -- Add new constraint with subscriber role
        ALTER TABLE users ADD CONSTRAINT users_role_check 
            CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_type ON user_notifications(type);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(read);
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_expires_at ON user_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_notifications_priority ON user_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_log_status ON notification_delivery_log(status);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_notifications_updated_at 
    BEFORE UPDATE ON user_notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get unread notification count for user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    count INTEGER;
BEGIN
    SELECT COUNT(*) INTO count
    FROM user_notifications
    WHERE user_id = p_user_id 
    AND read = false
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_notifications 
    SET read = true, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id 
    AND read = false;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to create notification with preferences check
CREATE OR REPLACE FUNCTION create_notification_with_preferences(
    p_user_id UUID,
    p_type notification_type,
    p_title TEXT,
    p_message TEXT,
    p_priority notification_priority DEFAULT 'medium',
    p_action_url TEXT DEFAULT NULL,
    p_action_text TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    pref_enabled BOOLEAN;
BEGIN
    -- Check if user has in-app notifications enabled for this type
    SELECT in_app_enabled INTO pref_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id AND notification_type = p_type;
    
    -- If no preference exists, default to enabled
    IF pref_enabled IS NULL THEN
        pref_enabled := true;
    END IF;
    
    -- Only create notification if enabled
    IF pref_enabled THEN
        INSERT INTO user_notifications (
            user_id, type, title, message, priority, action_url, action_text, metadata, expires_at
        ) VALUES (
            p_user_id, p_type, p_title, p_message, p_priority, p_action_url, p_action_text, p_metadata, p_expires_at
        ) RETURNING id INTO notification_id;
        
        -- Log delivery
        INSERT INTO notification_delivery_log (notification_id, delivery_method, status)
        VALUES (notification_id, 'in_app', 'sent');
    END IF;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies for notifications
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON user_notifications
    FOR INSERT WITH CHECK (true);

-- Users can manage their own notification preferences
CREATE POLICY "Users can manage own notification preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- System can view delivery logs (for admins)
CREATE POLICY "Admins can view delivery logs" ON notification_delivery_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('super_admin', 'org_admin')
        )
    );

-- Insert default notification preferences for existing users
INSERT INTO notification_preferences (user_id, notification_type, in_app_enabled, email_enabled)
SELECT 
    u.id,
    nt.notification_type,
    true,
    CASE 
        WHEN nt.notification_type IN ('deadline_reminder', 'assignment_created') THEN true
        ELSE false
    END
FROM users u
CROSS JOIN (
    SELECT unnest(enum_range(NULL::notification_type)) AS notification_type
) nt
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np
    WHERE np.user_id = u.id AND np.notification_type = nt.notification_type
);

-- Create sample notifications for testing (only for existing users)
INSERT INTO user_notifications (user_id, type, title, message, priority, action_url)
SELECT 
    u.id,
    'welcome_message',
    'Welcome to GrowSight!',
    'Thank you for joining GrowSight. Get started by completing your first assessment.',
    'medium',
    '/dashboard'
FROM users u
WHERE u.role IN ('employee', 'reviewer', 'subscriber')
AND NOT EXISTS (
    SELECT 1 FROM user_notifications n
    WHERE n.user_id = u.id AND n.type = 'welcome_message'
)
LIMIT 5; -- Limit to avoid too many notifications

-- Add helpful comments
COMMENT ON TABLE user_notifications IS 'In-app notifications for users';
COMMENT ON TABLE notification_preferences IS 'User preferences for different notification types';
COMMENT ON TABLE notification_delivery_log IS 'Log of notification delivery attempts';
COMMENT ON FUNCTION cleanup_expired_notifications() IS 'Removes expired notifications from the database';
COMMENT ON FUNCTION get_unread_notification_count(UUID) IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION mark_all_notifications_read(UUID) IS 'Marks all notifications as read for a user';
COMMENT ON FUNCTION create_notification_with_preferences(UUID, notification_type, TEXT, TEXT, notification_priority, TEXT, TEXT, JSONB, TIMESTAMP WITH TIME ZONE) IS 'Creates notification respecting user preferences';