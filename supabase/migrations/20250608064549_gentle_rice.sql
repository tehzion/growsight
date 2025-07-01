/*
  # Relationship-based Assessment System

  1. New Tables
    - `assessment_assignments` - Enhanced with relationship types and deadlines
    - `user_relationships` - Define peer, supervisor, team member relationships
    - `assessment_notifications` - Track email notifications

  2. Enhanced Features
    - Relationship-based assignments (peer, supervisor, team_member)
    - Deadline management for assessments
    - Email notification tracking
    - Restricted org admin permissions (assignment only, no editing)

  3. Security
    - Enhanced RLS policies for relationship-based access
    - Org admin restrictions for assessment management
*/

-- Create enum for relationship types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relationship_type') THEN
    CREATE TYPE relationship_type AS ENUM ('peer', 'supervisor', 'team_member');
  END IF;
END $$;

-- Create enum for notification types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM ('assignment_created', 'deadline_reminder', 'assessment_completed');
  END IF;
END $$;

-- Create user relationships table
CREATE TABLE IF NOT EXISTS user_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, related_user_id, relationship_type)
);

-- Enable RLS on user_relationships
ALTER TABLE user_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for user_relationships
CREATE POLICY "Org admins can manage relationships in their organization"
ON user_relationships
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u1, users u2, users admin
    WHERE u1.id = user_relationships.user_id
    AND u2.id = user_relationships.related_user_id
    AND admin.id = auth.uid()
    AND admin.role = 'org_admin'
    AND admin.organization_id = u1.organization_id
    AND admin.organization_id = u2.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u1, users u2, users admin
    WHERE u1.id = user_relationships.user_id
    AND u2.id = user_relationships.related_user_id
    AND admin.id = auth.uid()
    AND admin.role = 'org_admin'
    AND admin.organization_id = u1.organization_id
    AND admin.organization_id = u2.organization_id
  )
);

CREATE POLICY "Super admins can manage all relationships"
ON user_relationships
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

CREATE POLICY "Users can view their relationships"
ON user_relationships
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR related_user_id = auth.uid()
);

-- Add relationship type and deadline to assessment_assignments
ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS relationship_type relationship_type;
ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS deadline timestamptz;
ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS assigned_by_id uuid REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE assessment_assignments ADD COLUMN IF NOT EXISTS notification_sent boolean DEFAULT false;

-- Create assessment notifications table
CREATE TABLE IF NOT EXISTS assessment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on assessment_notifications
ALTER TABLE assessment_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for assessment_notifications
CREATE POLICY "Users can view their own notifications"
ON assessment_notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage notifications"
ON assessment_notifications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('super_admin', 'org_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('super_admin', 'org_admin')
  )
);

-- Update assessment_assignments policies to include relationship-based access
DROP POLICY IF EXISTS "Org admins can manage assessment assignments in their organization" ON assessment_assignments;

CREATE POLICY "Org admins can create assessment assignments in their organization"
ON assessment_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
);

CREATE POLICY "Org admins can view assessment assignments in their organization"
ON assessment_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
);

CREATE POLICY "Org admins can update assignment status in their organization"
ON assessment_assignments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    JOIN assessments a ON a.organization_id = u.organization_id
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND a.id = assessment_assignments.assessment_id
  )
);

-- Function to create assessment assignment with notification
CREATE OR REPLACE FUNCTION create_assessment_assignment(
  p_assessment_id uuid,
  p_employee_id uuid,
  p_reviewer_id uuid,
  p_relationship_type relationship_type,
  p_deadline timestamptz,
  p_assigned_by_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assignment_id uuid;
  notification_id uuid;
BEGIN
  -- Create the assignment
  INSERT INTO assessment_assignments (
    assessment_id,
    employee_id,
    reviewer_id,
    relationship_type,
    deadline,
    assigned_by_id,
    status
  ) VALUES (
    p_assessment_id,
    p_employee_id,
    p_reviewer_id,
    p_relationship_type,
    p_deadline,
    p_assigned_by_id,
    'pending'
  ) RETURNING id INTO assignment_id;

  -- Create notification for employee
  INSERT INTO assessment_notifications (
    assignment_id,
    user_id,
    notification_type
  ) VALUES (
    assignment_id,
    p_employee_id,
    'assignment_created'
  );

  -- Create notification for reviewer
  INSERT INTO assessment_notifications (
    assignment_id,
    user_id,
    notification_type
  ) VALUES (
    assignment_id,
    p_reviewer_id,
    'assignment_created'
  );

  RETURN assignment_id;
END;
$$;

-- Function to send deadline reminders
CREATE OR REPLACE FUNCTION send_deadline_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create reminder notifications for assignments due in 3 days
  INSERT INTO assessment_notifications (assignment_id, user_id, notification_type)
  SELECT 
    aa.id,
    aa.employee_id,
    'deadline_reminder'::notification_type
  FROM assessment_assignments aa
  WHERE aa.deadline <= (now() + interval '3 days')
    AND aa.deadline > now()
    AND aa.status != 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM assessment_notifications an
      WHERE an.assignment_id = aa.id
        AND an.user_id = aa.employee_id
        AND an.notification_type = 'deadline_reminder'
        AND an.created_at > (now() - interval '1 day')
    );

  -- Create reminder notifications for reviewers
  INSERT INTO assessment_notifications (assignment_id, user_id, notification_type)
  SELECT 
    aa.id,
    aa.reviewer_id,
    'deadline_reminder'::notification_type
  FROM assessment_assignments aa
  WHERE aa.deadline <= (now() + interval '3 days')
    AND aa.deadline > now()
    AND aa.status != 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM assessment_notifications an
      WHERE an.assignment_id = aa.id
        AND an.user_id = aa.reviewer_id
        AND an.notification_type = 'deadline_reminder'
        AND an.created_at > (now() - interval '1 day')
    );
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_related_user_id ON user_relationships(related_user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_type ON user_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_deadline ON assessment_assignments(deadline);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_relationship_type ON assessment_assignments(relationship_type);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_user_id ON assessment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_type ON assessment_notifications(notification_type);

-- Update triggers
CREATE TRIGGER update_user_relationships_updated_at
  BEFORE UPDATE ON user_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_assessment_assignment TO authenticated;
GRANT EXECUTE ON FUNCTION send_deadline_reminders TO authenticated;