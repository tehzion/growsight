# Super Admin Guide for 360° Feedback Platform

This comprehensive guide is designed specifically for Super Administrators of the 360° Feedback Platform, providing detailed information on all system-wide management capabilities and responsibilities.

## Super Admin Role Overview

As a Super Admin, you have complete access to all features and organizations within the system. Your role includes:

- Managing all organizations in the system
- Configuring system-wide settings
- Creating and managing preset assessments
- Overseeing all users across organizations
- Monitoring system health and performance
- Reviewing and approving access requests
- Setting permissions for Organization Admins
- Managing system branding and customization

## System Management

### Dashboard

The Super Admin dashboard provides a comprehensive overview of the entire system:

1. **Key Metrics**
   - Total organizations
   - Completion rates across all organizations
   - System-wide average ratings
   - User statistics

2. **Organization Performance**
   - Comparative metrics across organizations
   - Completion rates by organization
   - Average ratings by organization
   - User counts by organization

3. **System Health**
   - Database status
   - API response times
   - Uptime statistics
   - Error rates

### Organization Management

As a Super Admin, you can create and manage all organizations in the system:

1. **Creating Organizations**
   - Navigate to **Organizations** in the sidebar
   - Click **Add Organization**
   - Enter the organization name
   - Click **Create Organization**

2. **Managing Organizations**
   - Edit organization names
   - Delete organizations (this will also delete all associated users and data)
   - View organization statistics and user counts

3. **Organization Permissions**
   - Configure what Organization Admins can do within their organizations
   - Navigate to **Permissions** in the sidebar
   - Select an organization
   - Configure permissions:
     - **create_assessments**: Allow creating custom assessments
     - **manage_users**: Allow adding, editing, and removing users
     - **view_results**: Allow access to organization analytics
     - **assign_assessments**: Allow creating assessment assignments
     - **manage_relationships**: Allow defining user relationships

4. **Permission Templates**
   - **Basic Access**: manage_users + assign_assessments
   - **Standard Access**: manage_users + assign_assessments + manage_relationships + view_results
   - **Full Access**: All available permissions

### User Management

Super Admins can manage all users across all organizations:

1. **Creating Users**
   - Navigate to **Users** in the sidebar
   - Select an organization from the dropdown
   - Click **Add User**
   - Fill in user details:
     - First Name
     - Last Name
     - Email
     - Role (Super Admin, Organization Admin, Subscriber, Employee, Reviewer)
     - Department (optional)
   - Click **Create User**

2. **Managing Users**
   - Edit user details
   - Delete users
   - Assign users to departments
   - Change user roles

3. **Department Management**
   - Create and manage departments within organizations
   - Create hierarchical department structures
   - Assign users to departments
   - Delete departments (users will be unassigned from the department)

### Assessment Management

Super Admins can create preset assessments available to all organizations:

1. **Creating Preset Assessments**
   - Navigate to **Assessments** in the sidebar
   - Click **Create Assessment**
   - Fill in assessment details
   - Click **Create & Continue to Builder**
   - Add sections and questions
   - Publish to organizations

2. **Assessment Properties**
   - Assessments created by Super Admins are automatically marked as "presets"
   - Preset assessments cannot be deleted
   - Preset assessments are available to all organizations

3. **Publishing Assessments**
   - Select which organizations can access the assessment
   - Organizations can be added or removed at any time

### System Settings

Super Admins have exclusive access to system-wide settings:

1. **Security Settings**
   - Password policies
   - Session timeouts
   - Login attempt limits
   - Two-factor authentication settings

2. **Email Configuration**
   - Email provider settings (SMTP, SendGrid, Mailgun, AWS SES)
   - Email templates
   - Notification settings
   - Test email functionality

3. **System Configuration**
   - Maintenance mode
   - User registration settings
   - File upload limits
   - Backup frequency
   - Log retention

4. **Notification Settings**
   - Email notification preferences
   - System alert settings
   - Deadline reminder configuration

