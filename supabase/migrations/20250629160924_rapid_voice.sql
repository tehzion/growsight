/*
  # Add Subscriber Role and Import/Export Functionality

  1. New Features
    - Add 'subscriber' role to user role constraint
    - Add department management for organizations
    - Add CSV/PDF import functionality
    - Enhance export capabilities

  2. Changes
    - Update user role constraint to include 'subscriber'
    - Add departments table for organization structure
    - Add import_logs table to track imports
    - Add export_logs table to track exports
    - Update RLS policies for new tables
*/

-- Add 'subscriber' role to user role constraint
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_role_check' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;
  
  -- Add new constraint with subscriber role
  ALTER TABLE users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer', 'subscriber'));
END $$;

-- Create departments table for organization structure
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  parent_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Add department_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES departments(id) ON DELETE SET NULL;

-- Create import_logs table
CREATE TABLE IF NOT EXISTS import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'pdf', 'xlsx')),
  import_type text NOT NULL CHECK (import_type IN ('users', 'assessments', 'responses')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_processed integer DEFAULT 0,
  records_created integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create export_logs table
CREATE TABLE IF NOT EXISTS export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  exported_by_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL CHECK (file_type IN ('csv', 'pdf', 'xlsx')),
  export_type text NOT NULL CHECK (export_type IN ('users', 'assessments', 'responses', 'results', 'analytics')),
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_exported integer DEFAULT 0,
  is_anonymized boolean DEFAULT false,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  download_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for departments
CREATE POLICY "Super admins can manage all departments"
ON departments
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

CREATE POLICY "Org admins can manage departments in their organization"
ON departments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = departments.organization_id
    AND has_org_admin_permission(auth.uid(), 'manage_users')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = departments.organization_id
    AND has_org_admin_permission(auth.uid(), 'manage_users')
  )
);

CREATE POLICY "Users can view departments in their organization"
ON departments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.organization_id = departments.organization_id
  )
);

-- Create policies for import_logs
CREATE POLICY "Super admins can view all import logs"
ON import_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Org admins can view import logs for their organization"
ON import_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = import_logs.organization_id
  )
);

CREATE POLICY "Users can view their own import logs"
ON import_logs
FOR SELECT
TO authenticated
USING (imported_by_id = auth.uid());

CREATE POLICY "Super admins can manage import logs"
ON import_logs
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

CREATE POLICY "Org admins can create import logs for their organization"
ON import_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = import_logs.organization_id
  )
);

-- Create policies for export_logs
CREATE POLICY "Super admins can view all export logs"
ON export_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'super_admin'
  )
);

CREATE POLICY "Org admins can view export logs for their organization"
ON export_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = export_logs.organization_id
  )
);

CREATE POLICY "Users can view their own export logs"
ON export_logs
FOR SELECT
TO authenticated
USING (exported_by_id = auth.uid());

CREATE POLICY "Super admins can manage export logs"
ON export_logs
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

CREATE POLICY "Org admins can create export logs for their organization"
ON export_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'org_admin'
    AND users.organization_id = export_logs.organization_id
  )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_import_logs_updated_at
  BEFORE UPDATE ON import_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_logs_updated_at
  BEFORE UPDATE ON export_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to import users from CSV
