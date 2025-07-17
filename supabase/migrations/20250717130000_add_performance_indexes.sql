-- =====================================================================================
-- ADD PERFORMANCE INDEXES FOR DATABASE OPTIMIZATION
-- This migration adds indexes to improve query performance for common operations
-- =====================================================================================

-- =====================================================================================
-- ORGANIZATIONS TABLE INDEXES
-- =====================================================================================

-- Index for organization status queries
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at DESC);

-- =====================================================================================
-- USERS TABLE INDEXES
-- =====================================================================================

-- Index for user role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_org ON users(role, organization_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- Manager relationship index
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);

-- =====================================================================================
-- ASSESSMENTS TABLE INDEXES
-- =====================================================================================

-- Index for assessment organization queries
CREATE INDEX IF NOT EXISTS idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_creator_id ON assessments(creator_id);
CREATE INDEX IF NOT EXISTS idx_assessments_published ON assessments(is_published);
CREATE INDEX IF NOT EXISTS idx_assessments_org_published ON assessments(organization_id, is_published);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assessments_updated_at ON assessments(updated_at DESC);

-- =====================================================================================
-- ASSESSMENT SECTIONS TABLE INDEXES
-- =====================================================================================

-- Index for assessment section queries
CREATE INDEX IF NOT EXISTS idx_assessment_sections_assessment_id ON assessment_sections(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_sections_order ON assessment_sections(assessment_id, order_index);

-- =====================================================================================
-- ASSESSMENT QUESTIONS TABLE INDEXES
-- =====================================================================================

-- Index for assessment question queries
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section_id ON assessment_questions(section_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_order ON assessment_questions(section_id, order_index);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON assessment_questions(question_type);

-- =====================================================================================
-- QUESTION OPTIONS TABLE INDEXES
-- =====================================================================================

-- Index for question option queries
CREATE INDEX IF NOT EXISTS idx_question_options_question_id ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_question_options_order ON question_options(question_id, order_index);

-- =====================================================================================
-- ASSESSMENT ASSIGNMENTS TABLE INDEXES
-- =====================================================================================

-- Index for assignment queries
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_employee_id ON assessment_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assessment_id ON assessment_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_status ON assessment_assignments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_date ON assessment_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_assigned_by ON assessment_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_created_at ON assessment_assignments(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_employee_status ON assessment_assignments(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_assignments_due_soon ON assessment_assignments(due_date, status) WHERE status IN ('assigned', 'in_progress');

-- =====================================================================================
-- ASSESSMENT RESPONSES TABLE INDEXES
-- =====================================================================================

-- Index for response queries
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assignment_id ON assessment_responses(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON assessment_responses(question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_respondent_id ON assessment_responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_created_at ON assessment_responses(created_at DESC);

-- Composite indexes for analytics
CREATE INDEX IF NOT EXISTS idx_assessment_responses_assignment_question ON assessment_responses(assignment_id, question_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_respondent_assignment ON assessment_responses(respondent_id, assignment_id);

-- =====================================================================================
-- ASSESSMENT PROGRESS TABLE INDEXES
-- =====================================================================================

-- Index for progress tracking
CREATE INDEX IF NOT EXISTS idx_assessment_progress_assignment_id ON assessment_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_progress_section_id ON assessment_progress(section_id);
CREATE INDEX IF NOT EXISTS idx_assessment_progress_completed ON assessment_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_assessment_progress_updated_at ON assessment_progress(updated_at DESC);

-- =====================================================================================
-- USER RELATIONSHIPS TABLE INDEXES
-- =====================================================================================

-- Index for relationship queries
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_id ON user_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_related_user_id ON user_relationships(related_user_id);
CREATE INDEX IF NOT EXISTS idx_user_relationships_type ON user_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_user_relationships_created_by ON user_relationships(created_by);

-- Composite indexes for relationship lookups
CREATE INDEX IF NOT EXISTS idx_user_relationships_user_type ON user_relationships(user_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_user_relationships_bidirectional ON user_relationships(user_id, related_user_id);

-- =====================================================================================
-- USER PREFERENCES TABLE INDEXES
-- =====================================================================================

-- Index for user preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =====================================================================================
-- USER SESSIONS TABLE INDEXES
-- =====================================================================================

-- Index for session management
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = true;

-- =====================================================================================
-- USER ACTIVITY LOG TABLE INDEXES
-- =====================================================================================

-- Index for activity tracking
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action ON user_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_ip_address ON user_activity_log(ip_address);

-- Composite indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_action ON user_activity_log(user_id, action);
CREATE INDEX IF NOT EXISTS idx_user_activity_log_action_date ON user_activity_log(action, created_at DESC);

-- =====================================================================================
-- ACCESS REQUESTS TABLE INDEXES
-- =====================================================================================

-- Index for access request management
CREATE INDEX IF NOT EXISTS idx_access_requests_organization_id ON access_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON access_requests(email);
CREATE INDEX IF NOT EXISTS idx_access_requests_created_at ON access_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_approved_by ON access_requests(approved_by);

-- Composite indexes for filtering
CREATE INDEX IF NOT EXISTS idx_access_requests_org_status ON access_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_access_requests_pending ON access_requests(status, created_at DESC) WHERE status = 'pending';

-- =====================================================================================
-- ASSESSMENT ORGANIZATION ASSIGNMENTS TABLE INDEXES
-- =====================================================================================

-- Index for organization assignments
CREATE INDEX IF NOT EXISTS idx_assessment_org_assignments_assessment_id ON assessment_organization_assignments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_org_assignments_organization_id ON assessment_organization_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_org_assignments_assigned_by ON assessment_organization_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_assessment_org_assignments_created_at ON assessment_organization_assignments(created_at DESC);

-- =====================================================================================
-- SUPPORT TICKETS TABLE INDEXES
-- =====================================================================================

-- Index for support ticket queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester_id ON support_tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_staff_member_id ON support_tickets(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_updated_at ON support_tickets(updated_at DESC);

-- Composite indexes for filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_status ON support_tickets(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_staff_status ON support_tickets(staff_member_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_open ON support_tickets(status, created_at DESC) WHERE status IN ('open', 'in_progress');

-- =====================================================================================
-- TICKET MESSAGES TABLE INDEXES
-- =====================================================================================

-- Index for ticket message queries
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_sender_id ON ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON ticket_messages(created_at DESC);

-- Composite indexes for message threading
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_date ON ticket_messages(ticket_id, created_at DESC);

-- =====================================================================================
-- TICKET ATTACHMENTS TABLE INDEXES
-- =====================================================================================

-- Index for ticket attachment queries
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_message_id ON ticket_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_created_at ON ticket_attachments(created_at DESC);

-- =====================================================================================
-- ASSESSMENT NOTIFICATIONS TABLE INDEXES
-- =====================================================================================

-- Index for notification queries
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_user_id ON assessment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_type ON assessment_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_status ON assessment_notifications(status);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_scheduled_for ON assessment_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_created_at ON assessment_notifications(created_at DESC);

-- Composite indexes for notification processing
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_user_status ON assessment_notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_assessment_notifications_pending ON assessment_notifications(status, scheduled_for) WHERE status = 'pending';

-- =====================================================================================
-- ORGANIZATION STATUS LOG TABLE INDEXES
-- =====================================================================================

-- Index for organization status tracking
CREATE INDEX IF NOT EXISTS idx_organization_status_log_organization_id ON organization_status_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_status_log_created_at ON organization_status_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_organization_status_log_changed_by ON organization_status_log(changed_by);

-- =====================================================================================
-- ORGANIZATION PERIODS TABLE INDEXES
-- =====================================================================================

-- Index for organization period queries
CREATE INDEX IF NOT EXISTS idx_organization_periods_organization_id ON organization_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_periods_start_date ON organization_periods(period_start_date);
CREATE INDEX IF NOT EXISTS idx_organization_periods_end_date ON organization_periods(period_end_date);
CREATE INDEX IF NOT EXISTS idx_organization_periods_created_by ON organization_periods(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_periods_created_at ON organization_periods(created_at DESC);

-- Composite indexes for period management
CREATE INDEX IF NOT EXISTS idx_organization_periods_dates ON organization_periods(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_organization_periods_org_dates ON organization_periods(organization_id, period_start_date, period_end_date);

-- =====================================================================================
-- FULL TEXT SEARCH INDEXES
-- =====================================================================================

-- Full text search for assessments
CREATE INDEX IF NOT EXISTS idx_assessments_search ON assessments USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Full text search for support tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_search ON support_tickets USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Full text search for users
CREATE INDEX IF NOT EXISTS idx_users_search ON users USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(email, '')));

-- =====================================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- =====================================================================================

-- Active users only
CREATE INDEX IF NOT EXISTS idx_users_active_by_org ON users(organization_id, role) WHERE is_active = true;

-- Published assessments only
CREATE INDEX IF NOT EXISTS idx_assessments_published_by_org ON assessments(organization_id, created_at DESC) WHERE is_published = true;

-- Pending assignments only
CREATE INDEX IF NOT EXISTS idx_assignments_pending ON assessment_assignments(employee_id, due_date) WHERE status IN ('assigned', 'in_progress');

-- Open support tickets only
CREATE INDEX IF NOT EXISTS idx_tickets_open_by_org ON support_tickets(organization_id, priority, created_at DESC) WHERE status IN ('open', 'in_progress');

-- =====================================================================================
-- VALIDATION COMMENT
-- =====================================================================================

-- This migration adds comprehensive indexes to improve query performance for:
-- 1. Organization-based data filtering (multi-tenant isolation)
-- 2. User role and relationship queries
-- 3. Assessment workflow operations
-- 4. Support ticket management
-- 5. Audit trail and activity tracking
-- 6. Full text search capabilities
-- 7. Common filter operations with partial indexes

COMMENT ON INDEX idx_users_role_org IS 'Optimizes user queries by role within organizations';
COMMENT ON INDEX idx_assessments_org_published IS 'Optimizes published assessment queries per organization';
COMMENT ON INDEX idx_assignments_pending IS 'Optimizes pending assignment queries for dashboard';
COMMENT ON INDEX idx_tickets_open_by_org IS 'Optimizes open ticket queries for support dashboard';