import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RoleProtectedRouteProps {
  roles: string[];
  permissions?: string[];
  fallbackPath?: string;
  showAccessDenied?: boolean;
}

const RoleProtectedRoute = ({ 
  roles, 
  permissions = [], 
  fallbackPath = '/dashboard',
  showAccessDenied = false 
}: RoleProtectedRouteProps) => {
  const { user, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  const hasRole = roles.includes(user.role);
  
  // Check permission-based access
  const hasAllPermissions = permissions.length === 0 || 
    permissions.every(permission => hasPermission(permission));

  if (!hasRole || !hasAllPermissions) {
    if (showAccessDenied) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button 
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
    
    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
};

export default RoleProtectedRoute; 