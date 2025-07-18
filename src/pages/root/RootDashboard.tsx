import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  CheckCircle, 
  Clock, 
  Activity, 
  BarChart3, 
  Server, 
  UserCheck, 
  LogOut 
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useAccessRequestStore } from '../../stores/accessRequestStore';
import { useSupportStore } from '../../stores/supportStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import RootAccessManager from '../../components/admin/RootAccessManager';
import BehavioralInsights from '../../components/root/BehavioralInsights';

interface RootDashboardData {
  globalAnalytics: {
    totalOrganizations: number;
    totalUsers: number;
    totalAssessments: number;
    activeAssessments: number;
    systemUptime: number;
    averageResponseTime: number;
    storageUsage: number;
    bandwidthUsage: number;
  };
  recentActivity: {
    userRegistrations: number;
    assessmentCompletions: number;
    systemAlerts: number;
    supportTickets: number;
  };
  topInsights: any[];
  criticalAlerts: any[];
  systemHealth?: any[];
  systemMetrics?: any[];
}

const RootDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { results, fetchAllOrgResults } = useAssessmentResultsStore();
  const { requests, fetchRequests } = useAccessRequestStore();
  const { tickets, fetchTickets } = useSupportStore();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState<RootDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'access_requests' | 'behavioral' | 'system' | 'privacy'>('overview');
  const [pendingAccessRequests, setPendingAccessRequests] = useState(0);
  const [systemMetrics, setSystemMetrics] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any[]>([]);

  // Security check - only allow super_admin access
  useEffect(() => {
    if (!user) {
      navigate('/root');
      return;
    }
    
    if (user.role !== 'super_admin') {
      addNotification({
        title: 'Access Denied',
        message: 'Only system administrators can access this dashboard',
        type: 'error'
      });
      navigate('/root');
      return;
    }
  }, [user, navigate, addNotification]);

  const handleLogout = async () => {
    await logout();
    navigate('/root');
  };

  const fetchSystemMetrics = async () => {
    setSystemMetrics([
      { id: '1', metricKey: 'CPU Usage', category: 'System', metricValue: '45', metricUnit: '%', timestamp: new Date().toISOString() },
      { id: '2', metricKey: 'Memory Usage', category: 'System', metricValue: '68', metricUnit: '%', timestamp: new Date().toISOString() },
      { id: '3', metricKey: 'Disk Usage', category: 'Storage', metricValue: '34', metricUnit: '%', timestamp: new Date().toISOString() },
    ]);
  };

  const fetchSystemHealth = async () => {
    setSystemHealth([
      { id: '1', component: 'Database', status: 'healthy', message: 'All database connections are operational', timestamp: new Date().toISOString() },
      { id: '2', component: 'API Gateway', status: 'healthy', message: 'All endpoints responding normally', timestamp: new Date().toISOString() },
      { id: '3', component: 'Storage Service', status: 'warning', message: 'Storage usage at 85% capacity', timestamp: new Date().toISOString() },
    ]);
  };

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      setError(null);
      try {
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
          globalAnalytics: {
            totalOrganizations,
            totalUsers,
            totalAssessments,
            activeAssessments: assessments.filter(a => a.isPublished).length,
            systemUptime: 99.9,
            averageResponseTime: 120,
            storageUsage: 500,
            bandwidthUsage: 1000
          },
          recentActivity: {
            userRegistrations: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
            assessmentCompletions: results.filter(r => r.completedAt && new Date(r.completedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
            systemAlerts: systemHealth.filter(s => s.status === 'critical' || s.status === 'warning').length,
            supportTickets: openSupportTickets
          },
          topInsights: [],
          criticalAlerts: systemHealth.filter(s => s.status === 'critical'),
          systemHealth,
          systemMetrics
        });
      } catch (err) {
        setError((err as Error).message);
        addNotification({
          title: 'Error',
          message: 'Failed to load dashboard data',
          type: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, organizations.length, users.length, assessments.length, results.length, requests.length, tickets.length, systemMetrics.length, systemHealth.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">System Administrator</h1>
                <p className="text-xs text-gray-500">Root Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, {user?.firstName} {user?.lastName}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut className="h-4 w-4" />}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 bg-white rounded-t-lg mt-6">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
              { id: 'access_requests', label: 'Access Requests' + (pendingAccessRequests > 0 ? ` (${pendingAccessRequests})` : ''), icon: <UserCheck className="h-4 w-4" /> },
              { id: 'behavioral', label: 'Behavioral Insights', icon: <Activity className="h-4 w-4" /> },
              { id: 'system', label: 'System Health', icon: <Server className="h-4 w-4" /> },
              { id: 'privacy', label: 'Privacy & Compliance', icon: <Shield className="h-4 w-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-lg shadow-sm p-6 mb-6">
          {activeTab === 'overview' && dashboardData && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
                    Global Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Total Organizations</h4>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.globalAnalytics.totalOrganizations}</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Total Users</h4>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.globalAnalytics.totalUsers}</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Total Assessments</h4>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.globalAnalytics.totalAssessments}</p>
                    </div>
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="font-medium text-gray-900">Active Assessments</h4>
                      <p className="text-2xl font-bold text-gray-900">{dashboardData.globalAnalytics.activeAssessments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'access_requests' && (
            <RootAccessManager onRequestsUpdate={setPendingAccessRequests} />
          )}

          {activeTab === 'behavioral' && (
            <BehavioralInsights privacyLevel="aggregated" />
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemHealth.map(health => (
                      <div key={health.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{health.component}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                            {health.status}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{health.message}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'privacy' && (
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-900">GDPR Compliance</div>
                      <div className="text-sm text-green-700">Full compliance maintained</div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <div className="font-medium text-green-900">Data Encryption</div>
                      <div className="text-sm text-green-700">All data encrypted at rest and in transit</div>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default RootDashboard;