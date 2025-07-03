import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface RoleProtectedRouteProps {
  roles?: string[];
  permissions?: string[];
  fallbackPath?: string;
}

const ProtectedRoute = ({ roles, permissions, fallbackPath = '/dashboard' }: RoleProtectedRouteProps = {}) => {
  const { user, hasPermission } = useAuthStore();
  const location = useLocation();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (roles && roles.length > 0) {
    if (!roles.includes(user.role)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  // Check permission-based access if permissions are specified
  if (permissions && permissions.length > 0) {
    const hasAllPermissions = permissions.every(permission => hasPermission(permission));
    if (!hasAllPermissions) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;