export type Role = 'super_admin' | 'org_admin' | 'employee' | 'reviewer' | 'subscriber';

export type QuestionType = 'rating' | 'multiple_choice' | 'yes_no' | 'text';

export type AssessmentType = 'preset' | 'custom';

export type RelationshipType = 'peer' | 'supervisor' | 'team_member';

export type NotificationType = 'assignment_created' | 'deadline_reminder' | 'assessment_completed';

export type OrgAdminPermission = 'create_assessments' | 'manage_users' | 'view_results' | 'assign_assessments' | 'manage_relationships';

export type PriorityLevel = 'urgent' | 'normal' | 'low';

export type TicketCategory = 'technical_support' | 'training_request' | 'consultation';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'escalated';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  phone?: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  dateFormat?: string;
  lastLoginAt?: string;
  requiresPasswordChange?: boolean;
  requiresPasswordChange?: boolean;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  parentDepartmentId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  orgAdminPermissions?: OrgAdminPermission[];
  status?: 'active' | 'inactive' | 'suspended';
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  industry?: string;
  size?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  autoTransitionEnabled?: boolean;
  gracePeriodDays?: number;
}

export interface UserRelationship {
  id: string;
  userId: string;
  relatedUserId: string;
  relationshipType: RelationshipType;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  relatedUser?: User;
  notes?: string;
  status?: 'active' | 'inactive';
}

export interface Competency {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  text: string;
  value?: number;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  order: number;
  questionType: QuestionType;
  scaleMax?: number;
  isRequired: boolean;
  options?: QuestionOption[];
  helpText?: string;
  tags?: string[];
  competencyIds?: string[];
  competencies?: Competency[];
}

export interface AssessmentSection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: AssessmentQuestion[];
  isRequired?: boolean;
  estimatedTimeMinutes?: number;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  assessmentType?: AssessmentType;
  isDeletable?: boolean;
  sections: AssessmentSection[];
  assignedOrganizations?: Organization[];
  status?: 'draft' | 'published' | 'archived';
  tags?: string[];
  category?: string;
  estimatedTimeMinutes?: number;
  version?: string;
  isGlobal?: boolean;
  assessmentStartDate?: string;
  assessmentEndDate?: string;
  setByOrgAdmin?: boolean;
  setBySuper?: boolean;
}

export interface AssessmentProgress {
  id: string;
  assignmentId: string;
  sectionId: string;
  completedQuestions: number;
  totalQuestions: number;
  isCompleted: boolean;
  lastUpdatedAt: string;
  createdAt: string;
  updatedAt: string;
  timeSpentSeconds?: number;
}

export interface AssessmentAssignment {
  id: string;
  assessmentId: string;
  employeeId: string;
  reviewerId: string;
  relationshipType?: RelationshipType;
  deadline?: string;
  assignedById?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  notificationSent?: boolean;
  progress?: AssessmentProgress[];
  createdAt: string;
  updatedAt: string;
  assessment?: Assessment;
  employee?: User;
  reviewer?: User;
  assignedBy?: User;
  remindersSent?: number;
  lastReminderSentAt?: string;
  completedAt?: string;
  startedAt?: string;
}

export interface AssessmentNotification {
  id: string;
  assignmentId: string;
  userId: string;
  notificationType: NotificationType;
  emailSent: boolean;
  sentAt?: string;
  createdAt: string;
  assignment?: AssessmentAssignment;
  readAt?: string;
  status?: 'pending' | 'sent' | 'failed' | 'read';
  retryCount?: number;
}

