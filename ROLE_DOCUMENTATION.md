# 360° Feedback Platform - Role Documentation

## Role-Based Access Control System

The 360° Feedback Platform implements a comprehensive role-based access control system with five distinct roles, each with specific permissions and capabilities.

### Super Admin

**Description**: System-wide administrator with full access to all features and organizations.

**Permissions**:
- Create and manage organizations
- Configure system-wide settings
- Create preset assessments available to all organizations
- Manage all users across the system
- View system-wide analytics and reports
- Access system health monitoring
- Manage access requests
- Configure organization admin permissions
- Import/export data across all organizations

**Use Cases**:
- Platform administrators
- SaaS provider staff
- System maintainers

### Organization Admin

**Description**: Manages a specific organization with configurable permissions set by Super Admins.

**Configurable Permissions**:
- **create_assessments**: Create and modify custom assessments
- **manage_users**: Add, edit, and remove users within their organization
- **view_results**: Access organization-level analytics and reports
- **assign_assessments**: Create assessment assignments for employees
- **manage_relationships**: Define user relationships for targeted feedback

**Use Cases**:
- HR managers
- Department heads
- Team leaders with administrative responsibilities

### Subscriber

**Description**: Has limited access to features based on subscription level, primarily for organizations that subscribe to the platform but don't need full admin capabilities.

**Permissions**:
- View assessments assigned to their organization
- Access limited reporting features
- View organization structure
- Limited user management (view only)
- Cannot create or modify assessments
- Cannot assign assessments unless specifically granted

**Use Cases**:
- Small business owners
- Team managers in larger organizations
- External consultants with limited access needs

### Employee

**Description**: Regular users who are the subjects of assessments.

**Permissions**:
- Complete self-assessments
- View their personal assessment results
- Create personal development plans
- Track their progress over time

**Use Cases**:
- Regular staff members
- Team members being assessed

### Reviewer

**Description**: Users who provide feedback on employees.

**Permissions**:
- Complete assessments for assigned employees
- View only their own submitted responses
- Participate in multiple assessment types

**Use Cases**:
- Managers reviewing their direct reports
- Peers providing colleague feedback
- External stakeholders providing input

## Department Management

The platform supports a hierarchical department structure within each organization:

- Organizations can have multiple departments
- Departments can have sub-departments (hierarchical structure)
- Users can be assigned to specific departments
- Organization Admins can manage departments within their organization
- Imports and exports can be filtered by department

## Data Import/Export Capabilities

### Import Features

The platform supports importing:

1. **Users**:
   - Bulk import users from CSV files
   - Assign imported users to departments
   - Set roles (employee, reviewer, org_admin, subscriber)
   - Update existing users or create new ones

2. **Assessments**:
   - Import assessment templates from CSV files
   - Import sections and questions
   - Set question types, scales, and requirements

3. **Responses**:
   - Import assessment responses from CSV files
   - Link responses to existing assessments and users

### Export Features

The platform supports exporting:

1. **Users**:
   - Export user lists with roles and departments
   - Filter by department
   - Include or exclude column headers

2. **Assessments**:
   - Export assessment templates with sections and questions
   - Export in CSV format for easy editing

3. **Results**:
   - Export assessment results in PDF format
   - Option to anonymize data for privacy
   - Customizable branding for exports

4. **Analytics**:
   - Export organization-level analytics
   - Anonymized aggregated data
   - Charts and visualizations in PDF format

## Permission Inheritance and Constraints

- Super Admins have all permissions across all organizations
- Organization Admins have permissions only within their organization, limited to what Super Admins grant them
- Subscribers have limited permissions based on their subscription level
- Employees and Reviewers have the most restricted permissions, focused on their specific tasks
- Department-based permissions ensure users can only access data within their department when appropriate

## Role Assignment Guidelines

### When to Assign Super Admin
- For platform administrators who need full system access
- For technical support staff who need to troubleshoot across organizations
- Limited to a small number of trusted individuals

### When to Assign Organization Admin
- For HR managers or department heads who need to manage their organization
- When someone needs to create assessments or manage users
- When someone needs to view organization-wide analytics

### When to Assign Subscriber
- For organizations that subscribe to the platform but don't need full admin capabilities
- For managers who need limited access to view but not modify assessments
- For external consultants who need limited access to the system

### When to Assign Employee
- For regular staff members who will be assessed
- For anyone who needs to complete self-assessments
- For users who should only see their own results

### When to Assign Reviewer
- For managers who need to provide feedback on employees
- For peers participating in 360° feedback
- For anyone who needs to evaluate others but not be evaluated themselves