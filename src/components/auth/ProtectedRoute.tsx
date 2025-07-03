import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useProfileStore } from '../../stores/profileStore';

const ProtectedRoute = () => {
  const { user } = useAuthStore();
  const { isFirstLogin } = useProfileStore();
  const location = useLocation();

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Skip profile completion for root and super admin users
  const shouldSkipProfileCompletion = user?.role === 'root' || user?.role === 'super_admin';
  
  // If it's the user's first login and they're not already going to the profile page,
  // redirect them to complete their profile (except for root and super admin users)
  if (isFirstLogin && !shouldSkipProfileCompletion && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;