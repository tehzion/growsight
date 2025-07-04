import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  XCircle, 
  Loader2,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

// Enhanced Button Component with Loading States
interface EnhancedButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
  showLoadingText?: boolean;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  className = '',
  showLoadingText = true
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (loading || disabled || !onClick) return;
    
    setIsLoading(true);
    try {
      await onClick();
    } catch (error) {
      console.error('Button action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
      case 'secondary':
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500';
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500';
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500';
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500';
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-sm';
    }
  };

  const isDisabled = disabled || loading || isLoading;

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-all duration-200 ease-in-out
        ${getVariantClasses()}
        ${getSizeClasses()}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {(loading || isLoading) ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {showLoadingText && 'Loading...'}
        </>
      ) : (
        <>
          {icon && <span className="mr-2">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};

// Enhanced Form Field with Real-time Validation
interface EnhancedFormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  touched?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showPasswordToggle?: boolean;
  helpText?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: RegExp;
}

export const EnhancedFormField: React.FC<EnhancedFormFieldProps> = ({
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
  showPasswordToggle = false,
  helpText,
  maxLength,
  minLength,
  pattern
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasError = error && touched;
  const hasValue = value && value.trim().length > 0;
  const isValid = hasValue && !hasError;

  const handleFocus = () => {
    setIsFocused(true);
    setIsValidating(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsValidating(false);
    onBlur?.();
  };

  const renderInput = () => {
    const commonProps = {
      id: name,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
      onFocus: handleFocus,
      onBlur: handleBlur,
      placeholder,
      disabled,
      maxLength,
      minLength,
      pattern: pattern?.source,
      className: `
        block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
        transition-all duration-200
        ${hasError 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : isValid
            ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
            : isFocused 
              ? 'border-blue-300' 
              : 'border-gray-300'
        }
        ${showPasswordToggle && type === 'password' ? 'pr-10' : ''}
      `
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={4}
          className={`${commonProps.className} resize-vertical`}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={inputType}
      />
    );
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div className="relative">
        {renderInput()}
        
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
        
        {/* Validation Status Icons */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {isValidating && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          {isValid && !isValidating && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {hasError && !isValidating && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </div>
      </div>
      
      {/* Help Text */}
      {helpText && !hasError && (
        <p className="text-sm text-gray-500">{helpText}</p>
      )}
      
      {/* Error Message */}
      {hasError && (
        <div className="flex items-center space-x-1 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}
      
      {/* Character Count */}
      {maxLength && (
        <p className="text-xs text-gray-500 text-right">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
};

// Enhanced Loading State with Progress
interface EnhancedLoadingStateProps {
  message?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'bar';
  className?: string;
}

export const EnhancedLoadingState: React.FC<EnhancedLoadingStateProps> = ({
  message = 'Loading...',
  progress,
  size = 'md',
  variant = 'spinner',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`${sizeClasses[size]} bg-blue-600 rounded-full animate-pulse`}
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        );
      case 'bar':
        return (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress || 0}%` }}
            />
          </div>
        );
      default:
        return <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />;
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      {renderLoader()}
      <div className="text-center">
        <span className="text-sm text-gray-600">{message}</span>
        {progress !== undefined && variant === 'spinner' && (
          <div className="text-xs text-gray-500 mt-1">{Math.round(progress)}%</div>
        )}
      </div>
    </div>
  );
};

// Enhanced Error Display with Role-specific Support
interface EnhancedErrorDisplayProps {
  error: {
    title: string;
    message: string;
    suggestion?: string;
    action?: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    showSupport?: boolean;
  };
  onRetry?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const EnhancedErrorDisplay: React.FC<EnhancedErrorDisplayProps> = ({
  error,
  onRetry,
  onAction,
  onDismiss,
  className = ''
}) => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const getSupportContact = () => {
    const role = user?.role || 'user';
    
    switch (role) {
      case 'root':
      case 'super_admin':
        return {
          email: 'tech-support@company.com',
          phone: '+1-800-TECH-SUP',
          chat: 'https://support.company.com/tech-chat',
          priority: 'high'
        };
      case 'org_admin':
        return {
          email: 'admin-support@company.com',
          phone: '+1-800-ADMIN-SUP',
          chat: 'https://support.company.com/admin-chat',
          priority: 'medium'
        };
      default:
        return {
          email: 'user-support@company.com',
          phone: '+1-800-USER-SUP',
          chat: 'https://support.company.com/user-chat',
          priority: 'normal'
        };
    }
  };

  const supportInfo = getSupportContact();

  const handleContactSupport = () => {
    const subject = encodeURIComponent(`Support Request: ${error.title}`);
    const body = encodeURIComponent(`
Error Details:
- Title: ${error.title}
- Message: ${error.message}
- User Role: ${user?.role || 'unknown'}
- URL: ${window.location.href}
- Timestamp: ${new Date().toISOString()}
    `);
    
    window.location.href = `mailto:${supportInfo.email}?subject=${subject}&body=${body}`;
  };

  const getIcon = () => {
    switch (error.severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">
            {error.title}
          </h3>
          
          <p className="mt-1 text-sm text-gray-700">
            {error.message}
          </p>
          
          {error.suggestion && (
            <p className="mt-2 text-sm text-gray-600">
              💡 <strong>Suggestion:</strong> {error.suggestion}
            </p>
          )}
          
          {/* Action Buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetry && (
              <EnhancedButton
                onClick={onRetry}
                variant="primary"
                size="sm"
                icon={<RefreshCw className="h-3 w-3" />}
              >
                Try Again
              </EnhancedButton>
            )}
            
            {onAction && error.action && (
              <EnhancedButton
                onClick={onAction}
                variant="secondary"
                size="sm"
              >
                {error.action}
              </EnhancedButton>
            )}
            
            {error.showSupport && (
              <EnhancedButton
                onClick={handleContactSupport}
                variant="secondary"
                size="sm"
                icon={<HelpCircle className="h-3 w-3" />}
              >
                Contact Support
              </EnhancedButton>
            )}
          </div>
          
          {/* Support Information */}
          {error.showSupport && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Need immediate help?</p>
              <div className="flex flex-wrap gap-3 text-xs">
                <a
                  href={`mailto:${supportInfo.email}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-500"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </a>
                <a
                  href={`tel:${supportInfo.phone}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-500"
                >
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </a>
                <a
                  href={supportInfo.chat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-500"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Live Chat
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              {supportInfo.priority === 'high' && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚡ High priority support for administrators
                </p>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="flex-shrink-0">
            <button
              onClick={onDismiss}
              className="bg-transparent rounded-md inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors p-1"
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Success Display
interface EnhancedSuccessDisplayProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  onDismiss?: () => void;
  className?: string;
}

export const EnhancedSuccessDisplay: React.FC<EnhancedSuccessDisplayProps> = ({
  title,
  message,
  action,
  onDismiss,
  className = ''
}) => {
  return (
    <div className={`rounded-lg border border-green-200 bg-green-50 p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-green-800">
            {title}
          </h3>
          
          <p className="mt-1 text-sm text-green-700">
            {message}
          </p>
          
          {action && (
            <div className="mt-3">
              <EnhancedButton
                onClick={action.onClick}
                variant={action.variant || 'primary'}
                size="sm"
              >
                {action.label}
              </EnhancedButton>
            </div>
          )}
        </div>
        
        {onDismiss && (
          <div className="flex-shrink-0">
            <button
              onClick={onDismiss}
              className="bg-transparent rounded-md inline-flex text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors p-1"
            >
              <span className="sr-only">Dismiss</span>
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}; 