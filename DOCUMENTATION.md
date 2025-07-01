# 360° Feedback Platform Documentation

## System Overview

The 360° Feedback Platform is a comprehensive solution for organizations to conduct structured feedback assessments with multiple question types, progress tracking, and detailed reporting. The platform supports multi-organization deployments with role-based access control and granular permissions.

## Role-Based Access Control

### Super Admin
Super Admins have full system access and can:
- Create and manage organizations
- Configure system-wide settings
- Create preset assessments available to all organizations
- Manage all users across the system
- View system-wide analytics and reports
- Access system health monitoring
- Manage access requests
- Configure organization admin permissions

### Organization Admin
Organization Admins manage their specific organization with permissions that can be configured by Super Admins:
- **create_assessments**: Create and modify custom assessments
- **manage_users**: Add, edit, and remove users within their organization
- **view_results**: Access organization-level analytics and reports
- **assign_assessments**: Create assessment assignments for employees
- **manage_relationships**: Define user relationships for targeted feedback

### Employee
Employees are the subjects of assessments and can:
- Complete self-assessments
- View their personal assessment results
- Create personal development plans
- Track their progress over time

### Reviewer
Reviewers provide feedback on employees and can:
- Complete assessments for assigned employees
- View only their own submitted responses
- Participate in multiple assessment types

## Multi-Organization Architecture

The platform supports multiple organizations with complete data isolation:
- Each organization has its own users, assessments, and data
- Cross-organization visibility is restricted
- Super Admins can access all organizations
- Organization-specific branding and settings

## Assessment System

### Assessment Types
- **Preset Assessments**: Created by Super Admins, available to all organizations
- **Custom Assessments**: Created by Organization Admins with the create_assessments permission

### Question Types
- **Rating Scale**: 1-7 scale by default (customizable)
- **Multiple Choice**: Custom options with optional values
- **Yes/No**: Simple binary choice
- **Text Response**: Free-form text input

### Assessment Structure
- Organized into sections for logical grouping
- Questions can be required or optional
- Progress tracking at section and overall levels
- Support for comments on each question

## Relationship-Based Assignments

The platform uses a relationship-based assignment system:
- **Peer**: Colleagues at the same level
- **Supervisor**: Managers or direct supervisors
- **Team Member**: Subordinates or team members

This allows for targeted feedback from different perspectives.

## Privacy and Security

### Data Privacy
- Individual responses are anonymized to protect reviewer privacy
- Aggregated results show trends without exposing individual feedback
- Organization data is isolated from other organizations
- PDF exports can be anonymized for organization-level reporting

### Security Features
- Row-Level Security (RLS) for data isolation
- Role-based access control
- Granular permissions for Organization Admins
- Secure authentication with password and OTP options

## Email Notification System

The platform includes a comprehensive email notification system:
- Assignment notifications
- Deadline reminders
- Completion confirmations
- Password reset emails
- Welcome emails for new users

Email providers supported:
- SMTP
- SendGrid
- Mailgun
- AWS SES

## PDF Export System

Organizations can customize PDF exports with:
- Organization logo
- Custom colors
- Footer text
- Timestamp and page number options
- Different template styles

## Analytics and Reporting

### Individual Results
- Side-by-side comparison of self and reviewer ratings
- Identification of strengths, blind spots, and hidden strengths
- Development recommendations
- Personal action plans

### Organization Analytics
- Completion rates and participation metrics
- Average ratings across competency areas
- Trend analysis
- Anonymized aggregated results

### System Analytics (Super Admin)
- Cross-organization performance metrics
- System health monitoring
- User activity tracking
- Growth metrics

## User Management

### User Creation
- Super Admins can create users in any organization
- Organization Admins can create users in their organization (with permission)
- Access request system for new organizations

### User Profiles
- Personal information management
- Notification preferences
- Display settings
- Security settings

## Technical Architecture

### Database Schema
- Organizations
- Users with roles and permissions
- Assessments with sections and questions
- Assignments and relationships
- Responses and results
- System settings and configurations

### Security Implementation
- Row-Level Security (RLS) policies
- Function-based access control
- Data validation and sanitization
- Secure authentication flows

## Development and Deployment

### Development Environment
- React 18 with TypeScript
- Tailwind CSS for styling
- Zustand for state management
- Vite for development and building

### Deployment Options
- Netlify (configured)
- Vercel (supported)
- Custom hosting with proper environment configuration

## Best Practices

### For Super Admins
- Create standardized preset assessments for consistency
- Configure appropriate permissions for Organization Admins
- Monitor system health and performance
- Review access requests promptly

### For Organization Admins
- Define clear user relationships for targeted feedback
- Create assessment schedules with reasonable deadlines
- Use anonymized reports for organization-wide insights
- Provide guidance to employees on feedback interpretation

### For Employees and Reviewers
- Complete assessments thoroughly and honestly
- Provide specific examples in comments
- Focus on constructive feedback
- Use results to create actionable development plans

## Troubleshooting

### Common Issues

#### Email Delivery Problems
- Check email provider configuration
- Verify sender domain/email
- Check email service quotas
- Review email templates for errors

#### Database Connection Issues
- Verify Supabase URL and key
- Check RLS policies
- Ensure migrations ran successfully
- Review database logs

#### UI/UX Issues
- Clear browser cache
- Check console for JavaScript errors
- Verify correct environment variables
- Test in multiple browsers

## Support Resources

- In-app help documentation
- Email support system
- User guides for different roles
- Admin documentation for system configuration