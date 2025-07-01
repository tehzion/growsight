/*
  # Add PDF Branding Settings

  1. New Tables
    - `pdf_branding_settings` - Store organization-specific PDF branding settings
    - Includes logo URL, colors, footer text, etc.

  2. Features
    - Organization-specific PDF branding
    - Default templates
    - Customizable colors and layout

  3. Security
    - RLS policies for proper access control
    - Only admins can manage branding settings
*/

-- Create PDF branding settings table
CREATE TABLE IF NOT EXISTS pdf_branding_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  logo_url text,
  company_name text NOT NULL,
  primary_color text NOT NULL DEFAULT '#2563EB',
  secondary_color text NOT NULL DEFAULT '#7E22CE',
  footer_text text,
  include_timestamp boolean NOT NULL DEFAULT true,
  include_page_numbers boolean NOT NULL DEFAULT true,
  default_template text NOT NULL DEFAULT 'standard',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE pdf_branding_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Super admins can manage all PDF branding settings"
ON pdf_branding_settings
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

CREATE POLICY "Org admins can manage their organization's PDF branding settings"
ON pdf_branding_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = pdf_branding_settings.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = pdf_branding_settings.organization_id
  )
);

CREATE POLICY "Users can view their organization's PDF branding settings"
ON pdf_branding_settings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = pdf_branding_settings.organization_id
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_pdf_branding_settings_updated_at
  BEFORE UPDATE ON pdf_branding_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to get PDF branding settings
CREATE OR REPLACE FUNCTION get_pdf_branding_settings(org_id uuid)
RETURNS TABLE (
  id uuid,
  organization_id uuid,
  logo_url text,
  company_name text,
  primary_color text,
  secondary_color text,
  footer_text text,
  include_timestamp boolean,
  include_page_numbers boolean,
  default_template text
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
    pbs.id,
    pbs.organization_id,
    pbs.logo_url,
    pbs.company_name,
    pbs.primary_color,
    pbs.secondary_color,
    pbs.footer_text,
    pbs.include_timestamp,
    pbs.include_page_numbers,
    pbs.default_template
  FROM pdf_branding_settings pbs
  WHERE pbs.organization_id = org_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_pdf_branding_settings TO authenticated;

-- Insert default settings for existing organizations
INSERT INTO pdf_branding_settings (
  organization_id,
  company_name,
  primary_color,
  secondary_color,
  footer_text,
  default_template
)
SELECT 
  id,
  name,
  '#2563EB',
  '#7E22CE',
  '© ' || EXTRACT(YEAR FROM CURRENT_DATE) || ' ' || name || '. All rights reserved.',
  'standard'
FROM organizations
ON CONFLICT (organization_id) DO NOTHING;