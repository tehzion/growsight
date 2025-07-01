-- Add user profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_format text DEFAULT 'MM/DD/YYYY';

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_assignments boolean DEFAULT true,
  email_reminders boolean DEFAULT true,
  email_results boolean DEFAULT true,
  theme text DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create user activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_description text,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can manage their own preferences"
ON user_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can view user preferences in their organization
CREATE POLICY "Admins can view user preferences in their organization"
ON user_preferences
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users admin_user
    JOIN users target_user ON target_user.id = user_preferences.user_id
    WHERE admin_user.id = auth.uid()
    AND admin_user.role IN ('super_admin', 'org_admin')
    AND (
      admin_user.role = 'super_admin' 
      OR admin_user.organization_id = target_user.organization_id
    )
  )
);

-- User activity log policies
CREATE POLICY "Users can view their own activity"
ON user_activity_log
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view activity logs in their organization
CREATE POLICY "Admins can view activity logs in their organization"
ON user_activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users admin_user
    JOIN users target_user ON target_user.id = user_activity_log.user_id
    WHERE admin_user.id = auth.uid()
    AND admin_user.role IN ('super_admin', 'org_admin')
    AND (
      admin_user.role = 'super_admin' 
      OR admin_user.organization_id = target_user.organization_id
    )
  )
);

-- System can insert activity logs
CREATE POLICY "System can insert activity logs"
ON user_activity_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Function to create default user preferences
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default preferences for new users
DROP TRIGGER IF EXISTS create_user_preferences_trigger ON users;
CREATE TRIGGER create_user_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_user_preferences();

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_activity_description text DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_activity_log (
    user_id,
    activity_type,
    activity_description,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_activity_description,
    p_ip_address,
    p_user_agent
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user profile
CREATE OR REPLACE FUNCTION update_user_profile(
  p_user_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_job_title text DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_timezone text DEFAULT NULL,
  p_date_format text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if user can update this profile
  IF NOT (
    auth.uid() = p_user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'org_admin')
      AND (
        role = 'super_admin' OR
        organization_id = (SELECT organization_id FROM users WHERE id = p_user_id)
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update user profile
  UPDATE users SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    department = COALESCE(p_department, department),
    job_title = COALESCE(p_job_title, job_title),
    location = COALESCE(p_location, location),
    bio = COALESCE(p_bio, bio),
    timezone = COALESCE(p_timezone, timezone),
    date_format = COALESCE(p_date_format, date_format),
    updated_at = now()
  WHERE id = p_user_id;

  -- Log the activity
  PERFORM log_user_activity(
    p_user_id,
    'profile_updated',
    'User profile information updated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user preferences
CREATE OR REPLACE FUNCTION update_user_preferences(
  p_user_id uuid,
  p_email_assignments boolean DEFAULT NULL,
  p_email_reminders boolean DEFAULT NULL,
  p_email_results boolean DEFAULT NULL,
  p_theme text DEFAULT NULL,
  p_language text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Check if user can update these preferences
  IF NOT (auth.uid() = p_user_id) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update or insert preferences
  INSERT INTO user_preferences (
    user_id,
    email_assignments,
    email_reminders,
    email_results,
    theme,
    language
  ) VALUES (
    p_user_id,
    COALESCE(p_email_assignments, true),
    COALESCE(p_email_reminders, true),
    COALESCE(p_email_results, true),
    COALESCE(p_theme, 'light'),
    COALESCE(p_language, 'en')
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_assignments = COALESCE(p_email_assignments, user_preferences.email_assignments),
    email_reminders = COALESCE(p_email_reminders, user_preferences.email_reminders),
    email_results = COALESCE(p_email_results, user_preferences.email_results),
    theme = COALESCE(p_theme, user_preferences.theme),
    language = COALESCE(p_language, user_preferences.language),
    updated_at = now();

  -- Log the activity
  PERFORM log_user_activity(
    p_user_id,
    'preferences_updated',
    'User preferences updated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_user_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_preferences TO authenticated;

-- Create trigger to update updated_at columns
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default preferences for existing users
INSERT INTO user_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;