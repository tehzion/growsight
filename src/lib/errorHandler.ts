import { useNotificationStore } from '../stores/notificationStore';
import SecureLogger from './secureLogger';

export interface ErrorContext {
  operation: string;
  userRole?: string;
  organizationId?: string;
  userId?: string;
  additionalData?: Record<string, any>;
}

export class ErrorHandler {
  /**
   * Handle errors consistently across all operations
   */
  static handleError(
    error: unknown, 
    context: ErrorContext,
    showNotification: boolean = true
  ): string {
    const errorMessage = this.extractErrorMessage(error);
    const userFriendlyMessage = this.getUserFriendlyMessage(errorMessage, context);
    
    // Log the error with context
    SecureLogger.error(`Operation failed: ${context.operation} - ${errorMessage}`);
    
    // Show notification if requested
    if (showNotification) {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        title: 'Operation Failed',
        message: userFriendlyMessage,
        type: 'error'
      });
    }
    
    return userFriendlyMessage;
  }
  
  /**
   * Handle success operations consistently
   */
  static handleSuccess(
    message: string,
    context: ErrorContext,
    showNotification: boolean = true
  ): void {
    // Log the success
    SecureLogger.info(`Operation successful: ${context.operation}`);
    
    // Show notification if requested
    if (showNotification) {
      const { addNotification } = useNotificationStore.getState();
      addNotification({
        title: 'Success',
        message,
        type: 'success'
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
   * Get user-friendly error messages based on context
   */
  private static getUserFriendlyMessage(errorMessage: string, context: ErrorContext): string {
    const { operation, userRole } = context;
    
    // Handle common error patterns
    if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
      switch (operation) {
        case 'createUser':
          return 'A user with this email already exists. Please use a different email address.';
        case 'updateUser':
          return 'This email is already in use by another user. Please choose a different email.';
        default:
          return 'This item already exists. Please use a different name or identifier.';
      }
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('access denied')) {
      switch (userRole) {
        case 'root':
        case 'super_admin':
          return 'You have permission to perform this operation. Please try again or contact support.';
        case 'org_admin':
          return 'You may not have permission to perform this operation. Contact your super administrator.';
        default:
          return 'You do not have permission to perform this operation. Contact your administrator.';
      }
    }
    
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Network connection issue. Please check your internet connection and try again.';
    }
    
    if (errorMessage.includes('validation') || errorMessage.includes('required')) {
      return 'Please fill in all required fields correctly.';
    }
    
    if (errorMessage.includes('system user') || errorMessage.includes('cannot be deleted')) {
      return 'This item cannot be deleted as it is a system item.';
    }
    
    // Default user-friendly message
    return errorMessage || 'An unexpected error occurred. Please try again.';
  }
  
  /**
   * Validate user permissions for operations
   */
  static validatePermissions(
    userRole: string,
    operation: string,
    targetOrganizationId?: string,
    userOrganizationId?: string
  ): boolean {
    // Root and super admin can do everything
    if (userRole === 'root' || userRole === 'super_admin') {
      return true;
    }
    
    // Org admin can only operate within their organization
    if (userRole === 'org_admin') {
      if (targetOrganizationId && userOrganizationId) {
        return targetOrganizationId === userOrganizationId;
      }
      return true; // If no specific org check needed
    }
    
    // Other roles have limited permissions
    const allowedOperations = [
      'updateProfile',
      'viewProfile',
      'completeAssessment',
      'viewResults'
    ];
    
    return allowedOperations.includes(operation);
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