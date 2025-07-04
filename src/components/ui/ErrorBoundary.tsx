import React, { Component, ErrorInfo, ReactNode } from 'react';
import { XCircle, RefreshCw, Home, ArrowLeft, HelpCircle, Mail } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundaryClass extends Component<Props & { userRole?: string }, State> {
  constructor(props: Props & { userRole?: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true, 
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({ errorInfo });
    
    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
    
    // Log error to external service (in production)
    if (process.env.NODE_ENV === 'production') {
      // Here you would send to your error tracking service
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleContactSupport = () => {
    const { error, errorId } = this.state;
    const { userRole = 'user' } = this.props;
    
    const subject = encodeURIComponent(`Error Report - ${errorId}`);
    const body = encodeURIComponent(`
Error Details:
- Error ID: ${errorId}
- User Role: ${userRole}
- Error: ${error?.message}
- Stack: ${error?.stack}
- URL: ${window.location.href}
- User Agent: ${navigator.userAgent}
    `);
    
    window.location.href = `mailto:support@example.com?subject=${subject}&body=${body}`;
  };

  getSupportContact = () => {
    const { userRole = 'user' } = this.props;
    
    switch (userRole) {
      case 'root':
      case 'super_admin':
        return {
          email: 'tech-support@company.com',
          phone: '+1-800-TECH-SUP',
          priority: 'high'
        };
      case 'org_admin':
        return {
          email: 'admin-support@company.com',
          phone: '+1-800-ADMIN-SUP',
          priority: 'medium'
        };
      default:
        return {
          email: 'user-support@company.com',
          phone: '+1-800-USER-SUP',
          priority: 'normal'
        };
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      const { fallback, showDetails = false } = this.props;
      const supportContact = this.getSupportContact();

      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="text-center">
              <div className="mb-6">
                <XCircle className="h-16 w-16 text-red-500 mx-auto" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Something Went Wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We're sorry, but something unexpected happened. Our team has been notified and is working to fix this issue.
              </p>

              {errorId && (
                <p className="text-sm text-gray-500 mb-6">
                  Error ID: <span className="font-mono">{errorId}</span>
                </p>
              )}
              
              {/* Recovery Actions */}
              <div className="space-y-3 mb-6">
                <button
                  onClick={this.handleRetry}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </button>
                
                <button
                  onClick={this.handleGoBack}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </button>
              </div>

              {/* Support Information */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Need Help?
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${supportContact.email}?subject=Error Report - ${errorId}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {supportContact.email}
                    </a>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-2">
                    <HelpCircle className="h-4 w-4" />
                    <a
                      href={`tel:${supportContact.phone}`}
                      className="text-blue-600 hover:text-blue-500"
                    >
                      {supportContact.phone}
                    </a>
                  </div>
                </div>

                {supportContact.priority === 'high' && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚡ High priority support for administrators
                  </p>
                )}
              </div>

              {/* Technical Details (for developers/admins) */}
              {showDetails && error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Technical Details
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded-md">
                    <p className="text-xs font-mono text-gray-800 break-all">
                      <strong>Error:</strong> {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-xs font-mono text-gray-600 mt-2 overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper component to provide user role context
export const ErrorBoundary: React.FC<Props> = (props) => {
  const { user } = useAuthStore();
  
  return (
    <ErrorBoundaryClass
      {...props}
      userRole={user?.role}
    />
  );
};

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const { user } = useAuthStore();

  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // In production, you would send to your error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { tags: { context, userRole: user?.role } });
    }
  };

  const createErrorBoundary = (fallback?: ReactNode) => {
    return ({ children }: { children: ReactNode }) => (
      <ErrorBoundary fallback={fallback}>
        {children}
      </ErrorBoundary>
    );
  };

  return {
    handleError,
    createErrorBoundary
  };
};

export default ErrorBoundary;