CREATE OR REPLACE FUNCTION import_users_from_csv(
  p_organization_id uuid,
  p_csv_data text,
  p_department_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  import_id uuid;
  line_count integer := 0;
  success_count integer := 0;
  error_count integer := 0;
  current_line text;
  line_data text[];
  email text;
  first_name text;
  last_name text;
  role text;
  department_id uuid := p_department_id;
  error_message text;
  result json;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (
        role = 'org_admin'
        AND organization_id = p_organization_id
        AND has_org_admin_permission(auth.uid(), 'manage_users')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create import log
  INSERT INTO import_logs (
    organization_id,
    imported_by_id,
    file_name,
    file_type,
    import_type,
    status
  ) VALUES (
    p_organization_id,
    auth.uid(),
    'user_import_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') || '.csv',
    'csv',
    'users',
    'processing'
  ) RETURNING id INTO import_id;

  -- Process CSV data
  BEGIN
    -- Skip header row
    current_line := split_part(p_csv_data, E'\n', 1);
    
    -- Process each line
    FOR i IN 2..regexp_count(p_csv_data, E'\n') + 1 LOOP
      current_line := split_part(p_csv_data, E'\n', i);
      
      -- Skip empty lines
      IF length(trim(current_line)) > 0 THEN
        line_count := line_count + 1;
        
        -- Parse CSV line (simple implementation - in production would use a more robust CSV parser)
        line_data := string_to_array(current_line, ',');
        
        -- Extract data
        email := trim(line_data[1]);
        first_name := trim(line_data[2]);
        last_name := trim(line_data[3]);
        role := trim(line_data[4]);
        
        -- Validate role
        IF role NOT IN ('employee', 'reviewer', 'org_admin', 'subscriber') THEN
          role := 'employee'; -- Default to employee if invalid role
        END IF;
        
        -- Validate email
        IF email !~ '^[^@]+@[^@]+\.[^@]+$' THEN
          error_count := error_count + 1;
          CONTINUE;
        END IF;
        
        -- Check if user already exists
        IF EXISTS (SELECT 1 FROM users WHERE users.email = email) THEN
          -- Update existing user
          UPDATE users
          SET
            first_name = COALESCE(first_name, users.first_name),
            last_name = COALESCE(last_name, users.last_name),
            department_id = COALESCE(department_id, users.department_id),
            updated_at = now()
          WHERE users.email = email
          AND users.organization_id = p_organization_id;
        ELSE
          -- Create new user
          INSERT INTO users (
            email,
            first_name,
            last_name,
            role,
            organization_id,
            department_id,
            requires_password_change
          ) VALUES (
            email,
            first_name,
            last_name,
            role,
            p_organization_id,
            department_id,
            true
          );
        END IF;
        
        success_count := success_count + 1;
      END IF;
    END LOOP;
    
    -- Update import log
    UPDATE import_logs
    SET
      status = 'completed',
      records_processed = line_count,
      records_created = success_count,
      records_failed = error_count,
      completed_at = now()
    WHERE id = import_id;
    
    -- Return result
    SELECT json_build_object(
      'success', true,
      'import_id', import_id,
      'records_processed', line_count,
      'records_created', success_count,
      'records_failed', error_count
    ) INTO result;
    
    RETURN result;
    
  EXCEPTION WHEN OTHERS THEN
    -- Update import log with error
    UPDATE import_logs
    SET
      status = 'failed',
      records_processed = line_count,
      records_created = success_count,
      records_failed = error_count,
      error_message = SQLERRM,
      completed_at = now()
    WHERE id = import_id;
    
    -- Return error
    SELECT json_build_object(
      'success', false,
      'import_id', import_id,
      'error', SQLERRM
    ) INTO result;
    
    RETURN result;
  END;
END;
$$;

-- Create function to export users to CSV
CREATE OR REPLACE FUNCTION export_users_to_csv(
  p_organization_id uuid,
  p_department_id uuid DEFAULT NULL,
  p_include_headers boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  export_id uuid;
  csv_data text := '';
  user_count integer := 0;
  result json;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (
        role = 'org_admin'
        AND organization_id = p_organization_id
        AND has_org_admin_permission(auth.uid(), 'manage_users')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create export log
  INSERT INTO export_logs (
    organization_id,
    exported_by_id,
    file_name,
    file_type,
    export_type,
    status
  ) VALUES (
    p_organization_id,
    auth.uid(),
    'user_export_' || to_char(now(), 'YYYY_MM_DD_HH24_MI_SS') || '.csv',
    'csv',
    'users',
    'processing'
  ) RETURNING id INTO export_id;

  -- Add headers if requested
  IF p_include_headers THEN
    csv_data := csv_data || 'Email,First Name,Last Name,Role,Department' || E'\n';
  END IF;

  -- Generate CSV data
  WITH user_data AS (
    SELECT
      u.email,
      u.first_name,
      u.last_name,
      u.role,
      d.name AS department_name
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    WHERE u.organization_id = p_organization_id
    AND (p_department_id IS NULL OR u.department_id = p_department_id)
    ORDER BY u.last_name, u.first_name
  )
  SELECT
    string_agg(
      email || ',' || 
      first_name || ',' || 
      last_name || ',' || 
      role || ',' || 
      COALESCE(department_name, ''),
      E'\n'
    ),
    COUNT(*)
  INTO csv_data, user_count
  FROM user_data;

  -- Update export log
  UPDATE export_logs
  SET
    status = 'completed',
    records_exported = user_count,
    completed_at = now(),
    download_url = '/api/exports/' || export_id
  WHERE id = export_id;

  -- Return result
  SELECT json_build_object(
    'success', true,
    'export_id', export_id,
    'records_exported', user_count,
    'csv_data', csv_data
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION import_users_from_csv TO authenticated;
GRANT EXECUTE ON FUNCTION export_users_to_csv TO authenticated;

-- Create function to create department
CREATE OR REPLACE FUNCTION create_department(
  p_organization_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_parent_department_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  department_id uuid;
BEGIN
  -- Check permissions
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (
      role = 'super_admin'
      OR (
        role = 'org_admin'
        AND organization_id = p_organization_id
        AND has_org_admin_permission(auth.uid(), 'manage_users')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Check if parent department exists and belongs to the same organization
  IF p_parent_department_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM departments
    WHERE id = p_parent_department_id
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Parent department not found or belongs to a different organization';
  END IF;

  -- Create department
  INSERT INTO departments (
    organization_id,
    name,
    description,
    parent_department_id,
    created_by_id
  ) VALUES (
    p_organization_id,
    p_name,
    p_description,
    p_parent_department_id,
    auth.uid()
  ) RETURNING id INTO department_id;

  RETURN department_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_department TO authenticated;