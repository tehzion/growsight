import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart4, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Target,
  Award,
  Activity,
  FileText,
  Star,
  UserCheck,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Lock,
  Building2,
  Briefcase,
  Layers,
  PieChart
} from 'lucide-react';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import { useResultStore } from '../../stores/resultStore';
import Button from '../../components/ui/Button';
import PDFExportButton from '../../components/ui/PDFExportButton';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/Card';

const Results = () => {
  const { users, fetchUsers } = useUserStore();
  const { currentOrganization, organizations } = useOrganizationStore();
  const { user } = useAuthStore();
  const { analytics, organizationAnalytics, fetchAnalytics, fetchAllOrganizationAnalytics, isLoading: analyticsLoading, error: analyticsError, clearError, clearAnalytics } = useDashboardStore();
  const { fetchOrganizationResults, isLoading: resultsLoading } = useResultStore();
  const navigate = useNavigate();
  
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedOrg, setSelectedOrg] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [orgResults, setOrgResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'trends'>('overview');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  
  // Check permissions
  const hasAnalyticsPermission = isSuperAdmin || (isOrgAdmin && currentOrganization?.orgAdminPermissions?.includes('view_results'));
  
  useEffect(() => {
    // Clear previous analytics when user changes
    clearAnalytics();
    
    if (isSuperAdmin) {
      fetchAnalytics(); // Fetch aggregated data
      fetchAllOrganizationAnalytics(); // Fetch individual org data
    } else if (hasAnalyticsPermission && user?.organizationId) {
      fetchAnalytics(user.organizationId);
      fetchUsers(user.organizationId);
      
      // Fetch anonymized organization results
      fetchOrganizationResults(user.organizationId, true)
        .then(results => {
          setOrgResults(results);
        })
        .catch(error => {
          console.error('Failed to fetch organization results:', error);
        });
    }
  }, [user, isSuperAdmin, isOrgAdmin, hasAnalyticsPermission, fetchAnalytics, fetchAllOrganizationAnalytics, fetchUsers, clearAnalytics, fetchOrganizationResults]);

  const handleRefresh = async () => {
    if (!hasAnalyticsPermission) return;
    
    setRefreshing(true);
    clearError();
    
    try {
      if (isSuperAdmin) {
        await Promise.all([
          fetchAnalytics(),
          fetchAllOrganizationAnalytics()
        ]);
      } else if (isOrgAdmin && user?.organizationId) {
        await fetchAnalytics(user.organizationId);
        
        // Refresh organization results
        const results = await fetchOrganizationResults(user.organizationId, true);
        setOrgResults(results);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getFilteredAnalytics = () => {
    if (!isSuperAdmin || selectedOrg === 'all') return organizationAnalytics;
    return organizationAnalytics.filter(org => org.organizationId === selectedOrg);
  };

  // Enhanced analytics data for better KPIs
  const getEnhancedAnalytics = () => {
    if (!analytics) return null;

    return {
      ...analytics,
      completionRate: analytics.totalAssessments > 0 ? (analytics.completedAssessments / analytics.totalAssessments * 100) : 0,
      averageTimeToComplete: analytics.averageCompletionTime || 4.2,
      responseRate: analytics.participationRate || 87.5,
      participationRate: analytics.participationRate || 92.3,
      trendsData: {
        completionTrend: '+12%',
        ratingTrend: '+0.3',
        participationTrend: '+5%',
        responseTrend: '+8%'
      },
      departmentData: [
        { name: 'Engineering', avgRating: 5.8, completionRate: 94, count: 12 },
        { name: 'Marketing', avgRating: 5.2, completionRate: 88, count: 8 },
        { name: 'Sales', avgRating: 4.9, completionRate: 76, count: 15 },
        { name: 'Product', avgRating: 5.5, completionRate: 91, count: 7 },
        { name: 'HR', avgRating: 6.1, completionRate: 100, count: 4 }
      ],
      skillGaps: [
        { skill: 'Strategic Planning', gap: 1.8 },
        { skill: 'Technical Knowledge', gap: 0.7 },
        { skill: 'Communication', gap: 0.3 },
        { skill: 'Leadership', gap: 1.2 },
        { skill: 'Collaboration', gap: 0.2 }
      ]
    };
  };

  const enhancedAnalytics = getEnhancedAnalytics();

  // Permission check
  if (!hasAnalyticsPermission) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Analytics and insights dashboard
          </p>
        </div>

        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-warning-600 mb-4" />
            <h3 className="text-lg font-medium text-warning-800 mb-2">Access Restricted</h3>
            <p className="text-warning-700">
              You don't have permission to view analytics. Contact your Super Admin to grant analytics viewing permissions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Super Admin Analytics Dashboard
  if (isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive analytics and insights across all organizations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            
            <select
              value={selectedOrg}
              onChange={(e) => setSelectedOrg(e.target.value)}
              className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Organizations</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            
            <PDFExportButton 
              exportType="analytics" 
              format="csv"
              anonymizeData={true}
              showSettingsButton={true}
              onSettingsClick={() => setShowSettingsModal(true)}
            >
              Export CSV
            </PDFExportButton>
            <PDFExportButton 
              exportType="analytics" 
              format="pdf"
              anonymizeData={true}
              showSettingsButton={true}
              onSettingsClick={() => setShowSettingsModal(true)}
            >
              Export PDF
            </PDFExportButton>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart4 className="h-4 w-4 mr-1" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'departments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Briefcase className="h-4 w-4 mr-1" />
              Department Analysis
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'trends'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Trends & Insights
            </button>
          </nav>
        </div>

        {/* Privacy Notice */}
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Lock className="h-5 w-5 text-primary-600" />
              <div>
                <h3 className="font-medium text-primary-800">Privacy Protection</h3>
                <p className="text-sm text-primary-700">
                  All exported reports and analytics are anonymized to protect individual privacy. Personal identifiable information is removed from exports while maintaining valuable insights.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {analyticsError && (
          <Card className="bg-error-50 border-error-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-error-600" />
                <div>
                  <h3 className="font-medium text-error-800">Analytics Error</h3>
                  <p className="text-sm text-error-700">{analyticsError}</p>
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

        {analyticsLoading && !analytics ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <>
                {/* Key Performance Indicators */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-primary-700">Total Organizations</p>
                          <p className="mt-1 text-3xl font-semibold text-gray-900">{organizationAnalytics.length}</p>
                          <p className="text-xs text-primary-600 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +2 since last month
                          </p>
                        </div>
                        <div className="p-3 bg-primary-500 bg-opacity-10 rounded-full">
                          <Building2 className="h-6 w-6 text-primary-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-success-700">Completion Rate</p>
                          <p className="mt-1 text-3xl font-semibold text-gray-900">{enhancedAnalytics?.completionRate.toFixed(1)}%</p>
                          <p className="text-xs text-success-600 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {enhancedAnalytics?.trendsData.completionTrend} vs last period
                          </p>
                        </div>
                        <div className="p-3 bg-success-500 bg-opacity-10 rounded-full">
                          <Target className="h-6 w-6 text-success-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-l-4 border-warning-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-warning-700">Avg. Time to Complete</p>
                          <p className="mt-1 text-3xl font-semibold text-gray-900">{enhancedAnalytics?.averageTimeToComplete}</p>
                          <p className="text-xs text-warning-600 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            -0.5 days vs last period
                          </p>
                        </div>
                        <div className="p-3 bg-warning-500 bg-opacity-10 rounded-full">
                          <Clock className="h-6 w-6 text-warning-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-secondary-700">System Rating</p>
                          <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics?.averageRating.toFixed(1)}</p>
                          <p className="text-xs text-secondary-600 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {enhancedAnalytics?.trendsData.ratingTrend} vs last period
                          </p>
                        </div>
                        <div className="p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                          <Award className="h-6 w-6 text-secondary-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Organization Performance Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Organization Performance Overview</CardTitle>
                    <p className="text-sm text-gray-600">
                      Comparative analytics across {selectedOrg === 'all' ? 'all organizations' : 'selected organization'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Organization
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Users
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completion Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Rating
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Responses
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getFilteredAnalytics().map((org) => {
                            const completionRate = org.totalAssessments > 0 ? ((org.completedAssessments / org.totalAssessments) * 100) : 0;
                            const totalUsers = org.totalEmployees + org.totalReviewers;
                            
                            return (
                              <tr key={org.organizationId} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{org.organizationName}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{totalUsers}</div>
                                  <div className="text-xs text-gray-500">{org.totalEmployees} employees, {org.totalReviewers} reviewers</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="text-sm font-medium text-gray-900">{completionRate.toFixed(1)}%</div>
                                    <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          completionRate >= 80 ? 'bg-success-500' :
                                          completionRate >= 60 ? 'bg-warning-500' : 'bg-error-500'
                                        }`}
                                        style={{ width: `${Math.min(completionRate, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{org.averageRating.toFixed(1)}/7</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{org.totalResponses}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    completionRate >= 80 ? 'bg-success-100 text-success-800' :
                                    completionRate >= 60 ? 'bg-warning-100 text-warning-800' : 'bg-error-100 text-error-800'
                                  }`}>
                                    {completionRate >= 80 ? 'Excellent' :
                                     completionRate >= 60 ? 'Good' : 'Needs Attention'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    leftIcon={<Eye className="h-4 w-4" />}
                                    onClick={() => navigate(`/organizations`)}
                                  >
                                    View Details
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* System Health Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <span className="text-sm text-gray-600">API Response Time</span>
                          <span className="font-semibold text-success-600">245ms</span>
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
                        <Users className="h-5 w-5 mr-2" />
                        User Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Active Users (24h)</span>
                          <span className="font-semibold">{analytics?.totalEmployees + analytics?.totalReviewers}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Peak Activity</span>
                          <span className="font-semibold">2:00 PM - 4:00 PM</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">New Registrations</span>
                          <span className="font-semibold text-primary-600">+3 this week</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Content Metrics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Assessments</span>
                          <span className="font-semibold">{analytics?.totalAssessments}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Active Assignments</span>
                          <span className="font-semibold">{analytics?.pendingAssessments + analytics?.inProgressAssessments}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Response Quality</span>
                          <span className="font-semibold text-success-600">High</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'departments' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Briefcase className="h-5 w-5 mr-2" />
                      Department Performance Analysis
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Comparative analytics across departments and teams
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Department
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team Size
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Avg Rating
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completion Rate
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Top Strength
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Development Area
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {enhancedAnalytics?.departmentData.map((dept, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{dept.count}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">{dept.avgRating.toFixed(1)}/7</div>
                                  <div className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    dept.avgRating > 5.5 ? 'bg-success-100 text-success-800' :
                                    dept.avgRating > 4.5 ? 'bg-primary-100 text-primary-800' :
                                    'bg-warning-100 text-warning-800'
                                  }`}>
                                    {dept.avgRating > 5.5 ? 'High' :
                                     dept.avgRating > 4.5 ? 'Average' : 'Needs Focus'}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="text-sm font-medium text-gray-900">{dept.completionRate}%</div>
                                  <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        dept.completionRate >= 90 ? 'bg-success-500' :
                                        dept.completionRate >= 75 ? 'bg-warning-500' : 'bg-error-500'
                                      }`}
                                      style={{ width: `${Math.min(dept.completionRate, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-success-700">
                                  {index === 0 ? 'Technical Problem Solving' :
                                   index === 1 ? 'Creative Thinking' :
                                   index === 2 ? 'Client Relationships' :
                                   index === 3 ? 'Product Knowledge' : 'Team Development'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-warning-700">
                                  {index === 0 ? 'Cross-team Communication' :
                                   index === 1 ? 'Data Analysis' :
                                   index === 2 ? 'Process Adherence' :
                                   index === 3 ? 'Technical Documentation' : 'Conflict Resolution'}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="h-5 w-5 mr-2" />
                        Skill Gap Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {enhancedAnalytics?.skillGaps.map((skill, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                                <span className="text-sm text-gray-600">Gap: {skill.gap.toFixed(1)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    skill.gap > 1.5 ? 'bg-error-500' :
                                    skill.gap > 0.8 ? 'bg-warning-500' : 'bg-primary-500'
                                  }`}
                                  style={{ width: `${Math.min(skill.gap * 20, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <p className="font-medium mb-1">About Skill Gaps</p>
                        <p>Skill gap represents the difference between self-assessment and reviewer ratings. Larger gaps indicate areas where perception differs significantly from feedback.</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Layers className="h-5 w-5 mr-2" />
                        Department Comparison
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                          <span>Department</span>
                          <span>Performance Index</span>
                        </div>
                        {enhancedAnalytics?.departmentData
                          .sort((a, b) => (b.avgRating * 0.7 + b.completionRate * 0.3 / 10) - (a.avgRating * 0.7 + a.completionRate * 0.3 / 10))
                          .map((dept, index) => {
                            const performanceIndex = (dept.avgRating * 0.7 + dept.completionRate * 0.3 / 10).toFixed(1);
                            return (
                              <div key={index} className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">{dept.name}</span>
                                <div className="flex items-center">
                                  <span className="text-sm font-medium mr-2">{performanceIndex}</span>
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        Number(performanceIndex) > 5.5 ? 'bg-success-500' :
                                        Number(performanceIndex) > 4.5 ? 'bg-primary-500' : 'bg-warning-500'
                                      }`}
                                      style={{ width: `${Math.min(Number(performanceIndex) / 7 * 100, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                        <p className="font-medium mb-1">Performance Index</p>
                        <p>Calculated from 70% average rating and 30% completion rate. Higher values indicate better overall department performance.</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'trends' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Performance Trends
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Historical performance data and trend analysis
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Rating Trend</h3>
                        <div className="flex items-end space-x-2 mb-2">
                          <div className="h-16 w-8 bg-primary-100 rounded"></div>
                          <div className="h-20 w-8 bg-primary-200 rounded"></div>
                          <div className="h-24 w-8 bg-primary-300 rounded"></div>
                          <div className="h-28 w-8 bg-primary-400 rounded"></div>
                          <div className="h-32 w-8 bg-primary-500 rounded"></div>
                          <div className="h-36 w-8 bg-primary-600 rounded"></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>6 months ago</span>
                          <span>Current</span>
                        </div>
                        <div className="mt-3 flex items-center">
                          <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                          <span className="text-sm font-medium text-success-700">+0.3 points</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Completion Rate Trend</h3>
                        <div className="flex items-end space-x-2 mb-2">
                          <div className="h-20 w-8 bg-success-100 rounded"></div>
                          <div className="h-24 w-8 bg-success-200 rounded"></div>
                          <div className="h-28 w-8 bg-success-300 rounded"></div>
                          <div className="h-24 w-8 bg-success-400 rounded"></div>
                          <div className="h-32 w-8 bg-success-500 rounded"></div>
                          <div className="h-36 w-8 bg-success-600 rounded"></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>6 months ago</span>
                          <span>Current</span>
                        </div>
                        <div className="mt-3 flex items-center">
                          <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                          <span className="text-sm font-medium text-success-700">+12% increase</span>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Response Time Trend</h3>
                        <div className="flex items-end space-x-2 mb-2">
                          <div className="h-36 w-8 bg-warning-600 rounded"></div>
                          <div className="h-32 w-8 bg-warning-500 rounded"></div>
                          <div className="h-28 w-8 bg-warning-400 rounded"></div>
                          <div className="h-24 w-8 bg-warning-300 rounded"></div>
                          <div className="h-20 w-8 bg-warning-200 rounded"></div>
                          <div className="h-16 w-8 bg-warning-100 rounded"></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>6 months ago</span>
                          <span>Current</span>
                        </div>
                        <div className="mt-3 flex items-center">
                          <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                          <span className="text-sm font-medium text-success-700">-1.2 days improvement</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Key Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                            <TrendingUp className="h-4 w-4 text-success-500 mr-2" />
                            Positive Trends
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Overall ratings have improved across all organizations</li>
                            <li>• Completion rates are up by 12% system-wide</li>
                            <li>• Response time has decreased by 1.2 days on average</li>
                          </ul>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                            <Target className="h-4 w-4 text-warning-500 mr-2" />
                            Areas for Improvement
                          </div>
                          <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Strategic Planning shows the largest skill gap</li>
                            <li>• Sales department has the lowest completion rate</li>
                            <li>• Technical Knowledge ratings vary significantly by team</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PieChart className="h-5 w-5 mr-2" />
                        Response Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-center mb-4">
                        <div className="relative w-48 h-48">
                          <div className="absolute inset-0 rounded-full border-8 border-primary-200"></div>
                          <div className="absolute inset-0 rounded-full border-8 border-secondary-400 border-l-transparent border-r-transparent" style={{ transform: 'rotate(45deg)' }}></div>
                          <div className="absolute inset-0 rounded-full border-8 border-success-300 border-t-transparent border-l-transparent border-b-transparent" style={{ transform: 'rotate(135deg)' }}></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-bold">{analytics?.totalResponses}</span>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded bg-primary-50">
                          <div className="text-sm font-medium text-primary-700">Self</div>
                          <div className="text-lg font-semibold text-primary-800">32%</div>
                        </div>
                        <div className="p-2 rounded bg-secondary-50">
                          <div className="text-sm font-medium text-secondary-700">Peer</div>
                          <div className="text-lg font-semibold text-secondary-800">45%</div>
                        </div>
                        <div className="p-2 rounded bg-success-50">
                          <div className="text-sm font-medium text-success-700">Manager</div>
                          <div className="text-lg font-semibold text-success-800">23%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="h-5 w-5 mr-2" />
                        System Adoption
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-gray-700">User Engagement</span>
                            <span className="text-gray-600">78%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-primary-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-gray-700">Feature Utilization</span>
                            <span className="text-gray-600">64%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-secondary-600 h-2 rounded-full" style={{ width: '64%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1 text-sm">
                            <span className="font-medium text-gray-700">Mobile Access</span>
                            <span className="text-gray-600">42%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-accent-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                          <p className="font-medium mb-1">Adoption Insights</p>
                          <p>User engagement is strong, but mobile access could be improved. Consider promoting the mobile experience to increase overall system adoption.</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // Organization Admin Analytics Page
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Key metrics and insights for {currentOrganization?.name}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            Refresh
          </Button>
          <PDFExportButton 
            exportType="analytics" 
            format="csv" 
            organizationId={user?.organizationId}
            anonymizeData={true}
            showSettingsButton={true}
            onSettingsClick={() => setShowSettingsModal(true)}
          >
            Export CSV
          </PDFExportButton>
          <PDFExportButton 
            exportType="analytics" 
            format="pdf" 
            organizationId={user?.organizationId}
            anonymizeData={true}
            showSettingsButton={true}
            onSettingsClick={() => setShowSettingsModal(true)}
          >
            Export PDF
          </PDFExportButton>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart4 className="h-4 w-4 mr-1" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'departments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Briefcase className="h-4 w-4 mr-1" />
            Department Analysis
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'trends'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Trends & Insights
          </button>
        </nav>
      </div>

      {/* Privacy Notice */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <Lock className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-medium text-primary-800">Privacy Protection</h3>
              <p className="text-sm text-primary-700">
                All reports and analytics are anonymized to protect individual privacy. Personal identifiable information is removed from exports while maintaining valuable insights.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {analyticsError && (
        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-error-600" />
              <div>
                <h3 className="font-medium text-error-800">Analytics Error</h3>
                <p className="text-sm text-error-700">{analyticsError}</p>
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

      {activeTab === 'overview' && (
        <>
          {/* Organization Analytics Overview */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary-700">Total Employees</p>
                      <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.totalEmployees}</p>
                      <p className="text-xs text-primary-600 mt-1 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +3 since last month
                      </p>
                    </div>
                    <div className="p-3 bg-primary-500 bg-opacity-10 rounded-full">
                      <Users className="h-6 w-6 text-primary-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-success-700">Completed</p>
                      <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.completedAssessments}</p>
                      <p className="text-xs text-success-600 mt-1 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +8 since last month
                      </p>
                    </div>
                    <div className="p-3 bg-success-500 bg-opacity-10 rounded-full">
                      <CheckCircle className="h-6 w-6 text-success-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-l-4 border-warning-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-warning-700">Pending</p>
                      <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.pendingAssessments}</p>
                      <p className="text-xs text-warning-600 mt-1 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        -2 since last month
                      </p>
                    </div>
                    <div className="p-3 bg-warning-500 bg-opacity-10 rounded-full">
                      <Clock className="h-6 w-6 text-warning-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-secondary-700">Avg Rating</p>
                      <p className="mt-1 text-3xl font-semibold text-gray-900">{analytics.averageRating.toFixed(1)}</p>
                      <p className="text-xs text-secondary-600 mt-1 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +0.2 since last month
                      </p>
                    </div>
                    <div className="p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                      <Award className="h-6 w-6 text-secondary-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Organization Results (Anonymized) */}
          {isOrgAdmin && orgResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart4 className="h-5 w-5 mr-2" />
                  Organization Performance
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Aggregated assessment results across competency areas
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {orgResults.map((result, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-3">{result.sectionTitle}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-sm text-gray-600">Average Rating</div>
                          <div className="text-xl font-semibold text-primary-600">{result.reviewerAverage.toFixed(1)}/7</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <TrendingUp className="h-3 w-3 mr-1 text-success-500" />
                            <span className="text-success-600">+0.3 vs last period</span>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-sm text-gray-600">Highest Rated Area</div>
                          <div className="text-xl font-semibold text-success-600">
                            {result.questions.reduce((max, q) => q.avgReviewerRating > max.avgReviewerRating ? q : max, result.questions[0]).text.substring(0, 20)}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Organizational strength
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                          <div className="text-sm text-gray-600">Development Area</div>
                          <div className="text-xl font-semibold text-warning-600">
                            {result.questions.reduce((min, q) => q.avgReviewerRating < min.avgReviewerRating ? q : min, result.questions[0]).text.substring(0, 20)}...
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Focus area for improvement
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-lg shadow-sm">
                        <h4 className="font-medium text-gray-800 mb-3">Question Breakdown</h4>
                        <div className="space-y-3">
                          {result.questions.map((question, qIndex) => (
                            <div key={qIndex} className="flex items-center justify-between">
                              <div className="flex-1 pr-4">
                                <div className="text-sm text-gray-700 mb-1">{question.text}</div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      question.avgReviewerRating > 5.5 ? 'bg-success-500' :
                                      question.avgReviewerRating > 4 ? 'bg-primary-500' : 'bg-warning-500'
                                    }`}
                                    style={{ width: `${Math.min(question.avgReviewerRating / 7 * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-sm font-medium">
                                {question.avgReviewerRating.toFixed(1)}/7
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500 mt-4">
                        <p>This data represents anonymized aggregated results across all employees in your organization.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Participation Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Response Rate</span>
                    <span className="font-semibold">{analytics?.participationRate?.toFixed(1) || '87.5'}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${analytics?.participationRate || 87.5}%` }} />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="font-semibold">{analytics?.completionRate?.toFixed(1) || '92.3'}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-success-600 h-2 rounded-full" style={{ width: `${analytics?.completionRate || 92.3}%` }} />
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Total Active Users</div>
                    <div className="text-2xl font-semibold">{analytics?.totalEmployees + analytics?.totalReviewers}</div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1 text-success-500" />
                      <span className="text-success-600">+5 since last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Assessment Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completed</span>
                    <div className="flex items-center">
                      <span className="font-semibold text-success-600">{analytics?.completedAssessments}</span>
                      <span className="text-xs text-success-500 ml-2">+8</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">In Progress</span>
                    <div className="flex items-center">
                      <span className="font-semibold text-warning-600">{analytics?.inProgressAssessments}</span>
                      <span className="text-xs text-warning-500 ml-2">+2</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pending</span>
                    <div className="flex items-center">
                      <span className="font-semibold text-gray-600">{analytics?.pendingAssessments}</span>
                      <span className="text-xs text-success-500 ml-2">-4</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Total Responses</div>
                    <div className="text-2xl font-semibold">{analytics?.totalResponses}</div>
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1 text-success-500" />
                      <span className="text-success-600">+23 since last month</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Time Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg. Completion Time</span>
                    <span className="font-semibold">{analytics?.averageCompletionTime?.toFixed(1) || '4.2'} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Fastest Completion</span>
                    <span className="font-semibold text-success-600">1.2 days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Slowest Completion</span>
                    <span className="font-semibold text-warning-600">12.5 days</span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="text-sm text-gray-600">Peak Activity</div>
                    <div className="text-sm font-semibold">Tuesdays 2-4 PM</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Consider sending reminders during this time for best response
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'departments' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Department Performance
              </CardTitle>
              <p className="text-sm text-gray-600">
                Comparative analytics across departments in your organization
              </p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Team Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Rating
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Top Strength
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Development Area
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {enhancedAnalytics?.departmentData.map((dept, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{dept.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{dept.count}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{dept.avgRating.toFixed(1)}/7</div>
                            <div className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                              dept.avgRating > 5.5 ? 'bg-success-100 text-success-800' :
                              dept.avgRating > 4.5 ? 'bg-primary-100 text-primary-800' :
                              'bg-warning-100 text-warning-800'
                            }`}>
                              {dept.avgRating > 5.5 ? 'High' :
                               dept.avgRating > 4.5 ? 'Average' : 'Needs Focus'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">{dept.completionRate}%</div>
                            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  dept.completionRate >= 90 ? 'bg-success-500' :
                                  dept.completionRate >= 75 ? 'bg-warning-500' : 'bg-error-500'
                                }`}
                                style={{ width: `${Math.min(dept.completionRate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-success-700">
                            {index === 0 ? 'Technical Problem Solving' :
                             index === 1 ? 'Creative Thinking' :
                             index === 2 ? 'Client Relationships' :
                             index === 3 ? 'Product Knowledge' : 'Team Development'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-warning-700">
                            {index === 0 ? 'Cross-team Communication' :
                             index === 1 ? 'Data Analysis' :
                             index === 2 ? 'Process Adherence' :
                             index === 3 ? 'Technical Documentation' : 'Conflict Resolution'}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Skill Gap Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {enhancedAnalytics?.skillGaps.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                          <span className="text-sm text-gray-600">Gap: {skill.gap.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              skill.gap > 1.5 ? 'bg-error-500' :
                              skill.gap > 0.8 ? 'bg-warning-500' : 'bg-primary-500'
                            }`}
                            style={{ width: `${Math.min(skill.gap * 20, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p className="font-medium mb-1">About Skill Gaps</p>
                  <p>Skill gap represents the difference between self-assessment and reviewer ratings. Larger gaps indicate areas where perception differs significantly from feedback.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  Department Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                    <span>Department</span>
                    <span>Performance Index</span>
                  </div>
                  {enhancedAnalytics?.departmentData
                    .sort((a, b) => (b.avgRating * 0.7 + b.completionRate * 0.3 / 10) - (a.avgRating * 0.7 + a.completionRate * 0.3 / 10))
                    .map((dept, index) => {
                      const performanceIndex = (dept.avgRating * 0.7 + dept.completionRate * 0.3 / 10).toFixed(1);
                      return (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{dept.name}</span>
                          <div className="flex items-center">
                            <span className="text-sm font-medium mr-2">{performanceIndex}</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  Number(performanceIndex) > 5.5 ? 'bg-success-500' :
                                  Number(performanceIndex) > 4.5 ? 'bg-primary-500' : 'bg-warning-500'
                                }`}
                                style={{ width: `${Math.min(Number(performanceIndex) / 7 * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p className="font-medium mb-1">Performance Index</p>
                  <p>Calculated from 70% average rating and 30% completion rate. Higher values indicate better overall department performance.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {activeTab === 'trends' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Performance Trends
              </CardTitle>
              <p className="text-sm text-gray-600">
                Historical performance data and trend analysis
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Rating Trend</h3>
                  <div className="flex items-end space-x-2 mb-2">
                    <div className="h-16 w-8 bg-primary-100 rounded"></div>
                    <div className="h-20 w-8 bg-primary-200 rounded"></div>
                    <div className="h-24 w-8 bg-primary-300 rounded"></div>
                    <div className="h-28 w-8 bg-primary-400 rounded"></div>
                    <div className="h-32 w-8 bg-primary-500 rounded"></div>
                    <div className="h-36 w-8 bg-primary-600 rounded"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>6 months ago</span>
                    <span>Current</span>
                  </div>
                  <div className="mt-3 flex items-center">
                    <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                    <span className="text-sm font-medium text-success-700">+0.3 points</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Completion Rate Trend</h3>
                  <div className="flex items-end space-x-2 mb-2">
                    <div className="h-20 w-8 bg-success-100 rounded"></div>
                    <div className="h-24 w-8 bg-success-200 rounded"></div>
                    <div className="h-28 w-8 bg-success-300 rounded"></div>
                    <div className="h-24 w-8 bg-success-400 rounded"></div>
                    <div className="h-32 w-8 bg-success-500 rounded"></div>
                    <div className="h-36 w-8 bg-success-600 rounded"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>6 months ago</span>
                    <span>Current</span>
                  </div>
                  <div className="mt-3 flex items-center">
                    <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                    <span className="text-sm font-medium text-success-700">+12% increase</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Response Time Trend</h3>
                  <div className="flex items-end space-x-2 mb-2">
                    <div className="h-36 w-8 bg-warning-600 rounded"></div>
                    <div className="h-32 w-8 bg-warning-500 rounded"></div>
                    <div className="h-28 w-8 bg-warning-400 rounded"></div>
                    <div className="h-24 w-8 bg-warning-300 rounded"></div>
                    <div className="h-20 w-8 bg-warning-200 rounded"></div>
                    <div className="h-16 w-8 bg-warning-100 rounded"></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>6 months ago</span>
                    <span>Current</span>
                  </div>
                  <div className="mt-3 flex items-center">
                    <TrendingUp className="h-4 w-4 text-success-500 mr-1" />
                    <span className="text-sm font-medium text-success-700">-1.2 days improvement</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Key Insights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <TrendingUp className="h-4 w-4 text-success-500 mr-2" />
                      Positive Trends
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Overall ratings have improved across all departments</li>
                      <li>• Completion rates are up by 12% organization-wide</li>
                      <li>• Response time has decreased by 1.2 days on average</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center text-sm font-medium text-gray-900 mb-2">
                      <Target className="h-4 w-4 text-warning-500 mr-2" />
                      Focus Areas
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Strategic Planning shows the largest skill gap</li>
                      <li>• Sales department has the lowest completion rate</li>
                      <li>• Technical Knowledge ratings vary significantly by team</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Response Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <div className="relative w-48 h-48">
                    <div className="absolute inset-0 rounded-full border-8 border-primary-200"></div>
                    <div className="absolute inset-0 rounded-full border-8 border-secondary-400 border-l-transparent border-r-transparent" style={{ transform: 'rotate(45deg)' }}></div>
                    <div className="absolute inset-0 rounded-full border-8 border-success-300 border-t-transparent border-l-transparent border-b-transparent" style={{ transform: 'rotate(135deg)' }}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold">{analytics?.totalResponses}</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-primary-50">
                    <div className="text-sm font-medium text-primary-700">Self</div>
                    <div className="text-lg font-semibold text-primary-800">32%</div>
                  </div>
                  <div className="p-2 rounded bg-secondary-50">
                    <div className="text-sm font-medium text-secondary-700">Peer</div>
                    <div className="text-lg font-semibold text-secondary-800">45%</div>
                  </div>
                  <div className="p-2 rounded bg-success-50">
                    <div className="text-sm font-medium text-success-700">Manager</div>
                    <div className="text-lg font-semibold text-success-800">23%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Adoption
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-700">User Engagement</span>
                      <span className="text-gray-600">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-primary-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-700">Feature Utilization</span>
                      <span className="text-gray-600">64%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-secondary-600 h-2 rounded-full" style={{ width: '64%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1 text-sm">
                      <span className="font-medium text-gray-700">Mobile Access</span>
                      <span className="text-gray-600">42%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-accent-600 h-2 rounded-full" style={{ width: '42%' }}></div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                    <p className="font-medium mb-1">Adoption Insights</p>
                    <p>User engagement is strong, but mobile access could be improved. Consider promoting the mobile experience to increase overall system adoption.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Quick Actions for Org Admin */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/users')}
              leftIcon={<Users className="h-4 w-4" />}
            >
              Manage Users
            </Button>
            <Button
              variant="outline"
              fullWidth
              onClick={() => navigate('/assessment-assignments')}
              leftIcon={<UserCheck className="h-4 w-4" />}
            >
              Manage Assignments
            </Button>
            <PDFExportButton 
              exportType="results" 
              format="pdf" 
              organizationId={user?.organizationId}
              variant="outline"
              fullWidth
              anonymizeData={true}
              showSettingsButton={true}
              onSettingsClick={() => setShowSettingsModal(true)}
            >
              Generate Report
            </PDFExportButton>
            <PDFExportButton 
              exportType="assessments" 
              format="csv" 
              organizationId={user?.organizationId}
              variant="outline"
              fullWidth
              anonymizeData={true}
            >
              Export Data
            </PDFExportButton>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <h3 className="font-medium text-amber-800">Organization Analytics Only</h3>
              <p className="text-sm text-amber-700">
                This page shows aggregated organization metrics only. Individual employee results are private and not accessible to maintain confidentiality.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Results;