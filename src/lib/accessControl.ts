import { User } from '../types';
import SecureLogger from './secureLogger';

/**
 * Access control utilities for organization and user data protection
 */
export class AccessControl {
  /**
   * Validates if a user can access data from a specific organization
   */
  static validateOrganizationAccess(
    currentUser: User | null,
    targetOrganizationId: string,
    context: string
  ): boolean {
    if (!currentUser) {
      SecureLogger.warn(`Unauthorized access attempt in ${context}`, { 
        reason: 'no-user' 
      });
      return false;
    }

    // Super admins can access any organization
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Regular users can only access their own organization
    if (currentUser.organizationId !== targetOrganizationId) {
      SecureLogger.warn(`Cross-organization access blocked in ${context}`, {
        userRole: currentUser.role,
        userOrg: '[ORG_ID]',
        targetOrg: '[ORG_ID]'
      });
      return false;
    }

    return true;
  }

  /**
   * Validates if a user can access another user's data
   */
  static validateUserAccess(
    currentUser: User | null,
    targetUserId: string,
    context: string,
    allowOrgAdmin: boolean = true
  ): boolean {
    if (!currentUser) {
      SecureLogger.warn(`Unauthorized user access attempt in ${context}`, { 
        reason: 'no-user' 
      });
      return false;
    }

    // Super admins can access any user
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Users can always access their own data
    if (currentUser.id === targetUserId) {
      return true;
    }

    // Org admins can access users in their organization (if allowed)
    if (allowOrgAdmin && currentUser.role === 'org_admin') {
      // We can't validate org membership here without the target user object
      // This should be validated at the API/database level
      return true;
    }

    SecureLogger.warn(`User access blocked in ${context}`, {
      userRole: currentUser.role,
      context
    });
    return false;
  }

  /**
   * Filters array of items to only include those accessible by the current user
   */
  static filterByOrganization<T extends { organizationId: string }>(
    items: T[],
    currentUser: User | null,
    context: string
  ): T[] {
    if (!currentUser) {
      SecureLogger.warn(`Filter attempted without user in ${context}`);
      return [];
    }

    // Super admins see everything
    if (currentUser.role === 'super_admin') {
      return items;
    }

    // Filter to only user's organization
    const filtered = items.filter(item => 
      item.organizationId === currentUser.organizationId
    );

    if (filtered.length !== items.length) {
      SecureLogger.dev(`Filtered ${items.length - filtered.length} items from different orgs in ${context}`);
    }

    return filtered;
  }

  /**
   * Validates assessment assignment access
   */
  static validateAssignmentAccess(
    currentUser: User | null,
    employeeId: string,
    reviewerId: string,
    context: string
  ): boolean {
    if (!currentUser) {
      return false;
    }

    // Super admins can access any assignment
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Users can access assignments where they are the employee or reviewer
    if (currentUser.id === employeeId || currentUser.id === reviewerId) {
      return true;
    }

    // Org admins can access assignments in their organization
    // (This should be validated at database level with user org checks)
    if (currentUser.role === 'org_admin') {
      return true;
    }

    SecureLogger.warn(`Assignment access blocked in ${context}`, {
      userRole: currentUser.role
    });
    return false;
  }

  /**
   * Sanitizes user data before sending to client
   */
  static sanitizeUserData(user: User, requestingUser: User | null): Partial<User> {
    if (!requestingUser) {
      return {};
    }

    // Super admins see all data
    if (requestingUser.role === 'super_admin') {
      return user;
    }

    // Users see their own full data
    if (requestingUser.id === user.id) {
      return user;
    }

    // Different org users see nothing
    if (requestingUser.organizationId !== user.organizationId) {
      return {};
    }

    // Same org users see limited data
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      departmentId: user.departmentId,
      jobTitle: user.jobTitle
    };
  }

  /**
   * Validates if user can perform admin actions
   */
  static canPerformAdminAction(
    currentUser: User | null,
    targetOrganizationId: string,
    action: string
  ): boolean {
    if (!currentUser) {
      SecureLogger.warn(`Admin action attempted without authentication: ${action}`);
      return false;
    }

    // Super admins can perform any action
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Org admins can perform actions in their organization
    if (currentUser.role === 'org_admin' && currentUser.organizationId === targetOrganizationId) {
      return true;
    }

    SecureLogger.warn(`Admin action blocked: ${action}`, {
      userRole: currentUser.role,
      userOrg: '[ORG_ID]',
      targetOrg: '[ORG_ID]'
    });
    return false;
  }

  /**
   * Rate limiting for sensitive operations
   */
  private static rateLimitMap = new Map<string, number[]>();

  static checkRateLimit(
    userId: string,
    action: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): boolean {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const attempts = this.rateLimitMap.get(key) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < windowMs);

    if (recentAttempts.length >= maxAttempts) {
      SecureLogger.warn(`Rate limit exceeded for action: ${action}`, {
        userId: '[USER_ID]',
        attempts: recentAttempts.length
      });
      return false;
    }

    // Add current attempt
    recentAttempts.push(now);
    this.rateLimitMap.set(key, recentAttempts);

    return true;
  }
}

export default AccessControl;