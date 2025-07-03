import { User } from '../types';
import SecureLogger from './secureLogger';

/**
 * Access control utilities for organization and user data protection
 */
export class AccessControl {
  // Permission definitions
  static readonly PERMISSIONS = {
    // User management
    MANAGE_USERS: 'manage_users',
    VIEW_USERS: 'view_users',
    CREATE_USERS: 'create_users',
    DELETE_USERS: 'delete_users',
    
    // Assessment management
    CREATE_ASSESSMENTS: 'create_assessments',
    EDIT_ASSESSMENTS: 'edit_assessments',
    DELETE_ASSESSMENTS: 'delete_assessments',
    VIEW_ASSESSMENTS: 'view_assessments',
    ASSIGN_ASSESSMENTS: 'assign_assessments',
    
    // Results and analytics
    VIEW_RESULTS: 'view_results',
    EXPORT_RESULTS: 'export_results',
    VIEW_ANALYTICS: 'view_analytics',
    
    // Organization management
    MANAGE_ORGANIZATIONS: 'manage_organizations',
    VIEW_ORGANIZATIONS: 'view_organizations',
    
    // System management
    MANAGE_SYSTEM: 'manage_system',
    VIEW_REPORTS: 'view_reports',
    MANAGE_TEMPLATES: 'manage_templates',
    
    // Support and communication
    MANAGE_SUPPORT: 'manage_support',
    VIEW_SUPPORT: 'view_support',
    
    // Branding and customization
    MANAGE_BRANDING: 'manage_branding',
    VIEW_BRANDING: 'view_branding'
  } as const;

  // Role-based permission mappings
  static readonly ROLE_PERMISSIONS = {
    root: [
      'manage_users', 'view_users', 'create_users', 'delete_users',
      'create_assessments', 'edit_assessments', 'delete_assessments', 'view_assessments', 'assign_assessments',
      'view_results', 'export_results', 'view_analytics',
      'manage_organizations', 'view_organizations',
      'manage_system', 'view_reports', 'manage_templates',
      'manage_support', 'view_support',
      'manage_branding', 'view_branding'
    ],
    super_admin: [
      'manage_users', 'view_users', 'create_users', 'delete_users',
      'create_assessments', 'edit_assessments', 'delete_assessments', 'view_assessments', 'assign_assessments',
      'view_results', 'export_results', 'view_analytics',
      'manage_organizations', 'view_organizations',
      'manage_system', 'view_reports', 'manage_templates',
      'manage_support', 'view_support',
      'manage_branding', 'view_branding'
    ],
    org_admin: [
      'manage_users', 'view_users', 'create_users',
      'create_assessments', 'edit_assessments', 'view_assessments', 'assign_assessments',
      'view_results', 'export_results', 'view_analytics',
      'view_reports',
      'view_support',
      'view_branding'
    ],
    reviewer: [
      'view_assessments',
      'view_results'
    ],
    employee: [
      'view_assessments'
    ],
    subscriber: [
      'view_assessments',
      'view_results'
    ]
  } as const;

  /**
   * Checks if a user has a specific permission
   */
  static hasPermission(user: User | null, permission: string): boolean {
    if (!user) {
      return false;
    }

    const userPermissions = this.ROLE_PERMISSIONS[user.role as keyof typeof this.ROLE_PERMISSIONS] || [];
    return userPermissions.includes(permission as any);
  }

  /**
   * Checks if a user can access a specific feature
   */
  static canAccessFeature(user: User | null, feature: string): boolean {
    if (!user) {
      return false;
    }

    const featurePermissions: Record<string, string[]> = {
      'reporting': ['view_reports'],
      'user-management': ['manage_users'],
      'assessment-builder': ['create_assessments'],
      'assessment-results': ['view_results'],
      'organization-management': ['manage_organizations'],
      'system-settings': ['manage_system'],
      'template-management': ['manage_templates'],
      'support-hub': ['view_support'],
      'branding': ['view_branding']
    };

    const requiredPermissions = featurePermissions[feature] || [];
    return requiredPermissions.every(permission => this.hasPermission(user, permission));
  }

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

    // Hide root users from non-root users
    if (user.role === 'root' && requestingUser.role !== 'root') {
      return {};
    }

    // Super admins see all data (except root users if they're not root)
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

    // Org admins can only perform actions in their organization
    if (currentUser.role === 'org_admin') {
      return currentUser.organizationId === targetOrganizationId;
    }

    SecureLogger.warn(`Admin action blocked: ${action}`, {
      userRole: currentUser.role,
      targetOrg: targetOrganizationId
    });
    return false;
  }

  /**
   * Gets available features for a user
   */
  static getAvailableFeatures(user: User | null): string[] {
    if (!user) {
      return [];
    }

    const allFeatures = [
      'dashboard',
      'reporting',
      'user-management',
      'assessment-builder',
      'assessment-results',
      'organization-management',
      'system-settings',
      'template-management',
      'support-hub',
      'branding',
      'import-export',
      'competencies',
      'access-requests'
    ];

    return allFeatures.filter(feature => this.canAccessFeature(user, feature));
  }

  /**
   * Validates reporting access based on user role and organization
   */
  static validateReportingAccess(
    currentUser: User | null,
    targetOrganizationId?: string
  ): boolean {
    if (!currentUser) {
      return false;
    }

    // Super admins can access all reporting
    if (currentUser.role === 'super_admin') {
      return true;
    }

    // Org admins can only access reporting for their organization
    if (currentUser.role === 'org_admin') {
      return !targetOrganizationId || currentUser.organizationId === targetOrganizationId;
    }

    return false;
  }

  /**
   * Rate limiting for security
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
    const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
    
    if (recentAttempts.length >= maxAttempts) {
      SecureLogger.warn(`Rate limit exceeded for user ${userId}`, { action, attempts: recentAttempts.length });
      return false;
    }
    
    // Add current attempt
    recentAttempts.push(now);
    this.rateLimitMap.set(key, recentAttempts);
    
    return true;
  }

  /**
   * Clears rate limit for a user
   */
  static clearRateLimit(userId: string, action: string): void {
    const key = `${userId}:${action}`;
    this.rateLimitMap.delete(key);
  }
}

export default AccessControl;