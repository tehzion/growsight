import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  BarChart3, 
  AlertCircle, 
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Shield,
  Database,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';

interface DashboardMetric {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

interface SystemHealthItem {
  service: string;
  status: 'healthy' | 'warning' | 'error';
  response_time?: number;
  last_check: string;
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { 
    metrics, 
    systemHealth, 
    fetchMetrics, 
    fetchSystemHealth, 
    isLoading: dashboardLoading 
  } = useDashboardStore();
  
  const { users, fetchUsers, isLoading: usersLoading } = useUserStore();
  const { organizations, fetchOrganizations, isLoading: orgsLoading } = useOrganizationStore();
  const { assessments, fetchAssessments, isLoading: assessmentsLoading } = useAssessmentStore();
  const { results, fetchResults, isLoading: resultsLoading } = useAssessmentResultsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        await Promise.all([
          fetchMetrics(),
          fetchSystemHealth(),
          fetchUsers(),
          fetchOrganizations(),
          fetchAssessments(),
          fetchResults()
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    loadDashboardData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchMetrics(),
        fetchSystemHealth(),
        fetchUsers(),
        fetchOrganizations(),
        fetchAssessments(),
        fetchResults()
      ]);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate dashboard metrics from available data
  const calculateMetrics = (): DashboardMetric[] => {
    const totalUsers = users?.length || 0;
    const activeUsers = users?.filter(u => u.last_login && 
      new Date(u.last_login) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    )?.length || 0;
    
    const totalOrgs = organizations?.length || 0;
    const activeOrgs = organizations?.filter(org => org.status === 'active')?.length || 0;
    
    const totalAssessments = assessments?.length || 0;
    const publishedAssessments = assessments?.filter(a => a.status === 'published')?.length || 0;
    
    const totalResults = results?.length || 0;
    const completedToday = results?.filter(r => 
      new Date(r.created_at).toDateString() === new Date().toDateString()
    )?.length || 0;

    return [
      {
        title: 'Total Users',
        value: totalUsers,
        change: activeUsers > 0 ? `${activeUsers} active` : undefined,
        trend: 'up',
        icon: <Users className="h-6 w-6" />,
        description: `${activeUsers} users active in last 30 days`
      },
      {
        title: 'Organizations',
        value: totalOrgs,
        change: activeOrgs > 0 ? `${activeOrgs} active` : undefined,
        trend: 'up',
        icon: <Building2 className="h-6 w-6" />,
        description: `${activeOrgs} organizations currently active`
      },
      {
        title: 'Assessments',
        value: totalAssessments,
        change: publishedAssessments > 0 ? `${publishedAssessments} published` : undefined,
        trend: 'up',
        icon: <FileText className="h-6 w-6" />,
        description: `${publishedAssessments} assessments available to users`
      },
      {
        title: 'Completions Today',
        value: completedToday,
        change: totalResults > 0 ? `${totalResults} total` : undefined,
        trend: completedToday > 0 ? 'up' : 'neutral',
        icon: <BarChart3 className="h-6 w-6" />,
        description: `${totalResults} total assessment completions`
      }
    ];
  };

  const getSystemHealthStatus = () => {
    if (!systemHealth || systemHealth.length === 0) {
      return { status: 'unknown', healthy: 0, total: 0 };
    }

    const healthy = systemHealth.filter(item => item.status === 'healthy').length;
    const total = systemHealth.length;
    
    let status: 'healthy' | 'warning' | 'error' = 'healthy';
    if (healthy < total * 0.8) status = 'error';
    else if (healthy < total) status = 'warning';

    return { status, healthy, total };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const dashboardMetrics = calculateMetrics();
  const systemStatus = getSystemHealthStatus();
  const isLoading = dashboardLoading || usersLoading || orgsLoading || assessmentsLoading || resultsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.full_name || user?.email}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button 
            onClick={handleRefresh} 
            isLoading={refreshing}
            leftIcon={<Activity className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    {metric.icon}
                    <h3 className="text-sm font-medium text-gray-600">
                      {metric.title}
                    </h3>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {metric.value}
                  </div>
                  {metric.change && (
                    <div className="flex items-center space-x-1 text-sm">
                      {getTrendIcon(metric.trend || 'neutral')}
                      <span className="text-gray-600">{metric.change}</span>
                    </div>
                  )}
                </div>
              </div>
              {metric.description && (
                <p className="text-xs text-gray-500 mt-3">
                  {metric.description}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>System Health</span>
              {getStatusIcon(systemStatus.status)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex space-x-4">
                    <div className="rounded-full bg-gray-200 h-4 w-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  </div>
                ))}
              </div>
            ) : systemHealth && systemHealth.length > 0 ? (
              <div className="space-y-3">
                {systemHealth.map((item: SystemHealthItem, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(item.status)}
                      <span className="font-medium">{item.service}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.response_time && `${item.response_time}ms`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">System health data unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              fullWidth 
              variant="outline"
              leftIcon={<Users className="h-4 w-4" />}
            >
              Manage Users
            </Button>
            <Button 
              fullWidth 
              variant="outline"
              leftIcon={<Building2 className="h-4 w-4" />}
            >
              View Organizations
            </Button>
            <Button 
              fullWidth 
              variant="outline"
              leftIcon={<FileText className="h-4 w-4" />}
            >
              Create Assessment
            </Button>
            <Button 
              fullWidth 
              variant="outline"
              leftIcon={<BarChart3 className="h-4 w-4" />}
            >
              View Analytics
            </Button>
            <Button 
              fullWidth 
              variant="outline"
              leftIcon={<Shield className="h-4 w-4" />}
            >
              Security Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Recent Activity Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {users?.filter(u => 
                  new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                )?.length || 0}
              </div>
              <div className="text-sm text-gray-600">New users this week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {results?.filter(r => 
                  new Date(r.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                )?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Assessments completed this week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {assessments?.filter(a => 
                  new Date(a.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                )?.length || 0}
              </div>
              <div className="text-sm text-gray-600">New assessments this week</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;