### System Health

Super Admins can monitor the health and performance of the system:

1. **Resource Monitoring**
   - CPU, memory, and disk usage
   - Database connections and performance
   - Service status and uptime

2. **Performance Metrics**
   - API response times
   - Request rates
   - Error rates
   - Database query performance

3. **Optimization Recommendations**
   - Automated suggestions for improving performance
   - Database optimization tips
   - Resource scaling recommendations

### Audit Log

Super Admins have access to a comprehensive audit log:

1. **User Activity**
   - Login attempts
   - User creation and modification
   - Assessment creation and modification
   - Assignment creation

2. **System Events**
   - System settings changes
   - Organization creation and modification
   - Error events
   - Security-related events

3. **Filtering and Export**
   - Filter by date, user, action type, etc.
   - Export logs for compliance and record-keeping

### Access Requests

Super Admins manage access requests from new users:

1. **Reviewing Requests**
   - View pending access requests
   - See requestor details and organization information
   - Review additional messages from requestors

2. **Approving Requests**
   - Approve requests to create new users
   - Create new organizations if needed
   - Set appropriate roles and permissions
   - Send welcome emails with login instructions

3. **Rejecting Requests**
   - Reject inappropriate requests
   - Provide rejection reasons
   - Manage rejected request history

### Branding

Super Admins can configure system-wide branding:

1. **PDF Branding**
   - Set default logo
   - Configure colors
   - Customize footer text
   - Set timestamp and page number preferences
   - Choose default templates

2. **Web Interface Branding**
   - Configure application logo
   - Set primary and secondary colors
   - Customize email footers
   - Set favicon

## Import/Export Management

Super Admins have full access to import and export functionality:

1. **User Import**
   - Import users from CSV files
   - Assign imported users to organizations and departments
   - Set roles and permissions

2. **Assessment Import**
   - Import assessment templates
   - Import questions and sections
   - Assign to organizations

3. **Data Export**
   - Export user data
   - Export assessment templates
   - Export results and analytics
   - Configure anonymization options

## Best Practices for Super Admins

### Security Best Practices
- Use strong, unique passwords
- Enable two-factor authentication if available
- Regularly review audit logs for suspicious activity
- Be cautious when granting Super Admin access to others
- Regularly review and update security settings

### Organization Management
- Create standardized naming conventions for organizations
- Document organization structures and hierarchies
- Regularly review organization permissions
- Archive rather than delete organizations when possible

### User Management
- Limit the number of Super Admins
- Regularly audit user accounts and permissions
- Remove access promptly when no longer needed
- Use descriptive department names

### Assessment Management
- Create standardized preset assessments for consistency
- Document assessment structures and purposes
- Test assessments before publishing to organizations
- Consider creating assessment categories or tags

### System Maintenance
- Regularly monitor system health
- Schedule maintenance during off-peak hours
- Keep backups of all configuration settings
- Document all system changes

## Troubleshooting Common Issues

### User Access Issues
- Verify user role and permissions
- Check organization assignment
- Confirm email address is correct
- Reset password if necessary

### Organization Issues
- Verify organization exists in the system
- Check organization permissions
- Ensure organization has proper admin users

### Assessment Issues
- Verify assessment is published to the correct organizations
- Check assessment structure and questions
- Ensure proper relationships are set up for assignments

### System Performance Issues
- Check system health dashboard
- Review database performance
- Monitor API response times
- Check for resource constraints

## Getting Support

As a Super Admin, you have access to priority support:

1. **Technical Support**
   - Contact technical support at support@360feedback.com
   - Include your Super Admin ID in all communications
   - Provide detailed information about any issues

2. **Documentation**
   - Access the complete system documentation
   - Review technical specifications
   - Consult implementation guides

3. **Training Resources**
   - Access Super Admin training materials
   - Schedule training sessions for new Super Admins
   - Review best practices documentation