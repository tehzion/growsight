import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { AccessControl } from '../../lib/accessControl';
import SecureLogger from '../../lib/secureLogger';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  requiredFeature?: string;
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  requiredPermissions = [],
  requiredFeature,
  fallbackPath = '/dashboard',
  showAccessDenied = false
}) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    SecureLogger.warn('Unauthorized access attempt', {
      path: location.pathname,
      reason: 'not-authenticated'
    });
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    SecureLogger.warn('Role-based access denied', {
      path: location.pathname,
      userRole: user.role,
      requiredRoles: allowedRoles
    });
    
    if (showAccessDenied) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have the required role to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required roles: {allowedRoles.join(', ')}
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    return <Navigate to={fallbackPath} replace />;
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => 
      AccessControl.hasPermission(user, permission)
    );
    
    if (!hasAllPermissions) {
      SecureLogger.warn('Permission-based access denied', {
        path: location.pathname,
        userRole: user.role,
        requiredPermissions,
        userPermissions: AccessControl.ROLE_PERMISSIONS[user.role as keyof typeof AccessControl.ROLE_PERMISSIONS] || []
      });
      
      if (showAccessDenied) {
        return (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">
                You don't have the required permissions to access this page.
              </p>
              <p className="text-sm text-gray-500">
                Required permissions: {requiredPermissions.join(', ')}
              </p>
              <button
                onClick={() => window.history.back()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check feature-based access
  if (requiredFeature && !AccessControl.canAccessFeature(user, requiredFeature)) {
    SecureLogger.warn('Feature-based access denied', {
      path: location.pathname,
      userRole: user.role,
      requiredFeature
    });
    
    if (showAccessDenied) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="text-6xl mb-4">⚙️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Feature Not Available</h2>
            <p className="text-gray-600 mb-4">
              This feature is not available for your role.
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    return <Navigate to={fallbackPath} replace />;
  }

  // Log successful access
  SecureLogger.dev('Route access granted', {
    path: location.pathname,
    userRole: user.role,
    userId: user.id
  });

  return <>{children}</>;
};

export default RoleProtectedRoute; 