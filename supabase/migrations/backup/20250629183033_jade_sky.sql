/*
  # Support & Consultation Hub

  1. New Types
    - `priority_level` enum: urgent, normal, low
    - `ticket_category` enum: technical_support, training_request, consultation
  
  2. New Tables
    - `support_tickets`: Main ticket information
    - `ticket_messages`: Real-time chat messages
    - `ticket_attachments`: File attachments for tickets
  
  3. Security
    - Enable RLS on all tables
    - Create policies for staff, org admins, and super admins
*/

-- Create enums for ticket priority and category
CREATE TYPE priority_level AS ENUM ('urgent', 'normal', 'low');
CREATE TYPE ticket_category AS ENUM ('technical_support', 'training_request', 'consultation');

-- Support Tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_member_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  description text,
  priority priority_level NOT NULL DEFAULT 'normal',
  category ticket_category NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')),
  assigned_to_id uuid REFERENCES users(id) ON DELETE SET NULL, -- Org Admin or Super Admin
  resolved_at timestamptz,
  closed_at timestamptz,
  satisfaction_rating integer CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ticket Messages table for real-time chat
CREATE TABLE IF NOT EXISTS ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  message_text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Ticket Attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  message_id uuid REFERENCES ticket_messages(id) ON DELETE SET NULL, -- Optional: link to a specific message
  file_name text NOT NULL,
  file_url text NOT NULL, -- URL to Supabase Storage
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for new tables
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
-- Staff members can create and view their own tickets
CREATE POLICY "Staff can manage their own tickets"
ON support_tickets
FOR ALL
TO authenticated
USING (staff_member_id = auth.uid())
WITH CHECK (staff_member_id = auth.uid());

-- Org Admins can view and manage tickets in their organization
CREATE POLICY "Org Admins can manage tickets in their organization"
ON support_tickets
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND u.organization_id = support_tickets.organization_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role = 'org_admin'
    AND u.organization_id = support_tickets.organization_id
  )
);

-- Super Admins can view and manage all tickets
CREATE POLICY "Super Admins can manage all tickets"
ON support_tickets
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

-- RLS Policies for ticket_messages
-- Users can view messages for tickets they are involved in
CREATE POLICY "Users can view messages for their tickets"
ON ticket_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_messages.ticket_id
    AND (st.staff_member_id = auth.uid() OR st.assigned_to_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  )
);

-- Users can send messages to tickets they are involved in
CREATE POLICY "Users can send messages to their tickets"
ON ticket_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_messages.ticket_id
    AND (st.staff_member_id = auth.uid() OR st.assigned_to_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  )
);

-- RLS Policies for ticket_attachments
-- Users can view attachments for tickets they are involved in
CREATE POLICY "Users can view attachments for their tickets"
ON ticket_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_attachments.ticket_id
    AND (st.staff_member_id = auth.uid() OR st.assigned_to_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  )
);

-- Users can add attachments to tickets they are involved in
CREATE POLICY "Users can add attachments to their tickets"
ON ticket_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets st
    WHERE st.id = ticket_attachments.ticket_id
    AND (st.staff_member_id = auth.uid() OR st.assigned_to_id = auth.uid() OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'super_admin'))
  )
);

-- Create triggers for updated_at column
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON support_tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_tickets_staff_member_id ON support_tickets(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to_id ON support_tickets(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON ticket_attachments(message_id);