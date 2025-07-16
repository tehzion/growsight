import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  ClipboardList,
  BarChart4,
  Shield,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  ArrowRight
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { useNotificationStore } from '../../stores/notificationStore';

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { organizations, fetchOrganizations, isLoading: orgsLoading } = useOrganizationStore();
  const { users, fetchUsers, isLoading: usersLoading } = useUserStore();
  const { assessments, fetchAssessments, isLoading: assessmentsLoading } = useAssessmentStore();
  const { results, fetchAllAssessmentResults, isLoading: resultsLoading } = useAssessmentResultsStore();
  const { addNotification } = useNotificationStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check if user is super admin
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      Promise.all([
        fetchOrganizations(),
        fetchUsers(),
        fetchAssessments(),
        fetchAllAssessmentResults()
      ]).catch(error => {
        console.error('Failed to fetch dashboard data:', error);
      });
    }
  }, [isSuperAdmin, fetchOrganizations, fetchUsers, fetchAssessments, fetchAllAssessmentResults]);

  const handleRefresh = async () => {
    if (!isSuperAdmin) return;
    
    setRefreshing(true);
    try {
      await Promise.all([
        fetchOrganizations(),
        fetchUsers(),
        fetchAssessments(),
        fetchAllAssessmentResults()
      ]);
      
      addNotification({
        title: 'Dashboard Updated',
        message: 'All data has been refreshed successfully.',
        type: 'success'
      });
    } catch (error) {
      console.error('Refresh failed:', error);
      addNotification({
        title: 'Refresh Failed',
        message: 'Failed to refresh dashboard data. Please try again.',
        type: 'error'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate metrics
  const getMetrics = () => {
    const activeOrgs = organizations.filter(org => org.status === 'active' || !org.status);
    const inactiveOrgs = organizations.filter(org => org.status === 'inactive');
    const suspendedOrgs = organizations.filter(org => org.status === 'suspended');
    
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive !== false).length;
    const orgAdmins = users.filter(user => user.role === 'org_admin').length;
    const employees = users.filter(user => user.role === 'employee').length;
    
    const publishedAssessments = assessments.filter(assessment => assessment.isPublished).length;
    const draftAssessments = assessments.filter(assessment => !assessment.isPublished).length;
    
    const completedResults = results.filter(result => result.status === 'completed').length;
    const pendingResults = results.filter(result => result.status === 'in_progress').length;
    
    return {
      organizations: {
        total: organizations.length,
        active: activeOrgs.length,
        inactive: inactiveOrgs.length,
        suspended: suspendedOrgs.length
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        orgAdmins,
        employees
      },
      assessments: {
        total: assessments.length,
        published: publishedAssessments,
        draft: draftAssessments
      },
      results: {
        total: results.length,
        completed: completedResults,
        pending: pendingResults
      }
    };
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter || (statusFilter === 'active' && !org.status);
    const matchesSearch = searchTerm === '' || org.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      default: return 'text-green-600 bg-green-100'; // Default to active
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'inactive': return <Clock className="h-4 w-4" />;
      case 'suspended': return <AlertTriangle className="h-4 w-4" />;
      default: return <CheckCircle className="h-4 w-4" />;
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">System administration and management</p>
        </div>

        <Card className="bg-error-50 border-error-200">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-error-600 mb-4" />
            <h3 className="text-lg font-medium text-error-800 mb-2">Access Denied</h3>
            <p className="text-error-700">
              Only Super Administrators can access this dashboard. Contact your system administrator if you need access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = getMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-5 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-6 w-6 mr-2 text-primary-600" />
            Super Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            System overview and organization management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as 'week' | 'month' | 'quarter')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
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

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Organizations Metric */}
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Organizations</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.organizations.total}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center text-green-600">
                <span className="font-medium">{metrics.organizations.active}</span>
                <span className="ml-1">Active</span>
              </div>
              <div className="flex items-center text-gray-600 ml-4">
                <span className="font-medium">{metrics.organizations.inactive + metrics.organizations.suspended}</span>
                <span className="ml-1">Inactive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Metric */}
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.users.total}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center text-green-600">
                <span className="font-medium">{metrics.users.active}</span>
                <span className="ml-1">Active</span>
              </div>
              <div className="flex items-center text-blue-600 ml-4">
                <span className="font-medium">{metrics.users.orgAdmins}</span>
                <span className="ml-1">Admins</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assessments Metric */}
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.assessments.total}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center text-green-600">
                <span className="font-medium">{metrics.assessments.published}</span>
                <span className="ml-1">Published</span>
              </div>
              <div className="flex items-center text-gray-600 ml-4">
                <span className="font-medium">{metrics.assessments.draft}</span>
                <span className="ml-1">Draft</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Metric */}
        <Card className="hover:shadow-card-hover transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Assessment Results</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.results.total}</p>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart4 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <div className="flex items-center text-green-600">
                <span className="font-medium">{metrics.results.completed}</span>
                <span className="ml-1">Completed</span>
              </div>
              <div className="flex items-center text-yellow-600 ml-4">
                <span className="font-medium">{metrics.results.pending}</span>
                <span className="ml-1">Pending</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/organizations')}
              leftIcon={<Building2 className="h-5 w-5" />}
              className="justify-start h-12"
            >
              <div className="text-left">
                <div className="font-medium">Manage Organizations</div>
                <div className="text-sm text-gray-500">Create, edit, and manage organization status</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/users')}
              leftIcon={<Users className="h-5 w-5" />}
              className="justify-start h-12"
            >
              <div className="text-left">
                <div className="font-medium">Manage Users</div>
                <div className="text-sm text-gray-500">User accounts and permissions</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/assessments')}
              leftIcon={<ClipboardList className="h-5 w-5" />}
              className="justify-start h-12"
            >
              <div className="text-left">
                <div className="font-medium">System Assessments</div>
                <div className="text-sm text-gray-500">Manage assessment templates</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/admin/email-templates')}
              leftIcon={<Settings className="h-5 w-5" />}
              className="justify-start h-12"
            >
              <div className="text-left">
                <div className="font-medium">Email Templates</div>
                <div className="text-sm text-gray-500">Manage system email templates</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organization Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Organization Management
            </CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search organizations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive' | 'suspended')}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
              <Button
                onClick={() => navigate('/admin/organizations')}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Organization
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrganizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No organizations found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrganizations.map((org) => {
                const orgUsers = users.filter(user => user.organizationId === org.id);
                const orgAssessments = assessments.filter(assessment => assessment.organizationId === org.id);
                
                return (
                  <Card key={org.id} className="hover:shadow-card-hover transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 truncate">{org.name}</h3>
                          <p className="text-sm text-gray-500">
                            Created {new Date(org.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                          {getStatusIcon(org.status)}
                          <span className="ml-1 capitalize">{org.status || 'active'}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div>
                          <div className="font-medium text-gray-900">{orgUsers.length}</div>
                          <div className="text-gray-600">Users</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{orgAssessments.length}</div>
                          <div className="text-gray-600">Assessments</div>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/organizations?selected=${org.id}`)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/organizations/${org.id}/results`)}
                          leftIcon={<BarChart4 className="h-4 w-4" />}
                        >
                          Results
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;