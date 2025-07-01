# 360° Feedback Platform - Technical Documentation

This document provides technical details about the architecture, database schema, and implementation of the 360° Feedback Platform.

## Architecture Overview

The 360° Feedback Platform is built using a modern web application stack:

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router v6
- **Forms**: React Hook Form with Zod validation
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **API**: Supabase Functions (Edge Functions)
- **Email**: Configurable providers (SMTP, SendGrid, Mailgun, AWS SES)

### Build & Deployment
- **Build Tool**: Vite
- **Deployment**: Netlify or Vercel
- **CI/CD**: Configured via netlify.toml

## Database Schema

### Core Tables

#### organizations
```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_admin_permissions text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### users
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('super_admin', 'org_admin', 'employee', 'reviewer')),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  password_changed_at timestamptz,
  requires_password_change boolean DEFAULT false,
  last_login_at timestamptz,
  phone text,
  department text,
  job_title text,
  location text,
  bio text,
  avatar_url text,
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'MM/DD/YYYY'
);
```

#### assessments
```sql
CREATE TABLE assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assessment_type text DEFAULT 'custom' CHECK (assessment_type IN ('preset', 'custom')),
  is_deletable boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### assessment_sections
```sql
CREATE TABLE assessment_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### assessment_questions
```sql
CREATE TABLE assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES assessment_sections(id) ON DELETE CASCADE,
  text text NOT NULL,
  order integer NOT NULL,
  question_type question_type NOT NULL DEFAULT 'rating',
  scale_max integer CHECK (scale_max >= 2 AND scale_max <= 10),
  is_required boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### question_options
```sql
CREATE TABLE question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES assessment_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  value integer,
  order integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### assessment_organization_assignments
```sql
CREATE TABLE assessment_organization_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assessment_id, organization_id)
);
```

#### user_relationships
```sql
CREATE TABLE user_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, related_user_id, relationship_type)
);
```

#### assessment_assignments
```sql
CREATE TABLE assessment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES assessments(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES users(id) ON DELETE CASCADE,
  relationship_type relationship_type,
  deadline timestamptz,
  assigned_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date timestamptz NOT NULL,
  notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### assessment_responses
```sql
CREATE TABLE assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  question_id uuid REFERENCES assessment_questions(id) ON DELETE CASCADE,
  rating integer,
  text_response text,
  selected_option_id uuid REFERENCES question_options(id) ON DELETE SET NULL,
  comment text,
  respondent_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_response CHECK (
    (rating IS NOT NULL AND text_response IS NULL AND selected_option_id IS NULL) OR
    (rating IS NULL AND text_response IS NOT NULL AND selected_option_id IS NULL) OR
    (rating IS NULL AND text_response IS NULL AND selected_option_id IS NOT NULL)
  )
);
```

#### assessment_progress
```sql
CREATE TABLE assessment_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  section_id uuid REFERENCES assessment_sections(id) ON DELETE CASCADE,
  completed_questions integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  is_completed boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(assignment_id, section_id)
);
```

#### assessment_notifications
```sql
CREATE TABLE assessment_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  notification_type notification_type NOT NULL,
  email_sent boolean DEFAULT false,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

#### pdf_branding_settings
```sql
CREATE TABLE pdf_branding_settings (
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
```

### Custom Types

```sql
CREATE TYPE question_type AS ENUM (
  'rating',
  'multiple_choice',
  'yes_no',
  'text'
);

CREATE TYPE relationship_type AS ENUM (
  'peer',
  'supervisor',
  'team_member'
);

CREATE TYPE notification_type AS ENUM (
  'assignment_created',
  'deadline_reminder',
  'assessment_completed'
);
```

## Row-Level Security (RLS)

The platform uses PostgreSQL's Row-Level Security to enforce data isolation and access control at the database level.

### Example RLS Policies

#### For organizations table
```sql
-- Super admins can manage all organizations
CREATE POLICY "Super admins can manage organizations"
ON organizations
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

-- Users can view their own organization
CREATE POLICY "Users can view their organizations"
ON organizations
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id
    FROM users
    WHERE users.id = auth.uid()
  )
);
```

#### For assessment_responses table
```sql
-- Users can manage their own responses
CREATE POLICY "Users can manage their own responses"
ON assessment_responses
FOR ALL
TO authenticated
USING (respondent_id = auth.uid())
WITH CHECK (respondent_id = auth.uid());

-- Employees can view responses for their assessments
CREATE POLICY "Employees can view responses for their assessments"
ON assessment_responses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM assessment_assignments aa
    WHERE aa.id = assessment_responses.assignment_id
    AND aa.employee_id = auth.uid()
    AND aa.status = 'completed'
  )
);
```

## Database Functions

The platform uses PostgreSQL functions for complex operations with proper access control.

### Example Functions

