import { useNotificationStore } from '../stores/notificationStore';
import SecureLogger from './secureLogger';

export interface ErrorContext {
  operation: string;
  userRole?: string;
  organizationId?: string;
  userId?: string;
  additionalData?: Record<string, any>;
  component?: string;
  action?: string;
}

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
  action?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  showSupport?: boolean;
}

export class ErrorHandler {
  // Role-specific error messages
  private static readonly ROLE_MESSAGES = {
    root: {
      permission: 'You have full system access. If you\'re seeing this error, it may be a system issue.',
      suggestion: 'Contact technical support if the problem persists.',
      support: 'Contact system administrator'
    },
    super_admin: {
      permission: 'You have administrative access. This operation should be available to you.',
      suggestion: 'Try refreshing the page or contact support if the issue continues.',
      support: 'Contact technical support'
    },
    org_admin: {
      permission: 'You may not have permission for this specific operation.',
      suggestion: 'Contact your super administrator to request additional permissions.',
      support: 'Contact your super administrator'
    },
    user: {
      permission: 'You don\'t have permission to perform this operation.',
      suggestion: 'Contact your organization administrator for assistance.',
      support: 'Contact your organization administrator'
    },
    subscriber: {
      permission: 'This feature is not available for your subscription level.',
      suggestion: 'Contact your organization administrator to upgrade your access.',
      support: 'Contact your organization administrator'
    }
  };

  // Operation-specific error messages
  private static readonly OPERATION_MESSAGES = {
    // User Management
    createUser: {
      duplicate: 'A user with this email already exists in the system.',
      suggestion: 'Please use a different email address or contact the existing user.',
      action: 'Try a different email address'
    },
    updateUser: {
      notFound: 'The user you\'re trying to update could not be found.',
      suggestion: 'The user may have been deleted or you may not have access to them.',
      action: 'Refresh the user list and try again'
    },
    deleteUser: {
      hasData: 'This user cannot be deleted because they have associated data.',
      suggestion: 'Consider deactivating the user instead of deleting them.',
      action: 'Deactivate user instead'
    },

    // Assessment Management
    createAssessment: {
      validation: 'Please fill in all required assessment fields correctly.',
      suggestion: 'Check that all mandatory fields are completed.',
      action: 'Review and complete all required fields'
    },
    updateAssessment: {
      inProgress: 'This assessment cannot be modified while it\'s in progress.',
      suggestion: 'Wait for the assessment to complete or contact participants.',
      action: 'Wait for assessment completion'
    },
    deleteAssessment: {
      hasResponses: 'This assessment cannot be deleted because it has responses.',
      suggestion: 'Consider archiving the assessment instead.',
      action: 'Archive assessment instead'
    },

    // Export Operations
    exportData: {
      noData: 'No data available for export with the current filters.',
      suggestion: 'Try adjusting your filters or date range.',
      action: 'Modify export filters'
    },
    exportLarge: 'The export contains a large amount of data and may take a while.',
    exportFailed: 'Export failed due to a system error.',

    // Authentication
    login: {
      invalid: 'Invalid email or password. Please try again.',
      suggestion: 'Check your credentials and ensure caps lock is off.',
      action: 'Verify your login details'
    },
    sessionExpired: 'Your session has expired. Please log in again.',
    accessDenied: 'Access denied. You don\'t have permission for this resource.',

    // Network & System
    network: {
      connection: 'Network connection issue. Please check your internet connection.',
      timeout: 'Request timed out. Please try again.',
      server: 'Server is temporarily unavailable. Please try again later.'
    },
    system: {
      maintenance: 'System is under maintenance. Please try again later.',
      overload: 'System is experiencing high load. Please try again in a few minutes.',
      error: 'An unexpected system error occurred.'
    }
  };

