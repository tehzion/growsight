import React from 'react';
import { AlertTriangle, Info, XCircle, CheckCircle, HelpCircle, ExternalLink } from 'lucide-react';
import { UserFriendlyError } from '../../lib/errorHandler';

interface ErrorDisplayProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onAction?: () => void;
  onDismiss?: () => void;
  showSupport?: boolean;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onAction,
  onDismiss,
  showSupport = true,
  className = ''
}) => {
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

  const getTextColor = () => {
    switch (error.severity) {
      case 'critical':
        return 'text-red-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const getSupportContact = () => {
    // This would be dynamically determined based on user role
    return 'support@example.com';
  };

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${getTextColor()}`}>
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
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Try Again
              </button>
            )}
            
            {onAction && error.action && (
              <button
                onClick={onAction}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                {error.action}
              </button>
            )}
            
            {showSupport && error.showSupport && (
              <a
                href={`mailto:${getSupportContact()}?subject=Support Request: ${error.title}`}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                <HelpCircle className="h-3 w-3 mr-1" />
                Contact Support
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            )}
          </div>
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

interface ErrorBoundaryDisplayProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  onRetry?: () => void;
  userRole?: string;
}

export const ErrorBoundaryDisplay: React.FC<ErrorBoundaryDisplayProps> = ({
  error,
  errorInfo,
  onRetry,
  userRole = 'user'
}) => {
  const getErrorContext = (): UserFriendlyError => {
    // Determine error type and provide appropriate messaging
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection.',
        suggestion: 'Try refreshing the page or check your network connection.',
        action: 'Refresh Page',
        severity: 'warning',
        showSupport: false
      };
    }

    if (error.message.includes('permission') || error.message.includes('access')) {
      return {
        title: 'Access Denied',
        message: 'You don\'t have permission to access this resource.',
        suggestion: 'Contact your administrator if you believe this is an error.',
        action: 'Go Back',
        severity: 'error',
        showSupport: true
      };
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return {
        title: 'Invalid Data',
        message: 'The data provided is invalid or incomplete.',
        suggestion: 'Please check your input and try again.',
        action: 'Review Input',
        severity: 'warning',
        showSupport: false
      };
    }

    // Default error handling
    return {
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred. Our team has been notified.',
      suggestion: 'Try refreshing the page or contact support if the problem persists.',
      action: 'Refresh Page',
      severity: 'error',
      showSupport: true
    };
  };

  const errorContext = getErrorContext();

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          error={errorContext}
          onRetry={handleRetry}
          onAction={() => window.history.back()}
          className="mb-4"
        />
        
        {/* Technical Details (only for developers/admins) */}
        {(userRole === 'root' || userRole === 'super_admin') && (
          <details className="mt-4 text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-800">
              Technical Details
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded-md font-mono">
              <p><strong>Error:</strong> {error.message}</p>
              {errorInfo && (
                <>
                  <p><strong>Component Stack:</strong></p>
                  <pre className="mt-1 text-xs overflow-auto">
                    {errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay; 