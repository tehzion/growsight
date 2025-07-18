# Relationship Assignment and First-Time Login Flow

This document explains how organization admins can assign relationships between users and how new users handle their first-time login with password reset.

## Overview

The system supports a complete workflow where:
1. **Org Admins** create users with temporary passwords
2. **Org Admins** assign relationships between users for assessments
3. **New Users** log in with temporary passwords and are forced to reset them
4. **Users** can then participate in assessments based on their assigned relationships

## User Creation by Org Admins

### Process Flow

1. **Org Admin creates user** through the admin interface
2. **System generates temporary password** automatically
3. **User account created** in Supabase Auth with temporary password
4. **User profile created** in database with `requires_password_change: true`
5. **Email notification sent** to new user with temporary password
6. **User can log in** with temporary password

### Code Implementation

```typescript
// In userStore.ts - createUser function
const tempPassword = 'Temp' + Math.random().toString(36).substring(2, 10) + '!';

// Create user in Supabase Auth
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: data.email.toLowerCase().trim(),
  password: tempPassword,
  email_confirm: true,
  user_metadata: {
    first_name: data.firstName.trim(),
    last_name: data.lastName.trim(),
    role: data.role,
    organization_id: data.organizationId,
    requires_password_change: true
  }
});

// Create user profile in database
const { data: profileData, error: profileError } = await supabase
  .from('users')
  .insert({
    id: authData.user.id,
    email: data.email.toLowerCase().trim(),
    first_name: data.firstName.trim(),
    last_name: data.lastName.trim(),
    role: data.role,
    organization_id: data.organizationId,
    requires_password_change: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .select()
  .single();
```

### Security Features

- **Temporary passwords** are automatically generated with complexity requirements
- **Email confirmation** is automatically set to true for new users
- **Password change requirement** is enforced on first login
- **Organization validation** ensures users are created within the correct organization
- **Duplicate email prevention** checks both auth and database tables

## Relationship Assignment by Org Admins

### Process Flow

1. **Org Admin navigates** to Assessment Management → User Relationships
2. **Org Admin selects** two users from the same organization
3. **Org Admin chooses** relationship type (peer, supervisor, team_member)
4. **System validates** organization access and user existence
5. **Relationship created** in database with proper audit trail
6. **Users can now** participate in assessments based on relationships

### Code Implementation

```typescript
// In relationshipStore.ts - createRelationship function
// Validate organization access for org admins
if (currentUserProfile.role === 'org_admin' && 
    currentUserProfile.organization_id !== users[0].organization_id) {
  throw new Error('You can only create relationships within your organization');
}

// Create relationship in database
const { data: newRelationship, error } = await supabase
  .from('user_relationships')
  .insert({
    user_id: data.userId,
    related_user_id: data.relatedUserId,
    relationship_type: data.relationshipType,
    created_by_id: user.id,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  .select()
  .single();
```

### Security Features

- **Organization validation** ensures relationships are only created within the same organization
- **Permission checking** validates that the current user has relationship management permissions
- **Duplicate prevention** checks for existing relationships between users
- **Audit trail** tracks who created each relationship and when
- **Soft deletes** maintain relationship history while allowing removal

## First-Time Login and Password Reset

### Process Flow

1. **User receives email** with temporary password
2. **User attempts login** with temporary password
3. **System detects** `requires_password_change: true`
4. **User redirected** to password reset page
5. **User sets new password** with complexity requirements
6. **System updates** `requires_password_change: false`
7. **User can now** access the system normally

### Code Implementation

```typescript
// In authStore.ts - login function
// Redirect to password reset if required
if (user.requiresPasswordChange) {
  throw new Error('PASSWORD_RESET_REQUIRED');
}

// In ResetPassword.tsx - password reset handling
const onSubmit = async (data: ResetPasswordFormData) => {
  try {
    await setNewPassword(token, data.password);
    
    // Update requiresPasswordChange flag in user profile
    if (get().user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ requires_password_change: false })
        .eq('id', get().user.id);
      
      if (updateError) {
        SecureLogger.error('Failed to update requires_password_change flag', updateError);
      }
      set(state => ({ user: state.user ? { ...state.user, requiresPasswordChange: false } : null }));
    }
    
    navigate('/login', { 
      replace: true,
      state: { message: 'Your password has been reset successfully. Please sign in with your new password.' }
    });
  } catch (err) {
    // Error is handled by the store
  }
};
```

### Security Features

- **Forced password change** on first login prevents continued use of temporary passwords
- **Password complexity requirements** ensure strong passwords
- **Session management** properly handles the transition from temporary to permanent passwords
- **Audit logging** tracks password changes and login attempts
- **Email notifications** inform users of account creation and password requirements

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  requires_password_change BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### User Relationships Table
```sql
CREATE TABLE user_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  related_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  relationship_type relationship_type NOT NULL,
  created_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, related_user_id, relationship_type)
);
```