export interface AssessmentResponse {
  id: string;
  assignmentId: string;
  questionId: string;
  rating?: number;
  textResponse?: string;
  selectedOptionId?: string;
  comment?: string;
  respondentId: string;
  createdAt: string;
  updatedAt: string;
  timeSpentSeconds?: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface AssessmentResult {
  sectionId: string;
  sectionTitle: string;
  questions: {
    id: string;
    text: string;
    selfRating: number;
    avgReviewerRating: number;
    gap: number;
    alignment: 'aligned' | 'blind_spot' | 'hidden_strength';
    comments: string[];
    reviewerCount?: number;
    minReviewerRating?: number;
    maxReviewerRating?: number;
    standardDeviation?: number;
    competencies?: { id: string; name: string }[];
  }[];
  selfAverage: number;
  reviewerAverage: number;
  overallGap: number;
  overallAlignment: 'aligned' | 'blind_spot' | 'hidden_strength';
  completedAt?: string;
  reviewerCount?: number;
  competencyResults?: {
    competencyId: string;
    competencyName: string;
    selfAverage: number;
    reviewerAverage: number;
    gap: number;
    alignment: 'aligned' | 'blind_spot' | 'hidden_strength';
  }[];
}

export interface DashboardAnalytics {
  organizationId: string;
  organizationName: string;
  totalEmployees: number;
  totalReviewers: number;
  totalAssessments: number;
  completedAssessments: number;
  pendingAssessments: number;
  inProgressAssessments: number;
  averageRating: number;
  totalResponses: number;
  completionRate?: number;
  averageCompletionTime?: number;
  participationRate?: number;
  competencyAnalytics?: {
    competencyId: string;
    competencyName: string;
    averageRating: number;
    assessmentCount: number;
  }[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  organizationId: string;
}

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  organizationName: string;
}

export interface UserActivity {
  id: string;
  userId: string;
  activityType: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface UserPreferences {
  id: string;
  userId: string;
  emailAssignments: boolean;
  emailReminders: boolean;
  emailResults: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  createdAt: string;
  updatedAt: string;
  notificationFrequency?: 'immediate' | 'daily' | 'weekly';
  dashboardLayout?: 'default' | 'compact' | 'detailed';
}

export interface SystemSettings {
  id: string;
  settingKey: string;
  settingValue: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  category: string;
  isPublic: boolean;
}

export interface AccessRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  requestedRole: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  approvedById?: string;
  approvedAt?: string;
  rejectionReason?: string;
}

export interface ImportLog {
  id: string;
  organizationId: string;
  importedById: string;
  fileName: string;
  fileType: 'csv' | 'pdf' | 'xlsx';
  importType: 'users' | 'assessments' | 'responses';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportLog {
  id: string;
  organizationId: string;
  exportedById: string;
  fileName: string;
  fileType: 'csv' | 'pdf' | 'xlsx';
  exportType: 'users' | 'assessments' | 'responses' | 'results' | 'analytics';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordsExported: number;
  isAnonymized: boolean;
  errorMessage?: string;
  startedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  staffMemberId: string;
  organizationId: string;
  subject: string;
  description?: string;
  priority: PriorityLevel;
  category: TicketCategory;
  status: TicketStatus;
  assignedToId?: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
  createdAt: string;
  updatedAt: string;
  staffMember?: User;
  assignedTo?: User;
  messages?: TicketMessage[];
  attachments?: TicketAttachment[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  messageText: string;
  createdAt: string;
  sender?: User;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  messageId?: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
}

export interface Tag {
  id: string;
  name: string;
  category: 'strength' | 'development' | 'insight' | 'behavior' | 'skill' | 'performance' | 'custom';
  color?: string;
  description?: string;
  organizationId?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  isSystemTag?: boolean;
}

export interface UserTag {
  id: string;
  userId: string;
  tagId: string;
  assignedById: string;
  assignedAt: string;
  confidence?: number; // 0-100, how confident the system is about this tag
  source: 'manual' | 'ai_analysis' | 'assessment' | 'performance_review' | 'peer_feedback';
  metadata?: {
    assessmentId?: string;
    competencyId?: string;
    rating?: number;
    context?: string;
    evidence?: string[];
  };
  tag?: Tag;
  assignedBy?: User;
}

export interface OrganizationTag {
  id: string;
  organizationId: string;
  tagId: string;
  assignedById: string;
  assignedAt: string;
  confidence?: number;
  source: 'manual' | 'ai_analysis' | 'performance_metrics' | 'industry_analysis';
  metadata?: {
    metricValue?: number;
    benchmark?: number;
    trend?: 'improving' | 'declining' | 'stable';
    context?: string;
    evidence?: string[];
  };
  tag?: Tag;
  assignedBy?: User;
}

export interface TagInsight {
  id: string;
  tagId: string;
  userId?: string;
  organizationId?: string;
  insightType: 'strength_development' | 'performance_trend' | 'comparison' | 'recommendation' | 'risk_alert';
  title: string;
  description: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  metadata?: {
    relatedTags?: string[];
    impactScore?: number;
    actionItems?: string[];
    timeline?: string;
  };
}

export interface SystemMetrics {
  id: string;
  metricKey: string;
  metricValue: number;
  metricUnit?: string;
  category: 'performance' | 'security' | 'usage' | 'health' | 'business';
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  id: string;
  status: 'healthy' | 'warning' | 'critical' | 'maintenance';
  component: string;
  message: string;
  timestamp: string;
  duration?: number;
  resolution?: string;
}

export interface RootDashboardData {
  systemMetrics: SystemMetrics[];
  systemHealth: SystemHealth[];
  globalAnalytics: {
    totalOrganizations: number;
    totalUsers: number;
    totalAssessments: number;
    activeAssessments: number;
    systemUptime: number;
    averageResponseTime: number;
    storageUsage: number;
    bandwidthUsage: number;
  };
  recentActivity: {
    userRegistrations: number;
    assessmentCompletions: number;
    systemAlerts: number;
    supportTickets: number;
  };
  topInsights: TagInsight[];
  criticalAlerts: SystemHealth[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables?: string[];
  organization_id: string;
  created_at: string;
  updated_at: string;
  template_data?: Record<string, unknown>;
  recipient_email?: string;
  recipient_name?: string;
}