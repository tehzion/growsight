/**
 * Enhanced Role-Based Access Control (RBAC) System
 * Provides granular permissions, conditional access, and permission delegation
 */

import { User } from '../../types';
import SecureLogger from '../secureLogger';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: PermissionCategory;
  subPermissions?: SubPermission[];
  conditions?: PermissionCondition[];
}

export interface SubPermission {
  id: string;
  name: string;
  description: string;
  parent: string;
}

export interface PermissionCondition {
  type: 'time' | 'location' | 'resource' | 'context';
  rule: string;
  value: any;
}

export interface PermissionGrant {
  userId: string;
  permission: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  conditions?: PermissionCondition[];
  scope?: string;
}

export type PermissionCategory = 
  | 'user_management' 
  | 'assessment_management' 
  | 'analytics' 
  | 'organization' 
  | 'system' 
  | 'collaboration'
  | 'development'
  | 'reporting';

export class EnhancedRBAC {
  private static instance: EnhancedRBAC | null = null;
  private permissions: Map<string, Permission> = new Map();
  private rolePermissions: Map<string, Set<string>> = new Map();
  private userGrants: Map<string, PermissionGrant[]> = new Map();

  private constructor() {
    this.initializePermissions();
    this.initializeRolePermissions();
  }

  static getInstance(): EnhancedRBAC {
    if (!EnhancedRBAC.instance) {
      EnhancedRBAC.instance = new EnhancedRBAC();
    }
    return EnhancedRBAC.instance;
  }

  /**
   * Initialize enhanced permission system
   */
  private initializePermissions(): void {
    const permissions: Permission[] = [
      // User Management - Enhanced
      {
        id: 'users.view',
        name: 'View Users',
        description: 'View user profiles and basic information',
        category: 'user_management'
      },
      {
        id: 'users.create',
        name: 'Create Users',
        description: 'Create new user accounts',
        category: 'user_management',
        subPermissions: [
          { id: 'users.create.bulk', name: 'Bulk Create', description: 'Create multiple users at once', parent: 'users.create' },
          { id: 'users.create.admin', name: 'Create Admins', description: 'Create admin users', parent: 'users.create' }
        ]
      },
      {
        id: 'users.edit',
        name: 'Edit Users',
        description: 'Modify user profiles and settings',
        category: 'user_management',
        subPermissions: [
          { id: 'users.edit.role', name: 'Change Roles', description: 'Modify user roles', parent: 'users.edit' },
          { id: 'users.edit.sensitive', name: 'Edit Sensitive Data', description: 'Modify sensitive user information', parent: 'users.edit' }
        ]
      },
      {
        id: 'users.delete',
        name: 'Delete Users',
        description: 'Delete user accounts',
        category: 'user_management',
        conditions: [
          { type: 'context', rule: 'require_approval', value: true }
        ]
      },

      // Team Management - New
      {
        id: 'teams.manage',
        name: 'Manage Teams',
        description: 'Create and manage teams',
        category: 'user_management',
        subPermissions: [
          { id: 'teams.create', name: 'Create Teams', description: 'Create new teams', parent: 'teams.manage' },
          { id: 'teams.assign', name: 'Assign Members', description: 'Add/remove team members', parent: 'teams.manage' },
          { id: 'teams.goals', name: 'Manage Team Goals', description: 'Set and track team objectives', parent: 'teams.manage' }
        ]
      },

      // Assessment Management - Enhanced
      {
        id: 'assessments.create',
        name: 'Create Assessments',
        description: 'Create new assessments',
        category: 'assessment_management',
        subPermissions: [
          { id: 'assessments.create.template', name: 'Create Templates', description: 'Create assessment templates', parent: 'assessments.create' },
          { id: 'assessments.create.custom', name: 'Custom Assessments', description: 'Create custom assessments', parent: 'assessments.create' }
        ]
      },
      {
        id: 'assessments.assign',
        name: 'Assign Assessments',
        description: 'Assign assessments to users',
        category: 'assessment_management',
        subPermissions: [
          { id: 'assessments.assign.bulk', name: 'Bulk Assignment', description: 'Assign to multiple users', parent: 'assessments.assign' },
          { id: 'assessments.assign.automated', name: 'Automated Assignment', description: 'Set up automatic assignment rules', parent: 'assessments.assign' }
        ]
      },

      // Analytics & Reporting - Enhanced
      {
        id: 'analytics.view',
        name: 'View Analytics',
        description: 'Access analytics and insights',
        category: 'analytics',
        subPermissions: [
          { id: 'analytics.personal', name: 'Personal Analytics', description: 'View own analytics', parent: 'analytics.view' },
          { id: 'analytics.team', name: 'Team Analytics', description: 'View team analytics', parent: 'analytics.view' },
          { id: 'analytics.org', name: 'Organization Analytics', description: 'View organization-wide analytics', parent: 'analytics.view' }
        ]
      },
      {
        id: 'reports.custom',
        name: 'Custom Reports',
        description: 'Create and manage custom reports',
        category: 'reporting',
        subPermissions: [
          { id: 'reports.build', name: 'Build Reports', description: 'Use report builder', parent: 'reports.custom' },
          { id: 'reports.schedule', name: 'Schedule Reports', description: 'Set up automated reports', parent: 'reports.custom' },
          { id: 'reports.share', name: 'Share Reports', description: 'Share reports with others', parent: 'reports.custom' }
        ]
      },

      // Collaboration - New
      {
        id: 'collaboration.peer_feedback',
        name: 'Peer Feedback',
        description: 'Give and receive peer feedback',
        category: 'collaboration'
      },
      {
        id: 'collaboration.mentorship',
        name: 'Mentorship',
        description: 'Participate in mentorship programs',
        category: 'collaboration',
        subPermissions: [
          { id: 'collaboration.mentor', name: 'Be a Mentor', description: 'Serve as a mentor', parent: 'collaboration.mentorship' },
          { id: 'collaboration.mentee', name: 'Have a Mentor', description: 'Be assigned a mentor', parent: 'collaboration.mentorship' }
        ]
      },

      // Development - New
      {
        id: 'development.goals',
        name: 'Development Goals',
        description: 'Set and track development goals',
        category: 'development',
        subPermissions: [
          { id: 'development.personal', name: 'Personal Goals', description: 'Manage personal development goals', parent: 'development.goals' },
          { id: 'development.team_goals', name: 'Team Goals', description: 'Set goals for team members', parent: 'development.goals' }
        ]
      },
      {
        id: 'development.skills',
        name: 'Skill Management',
        description: 'Manage skills and competencies',
        category: 'development',
        subPermissions: [
          { id: 'development.skill_gap', name: 'Skill Gap Analysis', description: 'Analyze skill gaps', parent: 'development.skills' },
          { id: 'development.career_path', name: 'Career Paths', description: 'View and plan career paths', parent: 'development.skills' }
        ]
      }
    ];

    permissions.forEach(permission => {
      this.permissions.set(permission.id, permission);
    });
  }

