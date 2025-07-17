import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useProfileStore } from './stores/profileStore';
import Layout from './components/layout/Layout';
import AuthLayout from './components/layout/AuthLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/auth/Login';
import RequestAccess from './pages/auth/RequestAccess';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import SetPassword from './pages/auth/SetPassword';
import OTPVerification from './pages/auth/OTPVerification';
import Organizations from './pages/admin/Organizations';
import Users from './pages/admin/Users';
import Assessments from './pages/admin/Assessments';
import AssessmentAssignments from './pages/admin/AssessmentAssignments';
import Results from './pages/admin/Results';
import AssessmentResults from './pages/admin/AssessmentResults';
import AdminAssessmentReport from './pages/admin/AdminAssessmentReport';
import PermissionManager from './pages/admin/PermissionManager';
import ImportExport from './pages/admin/ImportExport';
import TemplateManager from './pages/admin/TemplateManager';
import EmailTemplateManager from './pages/admin/EmailTemplateManager';
import Reporting from './pages/admin/Reporting';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/auth/ProtectedRoute';
import UserAssessments from './pages/user/UserAssessments';
import UserResults from './pages/user/UserResults';
import UserProfile from './pages/user/UserProfile';
import AssessmentBuilder from './pages/admin/AssessmentBuilder';
import AssessmentForm from './pages/user/AssessmentForm';
import { config, validateEnvironment } from './config/environment';
import SystemSettings from './pages/admin/SystemSettings';
import RootDashboard from './pages/root/RootDashboard';

import AccessRequests from './pages/admin/AccessRequests';
import Branding from './pages/admin/Branding';
import OrganizationBrandingPage from './pages/admin/OrganizationBrandingPage';

import CompetencyManager from './pages/admin/CompetencyManager';
import SupportHub from './pages/admin/SupportHub';
import { ToastContainer } from './components/ui/ToastNotification';
import ErrorBoundary from './components/ui/ErrorBoundary';
import SecureLogger from './lib/secureLogger';
import SubscriberAssessments from './pages/subscriber/SubscriberAssessments';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import Assessment360Reporting from './pages/admin/Assessment360Reporting';
import Assessment360Selector from './components/assessments/Assessment360Selector';
import SessionMonitor from './components/security/SessionMonitor';

