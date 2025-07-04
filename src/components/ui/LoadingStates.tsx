import React from 'react';
import { Loader2, AlertTriangle, CheckCircle, Info, XCircle, RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  showSpinner?: boolean;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  showSpinner = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {showSpinner && (
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600`} />
      )}
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  );
};

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  className = ''
}) => {
  return (
    <div className={`text-center py-8 ${className}`}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            action.variant === 'primary'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

interface OperationStatusProps {
  status: 'loading' | 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  progress?: number;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const OperationStatus: React.FC<OperationStatusProps> = ({
  status,
  title,
  message,
  progress,
  onRetry,
  onDismiss,
  className = ''
}) => {
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getBackgroundColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-600">{message}</p>
          
          {progress !== undefined && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          <div className="mt-3 flex space-x-2">
            {onRetry && status === 'error' && (
              <button
                onClick={onRetry}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </button>
            )}
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface PermissionDeniedProps {
  userRole: string;
  requiredRole?: string;
  operation?: string;
  onContactAdmin?: () => void;
  className?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  userRole,
  requiredRole,
  operation,
  onContactAdmin,
  className = ''
}) => {
  const getMessage = () => {
    if (userRole === 'user' || userRole === 'subscriber') {
      return 'This feature is not available for your current access level.';
    }
    
    if (userRole === 'org_admin') {
      return 'You may not have permission for this specific operation.';
    }
    
    return 'You don\'t have permission to perform this operation.';
  };

  const getSuggestion = () => {
    if (userRole === 'user' || userRole === 'subscriber') {
      return 'Contact your organization administrator to request access.';
    }
    
    if (userRole === 'org_admin') {
      return 'Contact your super administrator to request additional permissions.';
    }
    
    return 'Contact your system administrator for assistance.';
  };

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mb-4">
        <XCircle className="h-12 w-12 text-red-500 mx-auto" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
      <p className="text-sm text-gray-600 mb-2">{getMessage()}</p>
      
      {operation && (
        <p className="text-xs text-gray-500 mb-4">
          Operation: <span className="font-mono">{operation}</span>
        </p>
      )}
      
      <p className="text-sm text-gray-600 mb-4">{getSuggestion()}</p>
      
      {onContactAdmin && (
        <button
          onClick={onContactAdmin}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          Contact Administrator
        </button>
      )}
    </div>
  );
};

interface FeatureUnavailableProps {
  feature: string;
  userRole: string;
  suggestion?: string;
  className?: string;
}

export const FeatureUnavailable: React.FC<FeatureUnavailableProps> = ({
  feature,
  userRole,
  suggestion,
  className = ''
}) => {
  const getDefaultSuggestion = () => {
    if (userRole === 'user' || userRole === 'subscriber') {
      return 'Contact your organization administrator to enable this feature.';
    }
    
    if (userRole === 'org_admin') {
      return 'Contact your super administrator to enable this feature.';
    }
    
    return 'This feature is not currently available.';
  };

  return (
    <div className={`text-center py-8 ${className}`}>
      <div className="mb-4">
        <Info className="h-12 w-12 text-blue-500 mx-auto" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">Feature Unavailable</h3>
      <p className="text-sm text-gray-600 mb-2">
        The <span className="font-medium">{feature}</span> feature is not available for your current access level.
      </p>
      
      <p className="text-sm text-gray-600">
        {suggestion || getDefaultSuggestion()}
      </p>
    </div>
  );
}; 