  /**
   * Initialize role-based permissions
   */
  private initializeRolePermissions(): void {
    const rolePermissions = {
      super_admin: [
        'users.view', 'users.create', 'users.create.bulk', 'users.create.admin', 'users.edit', 'users.edit.role', 'users.edit.sensitive', 'users.delete',
        'teams.manage', 'teams.create', 'teams.assign', 'teams.goals',
        'assessments.create', 'assessments.create.template', 'assessments.create.custom', 'assessments.assign', 'assessments.assign.bulk', 'assessments.assign.automated',
        'analytics.view', 'analytics.personal', 'analytics.team', 'analytics.org',
        'reports.custom', 'reports.build', 'reports.schedule', 'reports.share',
        'collaboration.peer_feedback', 'collaboration.mentorship', 'collaboration.mentor', 'collaboration.mentee',
        'development.goals', 'development.personal', 'development.team_goals', 'development.skills', 'development.skill_gap', 'development.career_path'
      ],
      org_admin: [
        'users.view', 'users.create', 'users.create.bulk', 'users.edit', 'users.edit.role', 'users.delete',
        'teams.manage', 'teams.create', 'teams.assign', 'teams.goals',
        'assessments.create', 'assessments.create.template', 'assessments.assign', 'assessments.assign.bulk', 'assessments.assign.automated',
        'analytics.view', 'analytics.team', 'analytics.org',
        'reports.custom', 'reports.build', 'reports.schedule', 'reports.share',
        'collaboration.mentorship', 'collaboration.mentor',
        'development.goals', 'development.team_goals', 'development.skills', 'development.skill_gap', 'development.career_path'
      ],
      team_lead: [ // New role
        'users.view', 'users.edit',
        'teams.assign', 'teams.goals',
        'assessments.assign',
        'analytics.view', 'analytics.team',
        'reports.custom', 'reports.build',
        'collaboration.peer_feedback', 'collaboration.mentorship', 'collaboration.mentor',
        'development.goals', 'development.team_goals', 'development.skills'
      ],
      reviewer: [
        'users.view',
        'assessments.assign',
        'analytics.view', 'analytics.personal',
        'collaboration.peer_feedback',
        'development.goals', 'development.personal', 'development.skills'
      ],
      employee: [
        'analytics.view', 'analytics.personal',
        'collaboration.peer_feedback', 'collaboration.mentorship', 'collaboration.mentee',
        'development.goals', 'development.personal', 'development.skills', 'development.skill_gap', 'development.career_path'
      ],
      subscriber: [
        'analytics.view', 'analytics.personal',
        'development.goals', 'development.personal', 'development.skills'
      ]
    };

    Object.entries(rolePermissions).forEach(([role, permissions]) => {
      this.rolePermissions.set(role, new Set(permissions));
    });
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User | null, permissionId: string, context?: any): boolean {
    if (!user) return false;

    // Check role-based permissions
    const rolePerms = this.rolePermissions.get(user.role);
    if (!rolePerms?.has(permissionId)) {
      // Check for granted permissions
      const grants = this.userGrants.get(user.id) || [];
      const hasGrant = grants.some(grant => 
        grant.permission === permissionId && 
        this.isGrantValid(grant, context)
      );
      
      if (!hasGrant) return false;
    }

    // Check permission conditions
    const permission = this.permissions.get(permissionId);
    if (permission?.conditions) {
      return this.checkConditions(permission.conditions, user, context);
    }

    return true;
  }

