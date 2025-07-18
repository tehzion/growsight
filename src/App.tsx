import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useProfileStore } from './stores/profileStore';
import { useOrganizationStore } from './stores/organizationStore';
import { useBrandingStore } from './stores/brandingStore';
import { config, validateEnvironment } from './config/environment';
import SecureLogger from './lib/secureLogger';
import ContentSecurityPolicy from './lib/security/contentSecurityPolicy';

// Layouts
import AuthLayout from './components/layout/AuthLayout';
import Layout from './components/layout/Layout';

// Auth Pages
import Login from './pages/auth/Login';
import RootLogin from './pages/auth/RootLogin';
import RootRegistration from './pages/auth/RootRegistration';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import OTPVerification from './pages/auth/OTPVerification';
import SetPassword from './pages/auth/SetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';

// User Pages
import AssessmentForm from './pages/user/AssessmentForm';
import UserAssessments from './pages/user/UserAssessments';
import UserProfile from './pages/user/UserProfile';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AssessmentManagement from './pages/admin/AssessmentManagement';
import AssignmentManagement from './pages/admin/AssignmentManagement';
import Results from './pages/admin/Results';
import Analytics from './pages/admin/Analytics';
import Reports from './pages/admin/Reports';
import Settings from './pages/admin/Settings';
import Branding from './pages/admin/Branding';
import AccessRequests from './pages/admin/AccessRequests';
import Assessment360Reporting from './pages/admin/Assessment360Reporting';
import AdminAssessmentReport from './pages/admin/AdminAssessmentReport';
import BulkOperations from './pages/admin/BulkOperations';
import ImportExport from './pages/admin/ImportExport';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import CompetencyManagement from './pages/admin/CompetencyManagement';
import OrganizationManagement from './pages/admin/OrganizationManagement';
import SystemHealth from './pages/admin/SystemHealth';
import SecuritySettings from './pages/admin/SecuritySettings';
import NotificationSettings from './pages/admin/NotificationSettings';
import EmailTemplates from './pages/admin/EmailTemplates';
import AuditLogs from './pages/admin/AuditLogs';
import BackupRestore from './pages/admin/BackupRestore';
import APIKeys from './pages/admin/APIKeys';
import Webhooks from './pages/admin/Webhooks';
import Integrations from './pages/admin/Integrations';

// Root Pages
import RootDashboard from './pages/root/RootDashboard';

// Subscriber Pages
import SubscriberAssessments from './pages/subscriber/SubscriberAssessments';

// Protected Route Components
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleProtectedRoute from './components/auth/RoleProtectedRoute';
import { ToastContainer } from './components/ui/ToastNotification';
import ErrorBoundary from './components/ui/ErrorBoundary';
import Assessment360Selector from './components/assessments/Assessment360Selector';
import SessionMonitor from './components/security/SessionMonitor';

function App() {
  const { user, refreshSession, logout, updateActivity, validateSession } = useAuthStore();
  const { fetchProfile } = useProfileStore();
  const { currentOrganization } = useOrganizationStore();
  const { loadBranding, resetBranding } = useBrandingStore();
  
  // Initialize Content Security Policy
  useEffect(() => {
    try {
      ContentSecurityPolicy.applyCSP();
      console.info('CSP applied successfully with domain:', ContentSecurityPolicy.getCurrentDomain());
      // Debug CSP configuration
      ContentSecurityPolicy.debugCSP();
    } catch (error) {
      console.error('Failed to apply CSP:', error);
      SecureLogger.error('CSP application failed', {
        type: 'security',
        error: error instanceof Error ? error.message : 'Unknown error',
        context: 'csp_initialization'
      });
    }
  }, []);
  
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

  // Load branding when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      loadBranding(currentOrganization.id);
    } else {
      resetBranding();
    }
  }, [currentOrganization?.id, loadBranding, resetBranding]);

  // Set up activity tracking
  useEffect(() => {
    const handleActivity = () => {
      updateActivity();
    };

    // Track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Validate session periodically
  useEffect(() => {
    const validateInterval = setInterval(() => {
      if (!validateSession()) {
        logout();
      }
    }, 60000); // Check every minute

    return () => clearInterval(validateInterval);
  }, [validateSession, logout]);

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
      <Router>
        <div className="App">
          <Routes>
            {/* Root Admin Routes - Completely isolated and standalone */}
            <Route path="/root" element={
              <ErrorBoundary fallback={<div className="p-4 text-center">Error loading admin login page. Please refresh.</div>}>
                <RootLogin />
              </ErrorBoundary>
            } />
            <Route path="/root/register" element={
              <ErrorBoundary fallback={<div className="p-4 text-center">Error loading registration page. Please refresh.</div>}>
                <RootRegistration />
              </ErrorBoundary>
            } />
            <Route path="/root/dashboard" element={
              <ErrorBoundary fallback={<div className="p-4 text-center">Error loading root dashboard. Please refresh.</div>}>
                <RootDashboard />
              </ErrorBoundary>
            } />
            
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
                  <RoleProtectedRoute allowedRoles={['super_admin']}>
                    <ErrorBoundary>
                      <Branding />
                    </ErrorBoundary>
                  </RoleProtectedRoute>
                } />
                <Route path="/admin/branding" element={
                  <RoleProtectedRoute allowedRoles={['org_admin']}>
                    <ErrorBoundary>
                      <OrganizationBrandingPage />
                    </ErrorBoundary>
                  </RoleProtectedRoute>
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
        </div>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ErrorBoundary>
  );
}

export default App;