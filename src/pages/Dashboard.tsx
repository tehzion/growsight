import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ClipboardList, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  BarChart4, 
  ArrowRight,
  TrendingUp,
  Building2,
  Star,
  UserCheck,
  Shield,
  Settings,
  RefreshCw,
  Activity,
  Target,
  Tag,
  AlertTriangle
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useOrganizationStore } from '../stores/organizationStore';
import { useUserStore } from '../stores/userStore';
import { useDashboardStore } from '../stores/dashboardStore';
import { useResultStore } from '../stores/resultStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useAccessRequestStore } from '../stores/accessRequestStore';
import { useSupportStore } from '../stores/supportStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useAccessRequestStore } from '../stores/accessRequestStore';
import { useSupportStore } from '../stores/supportStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useAccessRequestStore } from '../stores/accessRequestStore';
import { useSupportStore } from '../stores/supportStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useAccessRequestStore } from '../stores/accessRequestStore';
import { useSupportStore } from '../stores/supportStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useAssessmentStore } from '../stores/assessmentStore';
import { useAccessRequestStore } from '../stores/accessRequestStore';
import { useSupportStore } from '../stores/supportStore';
import { useNotificationStore } from '../stores/notificationStore';

import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const Dashboard = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const { analytics, organizationAnalytics, fetchAnalytics, fetchAllOrganizationAnalytics, isLoading, clearAnalytics, error, clearError } = useDashboardStore();
  const { results, fetchResults } = useResultStore();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);
  
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const isSubscriber = user?.role === 'subscriber';
  
  useEffect(() => {
    const loadDashboardData = async () => {
      setRefreshing(true);
      clearError();
      try {
        if (isSuperAdmin) {
          await Promise.all([
            fetchOrganizations(),
            fetchUsers(),
            fetchAssessments(),
            fetchAllOrgResults(),
            fetchRequests(),
            fetchTickets(),
            fetchSystemMetrics(),
            fetchSystemHealth()
          ]);

          const totalOrganizations = organizations.length;
          const totalUsers = users.length;
          const totalAssessments = assessments.length;
          const completedAssessments = results.filter(r => r.status === 'completed').length;
          const pendingAccessRequests = requests.filter(req => req.status === 'pending').length;
          const openSupportTickets = tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;

          setDashboardData({
            systemMetrics: systemMetrics,
            systemHealth: systemHealth,
            globalAnalytics: {
              totalOrganizations,
              totalUsers,
              totalAssessments,
              activeAssessments: assessments.filter(a => a.isPublished).length,
              systemUptime: 99.9, // Mock data for now
              averageResponseTime: 120, // Mock data for now
              storageUsage: 500, // Mock data for now
              bandwidthUsage: 1000 // Mock data for now
            },
            recentActivity: {
              userRegistrations: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
              assessmentCompletions: results.filter(r => new Date(r.completedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
              systemAlerts: systemHealth.filter(s => s.status === 'critical' || s.status === 'warning').length,
              supportTickets: openSupportTickets
            },
            topInsights: [], // To be implemented
            criticalAlerts: systemHealth.filter(s => s.status === 'critical')
          });
        } else if (isSubscriber && user) {
          fetchResults(user.id);
        } else if (user?.organizationId) {
          fetchAnalytics(user.organizationId);
          fetchUsers(user.organizationId);
        }
      } catch (err) {
        setError((err as Error).message);
        addNotification({
          title: 'Error',
          message: 'Failed to load dashboard data',
          type: 'error'
        });
      } finally {
        setRefreshing(false);
      }
    };

    loadDashboardData();
  }, [user, isSuperAdmin, isSubscriber, fetchAnalytics, fetchAllOrganizationAnalytics, fetchUsers, fetchResults, clearAnalytics, organizations.length, users.length, assessments.length, results.length, requests.length, tickets.length, systemMetrics.length, systemHealth.length]);

  const handleRefresh = () => {
    loadDashboardData();
  };
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assessment_completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'user_added':
        return <Users className="h-5 w-5 text-primary-500" />;
      case 'assessment_created':
        return <ClipboardList className="h-5 w-5 text-secondary-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getActivityText = (type: string, user: string) => {
    switch (type) {
      case 'assessment_completed':
        return `${user} completed an assessment`;
      case 'user_added':
        return `${user} was added to the organization`;
      case 'assessment_created':
        return `New assessment was created by ${user}`;
      default:
        return `Unknown activity by ${user}`;
    }
  };

  // Mock recent activity data - different for each role
  const getRecentActivity = () => {
    if (isSuperAdmin) {
      return [
        { id: 1, type: 'assessment_completed', user: 'Jane Smith (Acme Corp)', date: '2025-01-08T14:30:00' },
        { id: 2, type: 'user_added', user: 'Mark Johnson (TechStart)', date: '2025-01-07T10:15:00' },
        { id: 3, type: 'assessment_created', user: 'System Admin', date: '2025-01-06T16:45:00' }
      ];
    } else if (isOrgAdmin) {
      return [
        { id: 1, type: 'assessment_completed', user: 'John Doe', date: '2025-01-08T14:30:00' },
        { id: 2, type: 'user_added', user: 'Mike Wilson', date: '2025-01-07T10:15:00' },
        { id: 3, type: 'assessment_created', user: 'You', date: '2025-01-06T16:45:00' }
      ];
    } else {
      return [
        { id: 1, type: 'assessment_completed', user: 'You', date: '2025-01-08T14:30:00' },
        { id: 2, type: 'assessment_created', user: 'Organization Admin', date: '2025-01-06T16:45:00' }
      ];
    }
  };

  const recentActivity = getRecentActivity();
  
  if (isLoading && !analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard analytics...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSuperAdmin ? 'System-wide analytics and control center' : 
             isSubscriber ? 'Your personal assessment progress and insights' :
             `${currentOrganization?.name || 'Organization'} management dashboard`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <div>
                <h3 className="font-medium text-error-800">Dashboard Error</h3>
                <p className="text-sm text-error-700">{error}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="ml-auto"
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Analytics Overview - Only for Admin levels */}
      {analytics && !isSubscriber && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-700">
                    {isSuperAdmin ? 'Total Organizations' : 'Admin Users'}
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {isSuperAdmin ? organizationAnalytics.length : analytics.totalEmployees}
                  </p>
                  <p className="text-xs text-primary-600 mt-1">
                    {isSuperAdmin ? 'Active organizations' : 'In organization'}
                  </p>
                </div>
                <div className="p-3 bg-primary-500 bg-opacity-10 rounded-full">
                  {isSuperAdmin ? <Building2 className="h-6 w-6 text-primary-600" /> : <Users className="h-6 w-6 text-primary-600" />}
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-700 hover:text-primary-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate(isSuperAdmin ? '/organizations' : '/users')}
                >
                  {isSuperAdmin ? 'Manage Organizations' : 'Manage Users'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-l-4 border-warning-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-warning-700">Pending</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.pendingAssessments}</p>
                  <p className="text-xs text-warning-600 mt-1">Awaiting completion</p>
                </div>
                <div className="p-3 bg-warning-500 bg-opacity-10 rounded-full">
                  <Clock className="h-6 w-6 text-warning-600" />
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-warning-700 hover:text-warning-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate(isOrgAdmin ? '/assessment-assignments' : '/assessments')}
                >
                  {isOrgAdmin ? 'Manage Assignments' : 'View Assessments'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success-700">Completed</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.completedAssessments}</p>
                  <p className="text-xs text-success-600 mt-1">Total completions</p>
                </div>
                <div className="p-3 bg-success-500 bg-opacity-10 rounded-full">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-success-700 hover:text-success-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/results')}
                >
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-700">Avg Rating</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.averageRating.toFixed(1)}</p>
                  <p className="text-xs text-secondary-600 mt-1">out of 7</p>
                </div>
                <div className="p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                  <Star className="h-6 w-6 text-secondary-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-secondary-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {analytics.totalResponses} responses
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subscriber Dashboard - Assignment Focused */}
      {isSubscriber && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-700">My Assignments</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {analytics?.pendingAssessments || 0}
                  </p>
                  <p className="text-xs text-primary-600 mt-1">Pending assessments</p>
                </div>
                <div className="p-3 bg-primary-500 bg-opacity-10 rounded-full">
                  <ClipboardList className="h-6 w-6 text-primary-600" />
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary-700 hover:text-primary-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/my-assessments')}
                >
                  View Assignments
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-success-700">Completed</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {analytics?.completedAssessments || 0}
                  </p>
                  <p className="text-xs text-success-600 mt-1">Assessments done</p>
                </div>
                <div className="p-3 bg-success-500 bg-opacity-10 rounded-full">
                  <CheckCircle className="h-6 w-6 text-success-600" />
                </div>
              </div>
              <div className="mt-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-success-700 hover:text-success-800 px-0"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/my-results')}
                >
                  View Results
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-secondary-700">My Rating</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {analytics?.averageRating ? analytics.averageRating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-xs text-secondary-600 mt-1">out of 7</p>
                </div>
                <div className="p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                  <Star className="h-6 w-6 text-secondary-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-secondary-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Personal performance
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-accent-50 to-accent-100 border-l-4 border-accent-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-accent-700">Progress</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {analytics?.totalAssessments ? ((analytics.completedAssessments / analytics.totalAssessments) * 100).toFixed(0) : 0}%
                  </p>
                  <p className="text-xs text-accent-600 mt-1">Completion rate</p>
                </div>
                <div className="p-3 bg-accent-500 bg-opacity-10 rounded-full">
                  <Target className="h-6 w-6 text-accent-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-accent-700">
                  <Activity className="h-4 w-4 mr-1" />
                  Assessment progress
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics for Super Admin */}
      {isSuperAdmin && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                System Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="font-semibold text-success-600">
                    {analytics.totalAssessments > 0 ? ((analytics.completedAssessments / analytics.totalAssessments) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Organizations</span>
                  <span className="font-semibold">{organizationAnalytics.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Users</span>
                  <span className="font-semibold">{analytics.totalEmployees + analytics.totalReviewers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Database Status</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Healthy
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">API Response</span>
                  <span className="font-semibold text-success-600">Fast</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Uptime</span>
                  <span className="font-semibold text-success-600">99.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Growth Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">New Organizations</span>
                  <span className="font-semibold text-primary-600">+2 this month</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">User Growth</span>
                  <span className="font-semibold text-primary-600">+15%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Assessment Usage</span>
                  <span className="font-semibold text-primary-600">+23%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Competency Analysis for Super Admin */}
      {isSuperAdmin && analytics?.competencyAnalytics && analytics.competencyAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Competency Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analytics.competencyAnalytics.map(comp => (
                <div key={comp.competencyId} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{comp.competencyName}</h3>
                    <span className="text-sm font-medium text-primary-600">{comp.averageRating.toFixed(1)}/7</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full" 
                      style={{ width: `${(comp.averageRating / 7) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{comp.assessmentCount} assessments</span>
                    <span>
                      {comp.averageRating >= 5 ? 'Strong' : 
                       comp.averageRating >= 4 ? 'Satisfactory' : 
                       'Needs improvement'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Breakdown for Super Admin */}
      {isSuperAdmin && organizationAnalytics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Organization Performance Overview
            </CardTitle>
            <p className="text-sm text-gray-600">Performance metrics across all organizations</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {organizationAnalytics.map(org => (
                <Card key={org.organizationId} className="hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-gray-900">{org.organizationName}</h3>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm font-medium">{org.averageRating.toFixed(1)}/7</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-lg font-semibold text-primary-600">{org.totalEmployees}</div>
                        <div className="text-gray-600">Admin Users</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-secondary-600">{org.totalReviewers}</div>
                        <div className="text-gray-600">Reviewers</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-success-600">{org.completedAssessments}</div>
                        <div className="text-gray-600">Completed</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-warning-600">{org.pendingAssessments}</div>
                        <div className="text-gray-600">Pending</div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Total Responses:</span>
                        <span className="font-medium">{org.totalResponses}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-1">
                        <span>Completion Rate:</span>
                        <span className="font-medium">
                          {org.totalAssessments > 0 ? ((org.completedAssessments / org.totalAssessments) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      
                      {/* Competency highlights if available */}
                      {org.competencyAnalytics && org.competencyAnalytics.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center mb-2">
                            <Tag className="h-4 w-4 mr-1 text-primary-600" />
                            <span className="text-sm font-medium text-gray-700">Top Competencies:</span>
                          </div>
                          <div className="space-y-1">
                            {org.competencyAnalytics
                              .sort((a, b) => b.averageRating - a.averageRating)
                              .slice(0, 2)
                              .map(comp => (
                                <div key={comp.competencyId} className="flex justify-between text-xs">
                                  <span className="text-gray-600">{comp.competencyName}</span>
                                  <span className="font-medium text-primary-600">{comp.averageRating.toFixed(1)}/7</span>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <p className="text-sm text-gray-600">
            {isSuperAdmin ? 'Latest system activities across all organizations' :
             'Latest activities in your organization'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map(activity => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                <div className="mt-0.5">
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <p className="text-sm font-medium">{getActivityText(activity.type, activity.user)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(activity.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      hour: '2-digit', 
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Quick Links for Admins */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {isSuperAdmin && (
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Permission Control</h3>
                <p className="text-sm text-gray-500 mb-4">Configure what Organization Admins can do within their organizations.</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/permissions')}
                >
                  Manage Permissions
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isSuperAdmin ? 'Manage Organizations' : 'Manage Users'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isSuperAdmin 
                  ? 'Create and configure organizations with custom permissions.'
                  : 'Add, edit, or remove admin users from your organization.'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(isSuperAdmin ? '/organizations' : '/users')}
              >
                {isSuperAdmin ? 'Go to Organizations' : 'Go to Users'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-secondary-100 rounded-full flex items-center justify-center mb-4">
                {isOrgAdmin ? <UserCheck className="h-6 w-6 text-secondary-600" /> : <ClipboardList className="h-6 w-6 text-secondary-600" />}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {isOrgAdmin ? 'Manage Assignments' : 'Manage Assessments'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {isOrgAdmin 
                  ? 'Assign assessments to employees with specific reviewers.'
                  : 'View and manage all assessments across organizations.'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(isOrgAdmin ? '/assessment-assignments' : '/assessments')}
              >
                {isOrgAdmin ? 'Go to Assignments' : 'Go to Assessments'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-accent-100 rounded-full flex items-center justify-center mb-4">
                <BarChart4 className="h-6 w-6 text-accent-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">View Analytics</h3>
              <p className="text-sm text-gray-500 mb-4">
                {isSuperAdmin 
                  ? 'Review system-wide analytics and export comprehensive reports.'
                  : 'Review organization metrics and export reports.'
                }
              </p>
              <Button
                variant="outline"
                onClick={() => navigate('/results')}
              >
                Go to Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Competency Framework Card */}
        {(isOrgAdmin && currentOrganization?.orgAdminPermissions?.includes('create_assessments')) && (
          <Card className="hover:shadow-card-hover transition-shadow">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <Tag className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Competency Framework</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Define and manage competencies to align assessments with organizational capabilities.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/competencies')}
                >
                  Manage Competencies
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
    </div>
  );
};

export default Dashboard;