import { supabase } from '../supabase';
import { useUserStore } from '../../stores/userStore';
import { useRelationshipStore } from '../../stores/relationshipStore';
import { useAuthStore } from '../../stores/authStore';
import SecureLogger from '../secureLogger';

export interface RelationshipAssignmentTest {
  testOrgAdminUserCreation: () => Promise<{
    success: boolean;
    message: string;
    userId?: string;
    tempPassword?: string;
  }>;
  testRelationshipAssignment: (userId1: string, userId2: string) => Promise<{
    success: boolean;
    message: string;
    relationshipId?: string;
  }>;
  testFirstTimeLogin: (email: string, tempPassword: string) => Promise<{
    success: boolean;
    message: string;
    requiresPasswordChange?: boolean;
  }>;
  testPasswordReset: (email: string, newPassword: string) => Promise<{
    success: boolean;
    message: string;
  }>;
  runFullTest: () => Promise<{
    success: boolean;
    message: string;
    details: {
      userCreation: boolean;
      relationshipAssignment: boolean;
      firstTimeLogin: boolean;
      passwordReset: boolean;
    };
  }>;
}

export class RelationshipAssignmentTestSuite implements RelationshipAssignmentTest {
  
  async testOrgAdminUserCreation(): Promise<{
    success: boolean;
    message: string;
    userId?: string;
    tempPassword?: string;
  }> {
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const testData = {
        email: testEmail,
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        organizationId: 'test-org-id',
        departmentId: undefined,
        organizationName: 'Test Organization'
      };

      const { createUser } = useUserStore.getState();
      await createUser(testData);

      // Verify user was created in Supabase
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, requires_password_change')
        .eq('email', testEmail)
        .single();

      if (error || !user) {
        return {
          success: false,
          message: 'Failed to verify user creation in database'
        };
      }

      return {
        success: true,
        message: 'User created successfully with temporary password',
        userId: user.id,
        tempPassword: 'Temp' + Math.random().toString(36).substring(2, 10) + '!'
      };
    } catch (error) {
      return {
        success: false,
        message: `User creation failed: ${(error as Error).message}`
      };
    }
  }

  async testRelationshipAssignment(userId1: string, userId2: string): Promise<{
    success: boolean;
    message: string;
    relationshipId?: string;
  }> {
    try {
      const { createRelationship } = useRelationshipStore.getState();
      
      await createRelationship({
        userId: userId1,
        relatedUserId: userId2,
        relationshipType: 'peer'
      });

      // Verify relationship was created
      const { data: relationship, error } = await supabase
        .from('user_relationships')
        .select('id, user_id, related_user_id, relationship_type')
        .or(`and(user_id.eq.${userId1},related_user_id.eq.${userId2}),and(user_id.eq.${userId2},related_user_id.eq.${userId1})`)
        .eq('is_active', true)
        .single();

      if (error || !relationship) {
        return {
          success: false,
          message: 'Failed to verify relationship creation in database'
        };
      }

      return {
        success: true,
        message: 'Relationship assigned successfully',
        relationshipId: relationship.id
      };
    } catch (error) {
      return {
        success: false,
        message: `Relationship assignment failed: ${(error as Error).message}`
      };
    }
  }

  async testFirstTimeLogin(email: string, tempPassword: string): Promise<{
    success: boolean;
    message: string;
    requiresPasswordChange?: boolean;
  }> {
    try {
      // Test login with temporary password
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: tempPassword
      });

      if (error) {
        return {
          success: false,
          message: `Login failed: ${error.message}`
        };
      }

      if (!data.user) {
        return {
          success: false,
          message: 'No user returned from login'
        };
      }

      // Check if user requires password change
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('requires_password_change')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        return {
          success: false,
          message: 'Failed to check password change requirement'
        };
      }

      return {
        success: true,
        message: 'First-time login successful',
        requiresPasswordChange: profile.requires_password_change
      };
    } catch (error) {
      return {
        success: false,
        message: `First-time login test failed: ${(error as Error).message}`
      };
    }
  }

  async testPasswordReset(email: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Update user password
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        return {
          success: false,
          message: `Password update failed: ${error.message}`
        };
      }

      // Update requires_password_change flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ requires_password_change: false })
          .eq('id', user.id);

        if (updateError) {
          return {
            success: false,
            message: 'Failed to update password change flag'
          };
        }
      }

      return {
        success: true,
        message: 'Password reset successful'
      };
    } catch (error) {
      return {
        success: false,
        message: `Password reset failed: ${(error as Error).message}`
      };
    }
  }

  async runFullTest(): Promise<{
    success: boolean;
    message: string;
    details: {
      userCreation: boolean;
      relationshipAssignment: boolean;
      firstTimeLogin: boolean;
      passwordReset: boolean;
    };
  }> {
    const details = {
      userCreation: false,
      relationshipAssignment: false,
      firstTimeLogin: false,
      passwordReset: false
    };

    try {
      SecureLogger.info('Starting relationship assignment and first-time login test');

      // Test 1: Create test users
      const user1Result = await this.testOrgAdminUserCreation();
      if (!user1Result.success) {
        return {
          success: false,
          message: `User creation failed: ${user1Result.message}`,
          details
        };
      }
      details.userCreation = true;

      const user2Result = await this.testOrgAdminUserCreation();
      if (!user2Result.success) {
        return {
          success: false,
          message: `Second user creation failed: ${user2Result.message}`,
          details
        };
      }

      // Test 2: Assign relationship
      const relationshipResult = await this.testRelationshipAssignment(
        user1Result.userId!,
        user2Result.userId!
      );
      if (!relationshipResult.success) {
        return {
          success: false,
          message: `Relationship assignment failed: ${relationshipResult.message}`,
          details
        };
      }
      details.relationshipAssignment = true;

      // Test 3: First-time login
      const loginResult = await this.testFirstTimeLogin(
        user1Result.tempPassword!,
        user1Result.tempPassword!
      );
      if (!loginResult.success) {
        return {
          success: false,
          message: `First-time login failed: ${loginResult.message}`,
          details
        };
      }
      details.firstTimeLogin = true;

      // Test 4: Password reset
      const passwordResult = await this.testPasswordReset(
        user1Result.tempPassword!,
        'NewSecurePassword123!'
      );
      if (!passwordResult.success) {
        return {
          success: false,
          message: `Password reset failed: ${passwordResult.message}`,
          details
        };
      }
      details.passwordReset = true;

      SecureLogger.info('All relationship assignment and first-time login tests passed');

      return {
        success: true,
        message: 'All tests passed successfully',
        details
      };

    } catch (error) {
      return {
        success: false,
        message: `Test suite failed: ${(error as Error).message}`,
        details
      };
    }
  }
}

// Export singleton instance
export const relationshipAssignmentTest = new RelationshipAssignmentTestSuite(); 