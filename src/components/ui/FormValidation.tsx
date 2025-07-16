import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Info, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
}

interface ValidationRules {
  [fieldName: string]: ValidationRule;
}

interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface FormValidationProps {
  rules: ValidationRules;
  data: Record<string, any>;
  onValidationChange?: (errors: ValidationError[]) => void;
  showRealTime?: boolean;
  className?: string;
}

export const FormValidation: React.FC<FormValidationProps> = ({
  rules,
  data,
  onValidationChange,
  showRealTime = true,
  className = ''
}) => {
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const { user } = useAuthStore();

  const validateField = (fieldName: string, value: any): ValidationError | null => {
    const rule = rules[fieldName];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return {
        field: fieldName,
        message: rule.message || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`,
        type: 'error'
      };
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && !value.trim())) {
      return null;
    }

    // Length validations
    if (typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${rule.minLength} characters`,
          type: 'error'
        };
      }

      if (rule.maxLength && value.length > rule.maxLength) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be no more than ${rule.maxLength} characters`,
          type: 'error'
        };
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return {
          field: fieldName,
          message: rule.message || `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} format is invalid`,
          type: 'error'
        };
      }
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        return {
          field: fieldName,
          message: typeof result === 'string' ? result : `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is invalid`,
          type: 'error'
        };
      }
    }

    return null;
  };

  const validateAll = useCallback((): ValidationError[] => {
    const newErrors: ValidationError[] = [];
    
    Object.keys(rules).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors.push(error);
      }
    });

    return newErrors;
  }, [rules, data]);

  useEffect(() => {
    if (showRealTime) {
      const newErrors = validateAll();
      setErrors(newErrors);
      onValidationChange?.(newErrors);
    }
  }, [data, rules, showRealTime, validateAll]);

  const markFieldAsTouched = (fieldName: string) => {
    setTouched(prev => new Set([...prev, fieldName]));
  };

  const getFieldError = (fieldName: string): ValidationError | undefined => {
    return errors.find(error => error.field === fieldName);
  };

  const isFieldTouched = (fieldName: string): boolean => {
    return touched.has(fieldName);
  };

  const isValid = errors.length === 0;

  return {
    errors,
    isValid,
    getFieldError,
    isFieldTouched,
    markFieldAsTouched,
    validateAll
  };
};

interface ValidationMessageProps {
  error?: ValidationError;
  touched?: boolean;
  className?: string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  error,
  touched,
  className = ''
}) => {
  if (!error || !touched) return null;

  const getIcon = () => {
    switch (error.type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
  };

  const getTextColor = () => {
    switch (error.type) {
      case 'error':
        return 'text-red-600';
      case 'warning':
        return 'text-yellow-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-red-600';
    }
  };

  return (
    <div className={`flex items-center space-x-1 mt-1 ${getTextColor()} ${className}`}>
      {getIcon()}
      <span className="text-sm">{error.message}</span>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: ValidationError;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPasswordToggle?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required,
  disabled,
  className = '',
  showPasswordToggle = false
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = error && touched;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          id={name}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${hasError 
              ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
              : isFocused 
                ? 'border-blue-300' 
                : 'border-gray-300'
            }
            ${showPasswordToggle && type === 'password' ? 'pr-10' : ''}
          `}
        />
        
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            )}
          </button>
        )}
      </div>
      
      <ValidationMessage error={error} touched={touched} />
    </div>
  );
};

// Predefined validation rules for common fields
export const commonValidationRules: Record<string, ValidationRule> = {
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'First name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes'
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Last name must be 2-50 characters and contain only letters, spaces, hyphens, and apostrophes'
  },
  phone: {
    pattern: /^[\+]?[1-9][\d]{0,15}$/,
    message: 'Please enter a valid phone number'
  },
  organizationName: {
    required: true,
    minLength: 2,
    maxLength: 100,
    message: 'Organization name must be 2-100 characters'
  },
  staffId: {
    pattern: /^[A-Z0-9]{3,10}$/,
    message: 'Staff ID must be 3-10 characters of uppercase letters and numbers'
  }
};

// Role-specific validation rules
export const getRoleSpecificRules = (userRole: string): Record<string, ValidationRule> => {
  const baseRules = { ...commonValidationRules };

  switch (userRole) {
    case 'root':
    case 'super_admin':
      // Super admins have more flexible rules
      return {
        ...baseRules,
        organizationName: {
          ...baseRules.organizationName,
          maxLength: 200 // Allow longer org names for super admins
        }
      };
    
    case 'org_admin':
      // Org admins have standard rules
      return baseRules;
    
    default:
      // Regular users have stricter rules
      return {
        ...baseRules,
        password: {
          ...baseRules.password,
          minLength: 10, // Stricter password for regular users
          pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
        }
      };
  }
}; 