#### get_anonymized_results
```sql
CREATE OR REPLACE FUNCTION get_anonymized_results(org_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Check if user has permission to view these results
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND (
      role = 'super_admin' 
      OR (role = 'org_admin' AND organization_id = org_id)
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get anonymized results
  SELECT json_agg(
    json_build_object(
      'section_id', s.id,
      'section_title', s.title,
      'questions', (
        SELECT json_agg(
          json_build_object(
            'id', q.id,
            'text', q.text,
            'avg_rating', COALESCE(AVG(ar.rating), 0),
            'response_count', COUNT(ar.id)
          )
        )
        FROM assessment_questions q
        LEFT JOIN assessment_responses ar ON ar.question_id = q.id
        LEFT JOIN assessment_assignments aa ON aa.id = ar.assignment_id
        LEFT JOIN assessments a ON a.id = aa.assessment_id
        WHERE q.section_id = s.id
        AND a.organization_id = org_id
        GROUP BY q.id
      )
    )
  )
  INTO result
  FROM assessment_sections s
  JOIN assessments a ON a.id = s.assessment_id
  WHERE a.organization_id = org_id;

  RETURN result;
END;
$$;
```

#### has_org_admin_permission
```sql
CREATE OR REPLACE FUNCTION has_org_admin_permission(
  user_id uuid,
  permission text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
  user_org_id uuid;
  org_permissions text[];
BEGIN
  -- Get user role and organization
  SELECT role, organization_id INTO user_role, user_org_id
  FROM users
  WHERE id = user_id;
  
  -- Super admins always have all permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Only check for org admins
  IF user_role != 'org_admin' THEN
    RETURN false;
  END IF;
  
  -- Get organization permissions
  SELECT org_admin_permissions INTO org_permissions
  FROM organizations
  WHERE id = user_org_id;
  
  -- Check if permission exists in array
  RETURN permission = ANY(org_permissions);
END;
$$;
```

## Frontend Architecture

### State Management

The application uses Zustand for state management with the following stores:

#### authStore
Manages authentication state, user information, and login/logout functionality.

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setNewPassword: (token: string, password: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}
```

#### organizationStore
Manages organizations and their settings.

```typescript
interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  error: string | null;
  fetchOrganizations: () => Promise<void>;
  createOrganization: (name: string) => Promise<void>;
  updateOrganization: (id: string, name: string) => Promise<void>;
  deleteOrganization: (id: string) => Promise<void>;
  setCurrentOrganization: (id: string) => void;
  updateOrgAdminPermissions: (orgId: string, permissions: OrgAdminPermission[]) => Promise<void>;
}
```

#### assessmentStore
Manages assessment templates and their structure.

```typescript
interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  publishedAssessments: Assessment[];
  userAssessments: Assessment[];
  isLoading: boolean;
  error: string | null;
  fetchAssessments: (organizationId?: string) => Promise<void>;
  fetchAssessment: (id: string) => Promise<void>;
  fetchUserAssessments: (userId: string) => Promise<void>;
  createAssessment: (data: Omit<Assessment, 'id' | 'sections' | 'createdAt' | 'updatedAt'>) => Promise<string | undefined>;
  updateAssessment: (id: string, data: Partial<Omit<Assessment, 'sections'>>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  addSection: (assessmentId: string, section: Omit<AssessmentSection, 'id' | 'questions'>) => Promise<void>;
  updateSection: (assessmentId: string, sectionId: string, data: Partial<Omit<AssessmentSection, 'questions'>>) => Promise<void>;
  deleteSection: (assessmentId: string, sectionId: string) => Promise<void>;
  addQuestion: (assessmentId: string, sectionId: string, question: Omit<AssessmentQuestion, 'id'>) => Promise<void>;
  updateQuestion: (assessmentId: string, sectionId: string, questionId: string, data: Partial<AssessmentQuestion>) => Promise<void>;
  deleteQuestion: (assessmentId: string, sectionId: string, questionId: string) => Promise<void>;
  assignUsers: (assessmentId: string, employeeIds: string[], reviewerIds: string[]) => Promise<void>;
  assignOrganizations: (assessmentId: string, organizationIds: string[]) => Promise<void>;
}
```

### Component Structure

The application follows a component-based architecture:

```
src/
├── components/
│   ├── assessments/       # Assessment-related components
│   ├── assignments/       # Assignment-related components
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components
│   ├── relationships/     # Relationship management components
│   ├── results/           # Results visualization components
│   └── ui/                # Reusable UI components
├── pages/
│   ├── admin/             # Admin pages
│   ├── auth/              # Authentication pages
│   └── user/              # User pages
├── stores/                # Zustand stores
├── services/              # Service layer
├── lib/                   # Utility functions
├── types/                 # TypeScript type definitions
└── config/                # Configuration
```

## Email Service

The platform includes a flexible email service that supports multiple providers:

```typescript
export class EmailService {
  // Email Templates
  private getTemplate(type: string, data: Record<string, any>): EmailTemplate {
    // Templates for different notification types
  }