  /**
   * Handle errors consistently across all operations with enhanced user feedback
   */
  static handleError(
    error: unknown, 
    context: ErrorContext,
    showNotification: boolean = true
  ): UserFriendlyError {
    const errorMessage = this.extractErrorMessage(error);
    const userFriendlyError = this.getUserFriendlyError(errorMessage, context);
    
    // Log the error with context
    SecureLogger.error(`Operation failed: ${context.operation} - ${errorMessage}`, {
      context,
      error: errorMessage
    });
    
    // Show notification if requested
    if (showNotification) {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        title: userFriendlyError.title,
        message: userFriendlyError.message,
        type: userFriendlyError.severity === 'critical' ? 'error' : 
              userFriendlyError.severity === 'warning' ? 'warning' : 'info'
      });
    }
    
    return userFriendlyError;
  }
  
  /**
   * Handle success operations consistently with role-appropriate messaging
   */
  static handleSuccess(
    message: string,
    context: ErrorContext,
    showNotification: boolean = true,
    customTitle?: string
  ): void {
    // Log the success
    SecureLogger.info(`Operation successful: ${context.operation}`, { context });
    
    // Show notification if requested
    if (showNotification) {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        title: customTitle || 'Success',
        message,
        type: 'success'
      });
    }
  }

  /**
   * Handle warnings with appropriate user guidance
   */
  static handleWarning(
    message: string,
    context: ErrorContext,
    showNotification: boolean = true,
    suggestion?: string
  ): void {
    // Log the warning
    SecureLogger.warn(`Operation warning: ${context.operation} - ${message}`, { context });
    
    // Show notification if requested
    if (showNotification) {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        title: 'Warning',
        message: suggestion ? `${message} ${suggestion}` : message,
        type: 'warning'
      });
    }
  }
  
  /**
   * Extract error message from various error types
   */
  private static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    
    return 'An unexpected error occurred';
  }
  
  /**
   * Get comprehensive user-friendly error information
   */
  private static getUserFriendlyError(errorMessage: string, context: ErrorContext): UserFriendlyError {
    const { operation, userRole = 'user' } = context;
    const roleMessages = this.ROLE_MESSAGES[userRole as keyof typeof this.ROLE_MESSAGES] || this.ROLE_MESSAGES.user;
    const operationMessages = this.OPERATION_MESSAGES[operation as keyof typeof this.OPERATION_MESSAGES];

    // Handle specific operation errors
    if (operationMessages) {
      for (const [key, value] of Object.entries(operationMessages)) {
        if (typeof value === 'object' && errorMessage.toLowerCase().includes(key)) {
          return {
            title: 'Operation Failed',
            message: value.message || value,
            suggestion: value.suggestion,
            action: value.action,
            severity: 'error',
            showSupport: true
          };
        }
      }
    }

    // Handle common error patterns
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
      return {
        title: 'Duplicate Entry',
        message: operationMessages?.duplicate || 'This item already exists.',
        suggestion: operationMessages?.suggestion || 'Please use a different identifier.',
        action: operationMessages?.action || 'Try a different value',
        severity: 'warning',
        showSupport: false
      };
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      return {
        title: 'Access Denied',
        message: roleMessages.permission,
        suggestion: roleMessages.suggestion,
        action: 'Contact administrator',
        severity: 'error',
        showSupport: true
      };
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        title: 'Connection Error',
        message: this.OPERATION_MESSAGES.network.connection,
        suggestion: 'Check your internet connection and try again.',
        action: 'Retry operation',
        severity: 'warning',
        showSupport: false
      };
    }

    if (errorMessage.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: this.OPERATION_MESSAGES.network.timeout,
        suggestion: 'The operation is taking longer than expected.',
        action: 'Try again',
        severity: 'warning',
        showSupport: false
      };
    }
    
    if (errorMessage.includes('validation') || errorMessage.includes('required')) {
      return {
        title: 'Validation Error',
        message: 'Please fill in all required fields correctly.',
        suggestion: 'Check that all mandatory fields are completed.',
        action: 'Review form fields',
        severity: 'warning',
        showSupport: false
      };
    }
    
    if (errorMessage.includes('system user') || errorMessage.includes('cannot be deleted')) {
      return {
        title: 'Protected Item',
        message: 'This item cannot be deleted as it is a system item.',
        suggestion: 'Consider deactivating or archiving instead.',
        action: 'Use alternative action',
        severity: 'warning',
        showSupport: false
      };
    }

    if (errorMessage.includes('maintenance')) {
      return {
        title: 'System Maintenance',
        message: this.OPERATION_MESSAGES.system.maintenance,
        suggestion: 'Please try again in a few minutes.',
        action: 'Wait and retry',
        severity: 'info',
        showSupport: false
      };
    }

    if (errorMessage.includes('overload') || errorMessage.includes('high load')) {
      return {
        title: 'System Busy',
        message: this.OPERATION_MESSAGES.system.overload,
        suggestion: 'Please try again in a few minutes.',
        action: 'Wait and retry',
        severity: 'warning',
        showSupport: false
      };
    }
    
    // Default error handling
    return {
      title: 'Unexpected Error',
      message: errorMessage || 'An unexpected error occurred. Please try again.',
      suggestion: 'If this problem persists, contact support.',
      action: 'Try again',
      severity: 'error',
      showSupport: true
    };
  }

  /**
   * Get role-specific support contact information
   */
  static getSupportContact(userRole: string): string {
    const roleMessages = this.ROLE_MESSAGES[userRole as keyof typeof this.ROLE_MESSAGES] || this.ROLE_MESSAGES.user;
    return roleMessages.support;
  }

  /**
   * Validate user permissions for operations with enhanced feedback
   */
  static validatePermissions(
    userRole: string,
    operation: string,
    targetOrganizationId?: string,
    userOrganizationId?: string
  ): { allowed: boolean; reason?: string; suggestion?: string } {
    // Root and super admin can do everything
    if (userRole === 'root' || userRole === 'super_admin') {
      return { allowed: true };
    }
    
    // Org admin can only operate within their organization
    if (userRole === 'org_admin') {
      if (targetOrganizationId && userOrganizationId) {
        if (targetOrganizationId !== userOrganizationId) {
          return {
            allowed: false,
            reason: 'You can only manage resources within your own organization.',
            suggestion: 'Contact your super administrator if you need cross-organization access.'
          };
        }
      }
      return { allowed: true };
    }
    
    // Other roles have limited permissions
    const allowedOperations = [
      'updateProfile',
      'viewProfile',
      'completeAssessment',
      'viewResults',
      'viewOwnData'
    ];
    
    if (!allowedOperations.includes(operation)) {
      return {
        allowed: false,
        reason: 'This operation is not available for your role.',
        suggestion: 'Contact your organization administrator for assistance.'
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Get operation-specific validation rules
   */
  static getValidationRules(operation: string): {
    requiredFields: string[];
    optionalFields: string[];
    maxLengths: Record<string, number>;
  } {
    const rules = {
      createUser: {
        requiredFields: ['firstName', 'lastName', 'email', 'role', 'organizationId'],
        optionalFields: ['departmentId', 'phone', 'jobTitle'],
        maxLengths: {
          firstName: 50,
          lastName: 50,
          email: 255,
          phone: 20,
          jobTitle: 100
        }
      },
      updateUser: {
        requiredFields: ['firstName', 'lastName', 'email'],
        optionalFields: ['role', 'departmentId', 'phone', 'jobTitle'],
        maxLengths: {
          firstName: 50,
          lastName: 50,
          email: 255,
          phone: 20,
          jobTitle: 100
        }
      },
      updateProfile: {
        requiredFields: ['firstName', 'lastName', 'email'],
        optionalFields: ['phone', 'jobTitle', 'location', 'bio', 'departmentId'],
        maxLengths: {
          firstName: 50,
          lastName: 50,
          email: 255,
          phone: 20,
          jobTitle: 100,
          location: 100,
          bio: 500
        }
      },
      createOrganization: {
        requiredFields: ['name'],
        optionalFields: ['description'],
        maxLengths: {
          name: 100,
          description: 500
        }
      },
      updateOrganization: {
        requiredFields: ['name'],
        optionalFields: ['description'],
        maxLengths: {
          name: 100,
          description: 500
        }
      }
    };
    
    return rules[operation as keyof typeof rules] || {
      requiredFields: [],
      optionalFields: [],
      maxLengths: {}
    };
  }
  
  /**
   * Validate form data against rules
   */
  static validateFormData(
    data: Record<string, any>,
    operation: string
  ): { isValid: boolean; errors: Record<string, string> } {
    const rules = this.getValidationRules(operation);
    const errors: Record<string, string> = {};
    
    // Check required fields
    rules.requiredFields.forEach(field => {
      const value = data[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    
    // Check field lengths
    Object.entries(rules.maxLengths).forEach(([field, maxLength]) => {
      const value = data[field];
      if (value && typeof value === 'string' && value.length > maxLength) {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} must be ${maxLength} characters or less`;
      }
    });
    
    // Validate email format
    if (data.email && !this.isValidEmail(data.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Validate phone format
    if (data.phone && !this.isValidPhone(data.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
  
  /**
   * Validate email format
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate phone format
   */
  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }
}

export default ErrorHandler; 