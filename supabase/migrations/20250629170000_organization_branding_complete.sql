/*
  # Complete Organization Branding System

  1. New Tables
    - `web_branding_settings` - Store organization-specific web interface branding
    - `email_branding_settings` - Store organization-specific email template branding
    - Enhanced `pdf_branding_settings` - Additional fields for complete branding

  2. Features
    - Complete branding system for web, PDF, and email
    - Organization-specific branding isolation
    - Comprehensive security policies

  3. Security
    - RLS policies for proper access control
    - Role-based permissions for branding management
*/

-- Create web branding settings table
CREATE TABLE IF NOT EXISTS web_branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url text,
  favicon_url text,
  primary_color text NOT NULL DEFAULT '#2563EB',
  secondary_color text NOT NULL DEFAULT '#7E22CE',
  accent_color text NOT NULL DEFAULT '#14B8A6',
  company_name text NOT NULL,
  email_footer text,
  font_family text NOT NULL DEFAULT 'Inter',
  button_style text NOT NULL DEFAULT 'rounded',
  dark_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id)
);

-- Create email branding settings table
CREATE TABLE IF NOT EXISTS email_branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  email_header text,
  email_footer text,
  primary_color text NOT NULL DEFAULT '#2563EB',
  secondary_color text NOT NULL DEFAULT '#7E22CE',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id)
);

-- Enhance pdf_branding_settings table with additional fields
ALTER TABLE pdf_branding_settings 
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#14B8A6',
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'rounded';

-- Enable RLS on new tables
ALTER TABLE web_branding_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_branding_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for web_branding_settings
CREATE POLICY "Super admins can manage all web branding settings"
ON web_branding_settings
FOR ALL
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

CREATE POLICY "Org admins can manage their organization's web branding settings"
ON web_branding_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = web_branding_settings.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = web_branding_settings.organization_id
  )
);

CREATE POLICY "Users can view their organization's web branding settings"
ON web_branding_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = web_branding_settings.organization_id
  )
);

-- Create RLS policies for email_branding_settings
CREATE POLICY "Super admins can manage all email branding settings"
ON email_branding_settings
FOR ALL
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

CREATE POLICY "Org admins can manage their organization's email branding settings"
ON email_branding_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = email_branding_settings.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = email_branding_settings.organization_id
  )
);

CREATE POLICY "Users can view their organization's email branding settings"
ON email_branding_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = email_branding_settings.organization_id
  )
);

-- Create triggers for updated_at
CREATE TRIGGER update_web_branding_settings_updated_at
  BEFORE UPDATE ON web_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_branding_settings_updated_at
  BEFORE UPDATE ON email_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create functions to get branding settings
CREATE OR REPLACE FUNCTION get_web_branding_settings(org_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  company_name text,
  email_footer text,
  font_family text,
  button_style text,
  dark_mode boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view these settings
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return settings
  RETURN QUERY
  SELECT 
    wbs.id,
    wbs.organization_id,
    wbs.logo_url,
    wbs.favicon_url,
    wbs.primary_color,
    wbs.secondary_color,
    wbs.accent_color,
    wbs.company_name,
    wbs.email_footer,
    wbs.font_family,
    wbs.button_style,
    wbs.dark_mode
  FROM web_branding_settings wbs
  WHERE wbs.organization_id = org_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_email_branding_settings(org_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  sender_name text,
  sender_email text,
  email_header text,
  email_footer text,
  primary_color text,
  secondary_color text,
  logo_url text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view these settings
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return settings
  RETURN QUERY
  SELECT 
    ebs.id,
    ebs.organization_id,
    ebs.sender_name,
    ebs.sender_email,
    ebs.email_header,
    ebs.email_footer,
    ebs.primary_color,
    ebs.secondary_color,
    ebs.logo_url
  FROM email_branding_settings ebs
  WHERE ebs.organization_id = org_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_web_branding_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_branding_settings TO authenticated;

-- Insert default settings for existing organizations
INSERT INTO web_branding_settings (
  organization_id,
  company_name,
  primary_color,
  secondary_color,
  accent_color,
  email_footer,
  font_family,
  button_style
)
SELECT 
  id,
  name,
  '#2563EB',
  '#7E22CE',
  '#14B8A6',
  '© ' || EXTRACT(YEAR FROM CURRENT_DATE) || ' ' || name || '. All rights reserved.',
  'Inter',
  'rounded'
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

INSERT INTO email_branding_settings (
  organization_id,
  sender_name,
  sender_email,
  email_header,
  email_footer,
  primary_color,
  secondary_color
)
SELECT 
  id,
  name,
  'noreply@' || LOWER(REPLACE(name, ' ', '')) || '.com',
  'Welcome to ' || name,
  '© ' || EXTRACT(YEAR FROM CURRENT_DATE) || ' ' || name || '. All rights reserved.',
  '#2563EB',
  '#7E22CE'
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- Create a comprehensive function to get all branding settings
CREATE OR REPLACE FUNCTION get_organization_branding(org_id uuid)
RETURNS TABLE (
  web_branding jsonb,
  pdf_branding jsonb,
  email_branding jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has permission to view these settings
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return all branding settings
  RETURN QUERY
  SELECT 
    (SELECT jsonb_build_object(
      'logo_url', wbs.logo_url,
      'favicon_url', wbs.favicon_url,
      'primary_color', wbs.primary_color,
      'secondary_color', wbs.secondary_color,
      'accent_color', wbs.accent_color,
      'company_name', wbs.company_name,
      'email_footer', wbs.email_footer,
      'font_family', wbs.font_family,
      'button_style', wbs.button_style,
      'dark_mode', wbs.dark_mode
    ) FROM web_branding_settings wbs WHERE wbs.organization_id = org_id),
    
    (SELECT jsonb_build_object(
      'logo_url', pbs.logo_url,
      'company_name', pbs.company_name,
      'primary_color', pbs.primary_color,
      'secondary_color', pbs.secondary_color,
      'accent_color', pbs.accent_color,
      'footer_text', pbs.footer_text,
      'include_timestamp', pbs.include_timestamp,
      'include_page_numbers', pbs.include_page_numbers,
      'default_template', pbs.default_template,
      'font_family', pbs.font_family,
      'button_style', pbs.button_style
    ) FROM pdf_branding_settings pbs WHERE pbs.organization_id = org_id),
    
    (SELECT jsonb_build_object(
      'sender_name', ebs.sender_name,
      'sender_email', ebs.sender_email,
      'email_header', ebs.email_header,
      'email_footer', ebs.email_footer,
      'primary_color', ebs.primary_color,
      'secondary_color', ebs.secondary_color,
      'logo_url', ebs.logo_url
    ) FROM email_branding_settings ebs WHERE ebs.organization_id = org_id);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_organization_branding TO authenticated; 