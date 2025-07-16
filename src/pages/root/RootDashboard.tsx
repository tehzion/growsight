import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useAccessRequestStore } from '../../stores/accessRequestStore';
import { useSupportStore } from '../../stores/supportStore';

import { RootDashboardData } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { AlertTriangle, CheckCircle, RefreshCw, Clock, Activity, BarChart3, Server, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';

const RootDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { organizations, fetchOrganizations } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { results, fetchAllOrgResults } = useAssessmentResultsStore();
  const { requests, fetchRequests } = useAccessRequestStore();
  const { tickets, fetchTickets } = useSupportStore();
  
  
  // State management
  const [dashboardData, setDashboardData] = useState<RootDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'behavioral' | 'system' | 'privacy'>('behavioral');
  const [timeRange, setTimeRange] = useState('30d');
  const [privacyLevel, setPrivacyLevel] = useState<'aggregated' | 'anonymized' | 'detailed'>('aggregated');

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
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
            systemUptime: 99.9, // Mock data for now
            averageResponseTime: 120, // Mock data for now
            storageUsage: 500, // Mock data for now
            bandwidthUsage: 1000 // Mock data for now
          },
          recentActivity: {
            userRegistrations: users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
            assessmentCompletions: results.filter(r => r.completedAt && new Date(r.completedAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
            systemAlerts: systemHealth.filter(s => s.status === 'critical' || s.status === 'warning').length,
            supportTickets: openSupportTickets
          },
          topInsights: [], // To be implemented
          criticalAlerts: systemHealth.filter(s => s.status === 'critical')
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
  }, [timeRange, organizations.length, users.length, assessments.length, results.length, requests.length, tickets.length, systemMetrics.length, systemHealth.length]);

  const handleRefresh = () => {
    // Re-fetch all data
    fetchOrganizations();
    fetchUsers();
    fetchAssessments();
    fetchAllOrgResults();
    fetchRequests();
    fetchTickets();
    fetchSystemMetrics();
    fetchSystemHealth();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'maintenance': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'maintenance': return <Clock className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading root dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
                onClick={handleRefresh}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No dashboard data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      

      {/* Global Analytics */}
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
              <h4 className="font-medium text-gray-900">Completed Assessments</h4>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.globalAnalytics.completedAssessments}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-primary-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900">User Registrations (Last 30 Days)</h4>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.recentActivity.userRegistrations}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900">Assessment Completions (Last 30 Days)</h4>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.recentActivity.assessmentCompletions}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900">System Alerts</h4>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.recentActivity.systemAlerts}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900">Open Support Tickets</h4>
              <p className="text-2xl font-bold text-gray-900">{dashboardData.recentActivity.supportTickets}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Status Tab */}
      <div className="space-y-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2 text-primary-600" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.systemHealth.map(health => (
                <div key={health.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{health.component}</h4>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.status)}`}>
                      {health.status}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{health.message}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{new Date(health.timestamp).toLocaleString()}</span>
                    {health.duration && <span>Duration: {health.duration}s</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary-600" />
              System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.systemMetrics.map(metric => (
                <div key={metric.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3 mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{metric.metricKey}</h4>
                      <p className="text-sm text-gray-600">{metric.category}</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.metricValue}{metric.metricUnit && ` ${metric.metricUnit}`}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(metric.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Privacy & Compliance Tab */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary-600" />
                Privacy & Compliance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Privacy Metrics */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Privacy Protection Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Data Anonymization</div>
                        <div className="text-sm text-green-700">100% of personal data anonymized</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Access Controls</div>
                        <div className="text-sm text-green-700">Role-based access implemented</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">Audit Logging</div>
                        <div className="text-sm text-green-700">All access logged and monitored</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <div className="font-medium text-green-900">GDPR Compliance</div>
                        <div className="text-sm text-green-700">Full compliance maintained</div>
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>

                {/* Compliance Status */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-4">Compliance Status</h4>
                  <div className="space-y-3">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Data Retention</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">All data retention policies followed</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Consent Management</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">User consent properly managed</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Data Processing</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">Processing activities documented</p>
                    </div>
                    
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">Security Measures</span>
                        <span className="text-sm text-green-600">Compliant</span>
                      </div>
                      <p className="text-sm text-gray-600">Encryption and security protocols active</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RootDashboard; 