## Testing

### Automated Test Suite

The system includes a comprehensive test suite (`relationshipAssignmentTest.ts`) that verifies:

1. **User Creation Test**
   - Creates test users with temporary passwords
   - Verifies user creation in both Auth and Database
   - Checks `requires_password_change` flag

2. **Relationship Assignment Test**
   - Creates relationships between test users
   - Validates organization access controls
   - Verifies relationship creation in database

3. **First-Time Login Test**
   - Tests login with temporary password
   - Verifies password change requirement detection
   - Tests redirect to password reset

4. **Password Reset Test**
   - Tests password update functionality
   - Verifies `requires_password_change` flag update
   - Tests successful login with new password

### Running Tests

```typescript
import { relationshipAssignmentTest } from '../lib/security/relationshipAssignmentTest';

// Run full test suite
const result = await relationshipAssignmentTest.runFullTest();
console.log('Test Result:', result);

// Run individual tests
const userResult = await relationshipAssignmentTest.testOrgAdminUserCreation();
const relationshipResult = await relationshipAssignmentTest.testRelationshipAssignment(userId1, userId2);
const loginResult = await relationshipAssignmentTest.testFirstTimeLogin(email, tempPassword);
const passwordResult = await relationshipAssignmentTest.testPasswordReset(email, newPassword);
```

## Error Handling

### Common Error Scenarios

1. **User Creation Errors**
   - Duplicate email addresses
   - Invalid organization ID
   - Supabase Auth creation failures
   - Database profile creation failures

2. **Relationship Assignment Errors**
   - Users not in same organization
   - Existing relationships between users
   - Insufficient permissions
   - Invalid relationship types

3. **Login Errors**
   - Invalid temporary password
   - Account not found
   - Organization access denied
   - Password change requirement not detected

4. **Password Reset Errors**
   - Invalid reset token
   - Password complexity requirements not met
   - Database update failures
   - Session management issues

### Error Recovery

- **Rollback mechanisms** for failed user creation
- **Graceful degradation** for email notification failures
- **Retry logic** for transient database errors
- **User-friendly error messages** for common scenarios
- **Audit logging** for debugging and compliance

## Best Practices

### For Org Admins

1. **User Creation**
   - Always verify email addresses before creating users
   - Use descriptive temporary passwords for testing
   - Monitor email delivery for new user notifications
   - Regularly review user accounts and relationships

2. **Relationship Management**
   - Plan relationship structure before creating assignments
   - Use appropriate relationship types for assessment context
   - Regularly audit relationship assignments
   - Remove obsolete relationships promptly

### For Users

1. **First-Time Login**
   - Check email for temporary password immediately
   - Use a strong, unique password for the new account
   - Complete profile setup after password reset
   - Contact support if login issues persist

2. **Password Security**
   - Use unique passwords for different accounts
   - Enable two-factor authentication if available
   - Regularly update passwords
   - Never share passwords or temporary credentials

## Monitoring and Analytics

### Key Metrics

- **User creation success rate**
- **Relationship assignment completion rate**
- **First-time login success rate**
- **Password reset completion rate**
- **Email delivery success rate**

### Audit Trail

- **User creation events** with creator and timestamp
- **Relationship assignment events** with assigner and relationship details
- **Login attempts** with success/failure status
- **Password change events** with timestamp and method
- **Organization access violations** for security monitoring

## Troubleshooting

### Common Issues

1. **User cannot log in with temporary password**
   - Check email delivery and spam folders
   - Verify temporary password format
   - Check user account status in database
   - Verify organization access permissions

2. **Relationship assignment fails**
   - Verify both users exist and are active
   - Check organization membership
   - Verify admin permissions
   - Check for existing relationships

3. **Password reset not working**
   - Verify reset token validity
   - Check password complexity requirements
   - Verify database connection
   - Check session management

### Support Procedures

1. **Reset user password** through admin interface
2. **Recreate user account** if necessary
3. **Manually assign relationships** if automated process fails
4. **Check system logs** for detailed error information
5. **Contact technical support** for persistent issues

## Future Enhancements

### Planned Features

1. **Bulk user creation** for large organizations
2. **Relationship templates** for common organizational structures
3. **Advanced password policies** with organization-specific rules
4. **Multi-factor authentication** for enhanced security
5. **User self-registration** with admin approval workflow
6. **Relationship analytics** for organizational insights

### Integration Opportunities

1. **HR system integration** for automatic user provisioning
2. **Active Directory/LDAP** integration for enterprise environments
3. **SSO integration** for seamless authentication
4. **Email system integration** for enhanced notifications
5. **Analytics platform integration** for comprehensive reporting 