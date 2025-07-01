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

  // If it's the user's first login and they're not already going to the profile page,
  // redirect them to complete their profile
  if (isFirstLogin && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;