  // Send methods for different notification types
  async sendAssignmentNotification(data: {...}): Promise<{success: boolean}> {...}
  async sendDeadlineReminder(data: {...}): Promise<{success: boolean}> {...}
  async sendCompletionNotification(data: {...}): Promise<{success: boolean}> {...}
  async sendPasswordReset(data: {...}): Promise<{success: boolean}> {...}
  async sendWelcomeEmail(data: {...}): Promise<{success: boolean}> {...}
  async sendTestEmail(email: string): Promise<{success: boolean; message: string}> {...}

  // Provider-specific implementations
  private async sendWithSMTP(notification: EmailNotification, template: EmailTemplate) {...}
  private async sendWithSendGrid(notification: EmailNotification, template: EmailTemplate) {...}
  private async sendWithMailgun(notification: EmailNotification, template: EmailTemplate) {...}
  private async sendWithAWSSES(notification: EmailNotification, template: EmailTemplate) {...}

  // Utility methods
  async testSMTPConnection(config: SMTPConfig): Promise<{success: boolean; message: string}> {...}
  private isValidEmail(email: string): boolean {...}
  async sendBulkEmails(notifications: EmailNotification[], batchSize: number = 10) {...}
}
```

## PDF Export System

The platform includes a PDF export system with customizable branding:

```typescript
interface PDFExportState {
  isExporting: boolean;
  exportProgress: number;
  error: string | null;
  pdfSettings: {
    logoUrl: string;
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    footerText: string;
    includeTimestamp: boolean;
    includePageNumbers: boolean;
    defaultTemplate: string;
  };
  exportAnalytics: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  exportResults: (format: 'pdf' | 'csv', userId?: string, anonymized?: boolean) => Promise<string>;
  exportAssessments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  exportAssignments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  updatePDFSettings: (settings: Partial<PDFExportState['pdfSettings']>) => void;
  clearError: () => void;
}
```

## Environment Configuration

The application uses environment variables for configuration:

```typescript
export interface AppConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  email: {
    provider: 'sendgrid' | 'mailgun' | 'aws-ses' | 'smtp' | 'demo';
    apiKey: string;
    fromEmail: string;
    fromName: string;
    // Provider-specific settings
  };
  app: {
    name: string;
    url: string;
    supportEmail: string;
    environment: 'development' | 'staging' | 'production';
    version: string;
  };
  features: {
    emailNotifications: boolean;
    pdfExports: boolean;
    analytics: boolean;
    realTimeUpdates: boolean;
    advancedReporting: boolean;
  };
  security: {
    sessionTimeout: number;
    maxFileSize: number;
    passwordMinLength: number;
    maxLoginAttempts: number;
  };
  performance: {
    cacheTimeout: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
}
```

## API Integration

### Supabase Client

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

export const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
                         !import.meta.env.VITE_SUPABASE_ANON_KEY || 
                         supabaseUrl === 'https://demo.supabase.co' || 
                         supabaseAnonKey === 'demo-key';

let supabase: any = null;

if (!isDemoMode) {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      },
      // Additional configuration
    });
  } catch (error) {
    console.warn('Supabase client creation failed, running in demo mode:', error);
    supabase = null;
  }
}

export { supabase };
```

## Error Handling

The application includes comprehensive error handling:

```typescript
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  // Authentication errors
  if (error?.code === 'invalid_credentials') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (error?.code === 'email_not_confirmed') {
    return 'Please check your email and click the confirmation link before signing in.';
  }
  
  // Database errors
  if (error?.code === '23505') {
    return 'This record already exists. Please use different values.';
  }
  
  if (error?.code === '42501') {
    return 'You do not have permission to perform this action.';
  }
  
  // Generic fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
};
```

## Testing

The application includes unit tests for components and functionality:

```typescript
// Example test for Button component
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import Button from '../Button';

describe('Button', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Deployment

### Netlify Configuration

```toml
[build]
  publish = "dist"
  command = "npm run build:staging"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[context.production]
  command = "npm run build"

[context.staging]
  command = "npm run build:staging"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

## Security Considerations

### Authentication
- Email/password authentication
- OTP (One-Time Password) support
- Password reset functionality
- Session management with auto-refresh

### Data Protection
- Row-Level Security (RLS) for data isolation
- Function-based access control
- Input validation and sanitization
- Secure password handling

### Privacy
- Anonymized reviewer feedback
- Aggregated results for organization-level reporting
- Privacy controls for individual responses
- Data isolation between organizations

## Performance Optimization

- Code splitting for optimized loading
- Lazy loading of components
- Efficient state management with Zustand
- Optimized database queries with proper indexing
- Caching strategies for frequently accessed data