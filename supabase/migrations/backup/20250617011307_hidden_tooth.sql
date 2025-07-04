/*
  # Add OTP Authentication Support

  1. New Features
    - Add support for OTP-based authentication
    - Add password management capabilities
    - Add user access request system
    - Add temporary password functionality

  2. Tables
    - `access_requests` - Store pending access requests
    - `user_sessions` - Track user sessions and OTP attempts

  3. Security
    - Enable RLS on new tables
    - Add policies for access control
    - Add rate limiting for OTP requests
*/

-- Create access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  organization_name text NOT NULL,
  requested_role text NOT NULL DEFAULT 'org_admin',
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  approved_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz
);

-- Create user sessions table for OTP tracking
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  otp_code text,
  otp_expires_at timestamptz,
  otp_attempts integer DEFAULT 0,
  last_otp_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add password management fields to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_password_change boolean DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_otp_expires ON user_sessions(otp_expires_at);

-- Enable RLS
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Access requests policies
CREATE POLICY "Anyone can create access requests"
ON access_requests
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Super admins can view all access requests"
ON access_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Super admins can update access requests"
ON access_requests
FOR UPDATE
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

-- User sessions policies (for OTP management)
CREATE POLICY "Users can manage their own sessions"
ON user_sessions
FOR ALL
TO public
USING (email = auth.email())
WITH CHECK (email = auth.email());

-- Function to clean up expired OTP codes
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
  DELETE FROM user_sessions 
  WHERE otp_expires_at < now() - interval '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Function to generate OTP
CREATE OR REPLACE FUNCTION generate_otp(user_email text)
RETURNS text AS $$
DECLARE
  otp_code text;
  existing_session uuid;
BEGIN
  -- Generate 6-digit OTP
  otp_code := LPAD(floor(random() * 1000000)::text, 6, '0');
  
  -- Check if session exists
  SELECT id INTO existing_session 
  FROM user_sessions 
  WHERE email = user_email;
  
  IF existing_session IS NOT NULL THEN
    -- Update existing session
    UPDATE user_sessions 
    SET 
      otp_code = otp_code,
      otp_expires_at = now() + interval '5 minutes',
      otp_attempts = 0,
      last_otp_sent_at = now(),
      updated_at = now()
    WHERE id = existing_session;
  ELSE
    -- Create new session
    INSERT INTO user_sessions (email, otp_code, otp_expires_at, last_otp_sent_at)
    VALUES (user_email, otp_code, now() + interval '5 minutes', now());
  END IF;
  
  RETURN otp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(user_email text, provided_otp text)
RETURNS boolean AS $$
DECLARE
  stored_otp text;
  expires_at timestamptz;
  attempts integer;
BEGIN
  -- Get OTP details
  SELECT otp_code, otp_expires_at, otp_attempts 
  INTO stored_otp, expires_at, attempts
  FROM user_sessions 
  WHERE email = user_email;
  
  -- Check if OTP exists
  IF stored_otp IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if too many attempts
  IF attempts >= 3 THEN
    RETURN false;
  END IF;
  
  -- Check if expired
  IF expires_at < now() THEN
    RETURN false;
  END IF;
  
  -- Increment attempts
  UPDATE user_sessions 
  SET otp_attempts = otp_attempts + 1, updated_at = now()
  WHERE email = user_email;
  
  -- Check if OTP matches
  IF stored_otp = provided_otp THEN
    -- Clear OTP after successful verification
    UPDATE user_sessions 
    SET otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0
    WHERE email = user_email;
    
    -- Update user last login
    UPDATE users 
    SET last_login_at = now()
    WHERE email = user_email;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user from approved access request
CREATE OR REPLACE FUNCTION create_user_from_request(request_id uuid, approver_id uuid)
RETURNS uuid AS $$
DECLARE
  request_data access_requests%ROWTYPE;
  org_id uuid;
  new_user_id uuid;
  temp_password text;
BEGIN
  -- Get request data
  SELECT * INTO request_data FROM access_requests WHERE id = request_id;
  
  IF request_data.id IS NULL THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;
  
  IF request_data.status != 'pending' THEN
    RAISE EXCEPTION 'Access request is not pending';
  END IF;
  
  -- Find or create organization
  SELECT id INTO org_id FROM organizations WHERE name = request_data.organization_name;
  
  IF org_id IS NULL THEN
    INSERT INTO organizations (name) VALUES (request_data.organization_name) RETURNING id INTO org_id;
  END IF;
  
  -- Generate temporary password
  temp_password := 'temp_' || SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8);
  
  -- Create user
  INSERT INTO users (
    email, 
    first_name, 
    last_name, 
    role, 
    organization_id,
    requires_password_change
  ) VALUES (
    request_data.email,
    request_data.first_name,
    request_data.last_name,
    request_data.requested_role,
    org_id,
    true
  ) RETURNING id INTO new_user_id;
  
  -- Update request status
  UPDATE access_requests 
  SET 
    status = 'approved',
    approved_by_id = approver_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = request_id;
  
  -- TODO: Send email with temporary password
  -- This would be handled by the application layer
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_otp TO public;
GRANT EXECUTE ON FUNCTION verify_otp TO public;
GRANT EXECUTE ON FUNCTION create_user_from_request TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_otps TO authenticated;

-- Create trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();