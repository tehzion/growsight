# 360° Feedback Platform - Administrator Guide

This guide provides detailed information for Super Admins and Organization Admins on how to effectively manage the 360° Feedback Platform.

## Super Admin Guide

As a Super Admin, you have complete access to all features and organizations within the system.

### Organization Management

#### Creating Organizations
1. Navigate to **Organizations** in the sidebar
2. Click **Add Organization**
3. Enter the organization name and click **Create Organization**
4. The new organization will appear in the organizations list

#### Managing Organization Permissions
1. Navigate to **Permissions** in the sidebar
2. Select an organization from the list
3. Configure the permissions for Organization Admins:
   - **create_assessments**: Allow creating custom assessments
   - **manage_users**: Allow adding, editing, and removing users
   - **view_results**: Allow access to organization analytics
   - **assign_assessments**: Allow creating assessment assignments
   - **manage_relationships**: Allow defining user relationships
4. Click **Save Permissions**

#### Quick Permission Templates
- **Basic Access**: manage_users + assign_assessments
- **Standard Access**: manage_users + assign_assessments + manage_relationships + view_results
- **Full Access**: All available permissions

### User Management

#### Creating Admin Users
1. Navigate to **Users** in the sidebar
2. Select an organization from the dropdown
3. Click **Add Admin User**
4. Fill in the user details:
   - First Name
   - Last Name
   - Email
   - Admin Role (Super Admin or Organization Admin)
5. Click **Create Admin User**

#### Managing Users
- Edit user details by clicking the **Edit** button
- Delete users by clicking the **Delete** button
- View user details by clicking the **View** button

### Assessment Management

#### Creating Preset Assessments
1. Navigate to **Assessments** in the sidebar
2. Click **Create Assessment**
3. Fill in the assessment details and click **Create & Continue to Builder**
4. Add sections and questions to the assessment
5. Publish the assessment to organizations by selecting them in the **Organization Assignment** section

#### Managing Assessments
- View all assessments across all organizations
- Edit assessments by clicking on them
- Delete custom assessments if needed (preset assessments cannot be deleted)
- Publish assessments to specific organizations

### System Management

#### System Settings
1. Navigate to **System Settings** in the sidebar
2. Configure various system settings:
   - **Security**: Password policies, session timeouts, etc.
   - **Email**: Email provider configuration
   - **System**: Maintenance mode, registration settings, etc.
   - **Notifications**: Email notification settings
   - **PDF Branding**: Default PDF export settings

#### System Health
1. Navigate to **System Health** in the sidebar
2. Monitor system performance metrics:
   - CPU, memory, and disk usage
   - Database connections and performance
   - Service status and uptime
   - API response times and error rates

#### Audit Log
1. Navigate to **Audit Log** in the sidebar
2. View and filter system activities:
   - User actions
   - System events
   - Security-related activities
   - Filter by date, user, action type, etc.

#### Access Requests
1. Navigate to **Access Requests** in the sidebar
2. Review pending access requests
3. Approve or reject requests
4. When approved, users will receive an email with login instructions

### Analytics

1. Navigate to **Analytics** in the sidebar
2. View system-wide analytics:
   - Organization performance comparison
   - Completion rates and participation metrics
   - Average ratings and response counts
   - Filter by organization or time period
3. Export reports in CSV or PDF format

## Organization Admin Guide

As an Organization Admin, you manage users and assessments within your organization based on the permissions granted by Super Admins.

### User Management (requires manage_users permission)

#### Creating Users
1. Navigate to **Users** in the sidebar
2. Click **Add Admin User**
3. Fill in the user details and click **Create Admin User**

#### Managing User Relationships (requires manage_relationships permission)
1. Navigate to **Assessment Management** in the sidebar
2. Select the **User Relationships** tab
3. Click **Add Relationship**
4. Select the primary user, related user, and relationship type
5. Click **Create Relationship**

### Assessment Management (requires create_assessments permission)

#### Creating Custom Assessments
1. Navigate to **Assessments** in the sidebar
2. Click **Create Assessment**
3. Fill in the assessment details and click **Create & Continue to Builder**
4. Add sections and questions to the assessment

#### Managing Assessment Assignments (requires assign_assessments permission)
1. Navigate to **Assessment Management** in the sidebar
2. Select the **Assessment Assignments** tab
3. Select an assessment from the dropdown
4. Click **Create Assignment**
5. Select the employee, reviewer, relationship type, and deadline
6. Click **Create Assignment**

### Analytics (requires view_results permission)

1. Navigate to **Analytics** in the sidebar
2. View organization-level analytics:
   - Completion rates and participation metrics
   - Average ratings and response counts
   - Performance by competency area
3. Export reports in CSV or PDF format

## Common Tasks for All Admins

### PDF Branding Configuration
1. Navigate to **System Settings** (Super Admin) or **Analytics** (Org Admin)
2. Select the **PDF Branding** tab or click the settings icon next to the export button
3. Configure branding settings:
   - Company Name
   - Logo URL
   - Primary and Secondary Colors
   - Footer Text
   - Include Timestamp and Page Numbers options
   - Default Template
4. Click **Save Settings**

### Email Testing
1. Navigate to **System Settings** > **Email** tab
2. Configure email provider settings
3. Enter a recipient email address in the **Test Email** section
4. Click **Send Test**
5. Verify the email is received

### Managing Assessment Deadlines
1. Navigate to **Assessment Management** > **Assessment Assignments**
2. Find the assignment you want to modify
3. Click the **Edit** button next to the deadline
4. Update the deadline and click **Save**

### Monitoring Progress
1. Navigate to **Dashboard**
2. View key metrics:
   - Total users
   - Completed assessments
   - Pending assessments
   - Average ratings
3. Click on specific metrics to drill down for more details

## Best Practices

### For Super Admins
- Regularly review and update system settings
- Monitor system health and performance
- Create standardized preset assessments for consistency
- Configure appropriate permissions for Organization Admins
- Review access requests promptly

### For Organization Admins
- Define clear user relationships for targeted feedback
- Create assessment schedules with reasonable deadlines
- Use anonymized reports for organization-wide insights
- Provide guidance to employees on feedback interpretation
- Regularly review and update user information

### Security Best Practices
- Use strong passwords
- Enable two-factor authentication if available
- Regularly review audit logs for suspicious activity
- Ensure proper permissions are set for all users
- Maintain data privacy by using anonymized exports when appropriate