  /**
   * Grant temporary permission to user
   */
  grantPermission(
    userId: string, 
    permissionId: string, 
    grantedBy: string, 
    expiresAt?: Date,
    conditions?: PermissionCondition[],
    scope?: string
  ): boolean {
    try {
      const grant: PermissionGrant = {
        userId,
        permission: permissionId,
        grantedBy,
        grantedAt: new Date(),
        expiresAt,
        conditions,
        scope
      };

      const userGrants = this.userGrants.get(userId) || [];
      userGrants.push(grant);
      this.userGrants.set(userId, userGrants);

      SecureLogger.info('Permission granted', {
        type: 'rbac',
        context: 'permission_grant',
        userId,
        permission: permissionId,
        grantedBy,
        expiresAt: expiresAt?.toISOString()
      });

      return true;
    } catch (error) {
      SecureLogger.error('Failed to grant permission', {
        type: 'rbac',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Revoke permission grant
   */
  revokePermission(userId: string, permissionId: string): boolean {
    try {
      const userGrants = this.userGrants.get(userId) || [];
      const filteredGrants = userGrants.filter(grant => grant.permission !== permissionId);
      this.userGrants.set(userId, filteredGrants);

      SecureLogger.info('Permission revoked', {
        type: 'rbac',
        context: 'permission_revoke',
        userId,
        permission: permissionId
      });

      return true;
    } catch (error) {
      SecureLogger.error('Failed to revoke permission', {
        type: 'rbac',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get all permissions for a user
   */
  getUserPermissions(user: User): string[] {
    const rolePerms = Array.from(this.rolePermissions.get(user.role) || []);
    const grants = this.userGrants.get(user.id) || [];
    const grantedPerms = grants
      .filter(grant => this.isGrantValid(grant))
      .map(grant => grant.permission);

    return [...new Set([...rolePerms, ...grantedPerms])];
  }

  /**
   * Get permission details
   */
  getPermission(permissionId: string): Permission | undefined {
    return this.permissions.get(permissionId);
  }

  /**
   * Get all permissions in a category
   */
  getPermissionsByCategory(category: PermissionCategory): Permission[] {
    return Array.from(this.permissions.values()).filter(p => p.category === category);
  }

  /**
   * Check if permission grant is valid
   */
  private isGrantValid(grant: PermissionGrant, context?: any): boolean {
    // Check expiration
    if (grant.expiresAt && grant.expiresAt < new Date()) {
      return false;
    }

    // Check conditions
    if (grant.conditions && !this.checkConditions(grant.conditions, null, context)) {
      return false;
    }

    return true;
  }

  /**
   * Check permission conditions
   */
  private checkConditions(conditions: PermissionCondition[], user: User | null, context?: any): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'time':
          return this.checkTimeCondition(condition);
        case 'context':
          return this.checkContextCondition(condition, context);
        case 'resource':
          return this.checkResourceCondition(condition, context);
        default:
          return true;
      }
    });
  }

  private checkTimeCondition(condition: PermissionCondition): boolean {
    const now = new Date();
    const { rule, value } = condition;

    switch (rule) {
      case 'business_hours':
        const hour = now.getHours();
        return hour >= 9 && hour < 17;
      case 'specific_time':
        return now.getTime() >= value.start && now.getTime() <= value.end;
      default:
        return true;
    }
  }

  private checkContextCondition(condition: PermissionCondition, context?: any): boolean {
    const { rule, value } = condition;

    switch (rule) {
      case 'require_approval':
        return context?.approved === true;
      case 'resource_owner':
        return context?.ownerId === context?.userId;
      default:
        return true;
    }
  }

  private checkResourceCondition(condition: PermissionCondition, context?: any): boolean {
    const { rule, value } = condition;

    switch (rule) {
      case 'same_organization':
        return context?.organizationId === value;
      case 'same_department':
        return context?.departmentId === value;
      default:
        return true;
    }
  }

  /**
   * Clean up expired grants
   */
  cleanupExpiredGrants(): number {
    let cleanedCount = 0;
    const now = new Date();

    this.userGrants.forEach((grants, userId) => {
      const validGrants = grants.filter(grant => {
        if (grant.expiresAt && grant.expiresAt < now) {
          cleanedCount++;
          return false;
        }
        return true;
      });
      this.userGrants.set(userId, validGrants);
    });

    if (cleanedCount > 0) {
      SecureLogger.info('Expired permission grants cleaned up', {
        type: 'rbac',
        context: 'cleanup',
        cleanedCount
      });
    }

    return cleanedCount;
  }

  /**
   * Export user permissions for debugging
   */
  exportUserPermissions(user: User): object {
    return {
      userId: user.id,
      role: user.role,
      rolePermissions: Array.from(this.rolePermissions.get(user.role) || []),
      grantedPermissions: this.userGrants.get(user.id) || [],
      allPermissions: this.getUserPermissions(user)
    };
  }
}

export default EnhancedRBAC;