function App() {
  const { user, refreshSession, logout, updateActivity, validateSession } = useAuthStore();
  const { fetchProfile } = useProfileStore();
  
  // Validate environment on app start
  useEffect(() => {
    const { isValid, errors } = validateEnvironment();
    if (!isValid) {
      SecureLogger.warn('Environment validation failed', { errorCount: errors.length });
    }
  }, []);
  
  // Refresh session on app start
  useEffect(() => {
    refreshSession();
    
    // Set up session refresh interval
    const refreshInterval = setInterval(() => {
      refreshSession();
    }, Math.min(config.security.sessionTimeout, 3600000)); // Refresh at least every hour
    
    return () => clearInterval(refreshInterval);
  }, [refreshSession]);
  
  // Fetch user profile when user is authenticated
  useEffect(() => {
    if (user) {
      fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  // Set up session security event listeners
  useEffect(() => {
    const handleSessionExpired = (event: CustomEvent) => {
      console.warn('Session expired:', event.detail.reason);
      logout();
    };

    const handleUserActivity = () => {
      if (user) {
        updateActivity();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Validate session when tab becomes visible
        if (!validateSession()) {
          logout();
        }
      }
    };

    // Listen for session expiration events
    window.addEventListener('sessionExpired', handleSessionExpired as EventListener);
    
    // Monitor user activity
    window.addEventListener('focus', handleUserActivity);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired as EventListener);
      window.removeEventListener('focus', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, logout, updateActivity, validateSession]);
  
  return (
    <ErrorBoundary>
      <ToastContainer position="top-right" />
      <Routes>
        {/* Auth Routes - Always accessible */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            <ErrorBoundary fallback={<div className="p-4 text-center">Error loading login page. Please refresh.</div>}>
              <Login />
            </ErrorBoundary>
          } />
          <Route path="/request-access" element={
            <ErrorBoundary>
              <RequestAccess />
            </ErrorBoundary>
          } />
          <Route path="/forgot-password" element={
            <ErrorBoundary>
              <ForgotPassword />
            </ErrorBoundary>
          } />
          <Route path="/reset-password" element={
            <ErrorBoundary>
              <ResetPassword />
            </ErrorBoundary>
          } />
          <Route path="/set-password" element={
            <ErrorBoundary>
              <SetPassword />
            </ErrorBoundary>
          } />
          <Route path="/verify-otp" element={
            <ErrorBoundary>
              <OTPVerification />
            </ErrorBoundary>
          } />
        </Route>
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            {/* Admin Routes */}
            <Route path="/dashboard" element={
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            } />
            <Route path="/root-dashboard" element={
              <ErrorBoundary>
                <RootDashboard />
              </ErrorBoundary>
            } />
            <Route path="/organizations" element={
              <ErrorBoundary>
                <Organizations />
              </ErrorBoundary>
            } />
            <Route path="/permissions" element={
              <ErrorBoundary>
                <PermissionManager />
              </ErrorBoundary>
            } />
            <Route path="/users" element={
              <ErrorBoundary>
                <Users />
              </ErrorBoundary>
            } />
            <Route path="/assessments" element={
              <ErrorBoundary>
                <Assessments />
              </ErrorBoundary>
            } />
            <Route path="/assessments/builder/:id" element={
              <ErrorBoundary>
                <AssessmentBuilder />
              </ErrorBoundary>
            } />
            <Route path="/assessment-assignments" element={
              <ErrorBoundary>
                <AssessmentAssignments />
              </ErrorBoundary>
            } />
            <Route path="/results" element={
              <ErrorBoundary>
                <Results />
              </ErrorBoundary>
            } />
            <Route path="/assessment-results" element={
              <ErrorBoundary>
                <AssessmentResults />
              </ErrorBoundary>
            } />

            <Route path="/admin/assessment-report/:userId/:assessmentId" element={
              <ErrorBoundary>
                <AdminAssessmentReport />
              </ErrorBoundary>
            } />

            <Route path="/assessment-360" element={
              <ErrorBoundary>
                <RoleProtectedRoute 
                  allowedRoles={['super_admin', 'org_admin']}
                  requiredPermissions={['view_results']}
                  requiredFeature="reporting"
                >
                  <Assessment360Selector />
                </RoleProtectedRoute>
              </ErrorBoundary>
            } />

            <Route path="/assessment-360/:assessmentId/:participantId?" element={
              <ErrorBoundary>
                <RoleProtectedRoute 
                  allowedRoles={['super_admin', 'org_admin']}
                  requiredPermissions={['view_results']}
                  requiredFeature="reporting"
                >
                  <Assessment360Reporting />
                </RoleProtectedRoute>
              </ErrorBoundary>
            } />

            <Route path="/import-export" element={
              <ErrorBoundary>
                <ImportExport />
              </ErrorBoundary>
            } />

            <Route path="/templates" element={
              <ErrorBoundary>
                <TemplateManager />
              </ErrorBoundary>
            } />

            <Route path="/email-templates" element={
              <ErrorBoundary>
                <EmailTemplateManager />
              </ErrorBoundary>
            } />

            <Route path="/reporting" element={
              <ErrorBoundary>
                <RoleProtectedRoute 
                  allowedRoles={['super_admin', 'org_admin']}
                  requiredPermissions={['view_reports']}
                  requiredFeature="reporting"
                >
                  <Reporting />
                </RoleProtectedRoute>
              </ErrorBoundary>
            } />

            <Route path="/competencies" element={
              <ErrorBoundary>
                <CompetencyManager />
              </ErrorBoundary>
            } />
            <Route path="/support" element={
              <ErrorBoundary>
                <SupportHub />
              </ErrorBoundary>
            } />
            
            {/* Super Admin System Management */}
            <Route path="/system-settings" element={
              <ErrorBoundary>
                <SystemSettings />
              </ErrorBoundary>
            } />

            <Route path="/access-requests" element={
              <ErrorBoundary>
                <AccessRequests />
              </ErrorBoundary>
            } />
            <Route path="/branding" element={
              <ErrorBoundary>
                <Branding />
              </ErrorBoundary>
            } />
            <Route path="/organization-branding" element={
              <ErrorBoundary>
                <OrganizationBrandingPage />
              </ErrorBoundary>
            } />

            {/* User Routes */}
            <Route path="/user-assessments" element={
              <ErrorBoundary>
                <UserAssessments />
              </ErrorBoundary>
            } />
            <Route path="/user-results" element={
              <ErrorBoundary>
                <UserResults />
              </ErrorBoundary>
            } />
            <Route path="/user-profile" element={
              <ErrorBoundary>
                <UserProfile />
              </ErrorBoundary>
            } />
            <Route path="/assessment/:id" element={
              <ErrorBoundary>
                <AssessmentForm />
              </ErrorBoundary>
            } />

            {/* Subscriber Routes */}
            <Route path="/subscriber-assessments" element={
              <ErrorBoundary>
                <SubscriberAssessments />
              </ErrorBoundary>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>
        
        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Session Monitor - only show for authenticated users */}
      {user && <SessionMonitor />}
    </ErrorBoundary>
  );
}

export default App;