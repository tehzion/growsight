import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  Users,
  FileText,
  Building2,
  Download,
  Filter,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useReportingStore } from '../../stores/reportingStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAuthStore } from '../../stores/authStore';

interface AnalyticsData {
  userActivity: Array<{ date: string; active_users: number; new_users: number }>;
  assessmentCompletion: Array<{ date: string; completions: number; assessments: number }>;
  organizationPerformance: Array<{ organization: string; completions: number; avg_score: number }>;
  competencyScores: Array<{ competency: string; avg_score: number; total_responses: number }>;
  userGrowth: Array<{ month: string; total_users: number; new_users: number }>;
}

interface FilterOptions {
  dateRange: string;
  organizationId: string;
  assessmentId: string;
  userRole: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchReports, exportReports, isLoading: reportsLoading } = useReportingStore();
  const { results, fetchResults, isLoading: resultsLoading } = useAssessmentResultsStore();
  const { users, fetchUsers, isLoading: usersLoading } = useUserStore();
  const { organizations, fetchOrganizations, isLoading: orgsLoading } = useOrganizationStore();
  const { assessments, fetchAssessments, isLoading: assessmentsLoading } = useAssessmentStore();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    userActivity: [],
    assessmentCompletion: [],
    organizationPerformance: [],
    competencyScores: [],
    userGrowth: []
  });

  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '30',
    organizationId: '',
    assessmentId: '',
    userRole: ''
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState<'user' | 'assessment' | 'organization' | 'competency'>('user');

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUsers(),
        fetchOrganizations(),
        fetchAssessments(),
        fetchResults(),
        fetchReports()
      ]);

      // Process the data for analytics
      processAnalyticsData();
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const processAnalyticsData = () => {
    if (!users || !results || !organizations || !assessments) return;

    const dateRangeDays = parseInt(filters.dateRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRangeDays);

    // Filter data based on filters
    let filteredUsers = users;
    let filteredResults = results;

    if (filters.organizationId) {
      filteredUsers = users.filter(u => u.organization_id === filters.organizationId);
      filteredResults = results.filter(r => 
        filteredUsers.some(u => u.id === r.user_id)
      );
    }

    if (filters.userRole) {
      filteredUsers = filteredUsers.filter(u => u.role === filters.userRole);
      filteredResults = filteredResults.filter(r => 
        filteredUsers.some(u => u.id === r.user_id)
      );
    }

    if (filters.assessmentId) {
      filteredResults = filteredResults.filter(r => r.assessment_id === filters.assessmentId);
    }

    // Process user activity data
    const userActivityData = [];
    for (let i = dateRangeDays; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const activeUsers = filteredUsers.filter(u => 
        u.last_login && new Date(u.last_login).toDateString() === date.toDateString()
      ).length;

      const newUsers = filteredUsers.filter(u => 
        new Date(u.created_at).toDateString() === date.toDateString()
      ).length;

      userActivityData.push({
        date: dateStr,
        active_users: activeUsers,
        new_users: newUsers
      });
    }

    // Process assessment completion data
    const assessmentCompletionData = [];
    for (let i = dateRangeDays; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const completions = filteredResults.filter(r => 
        new Date(r.created_at).toDateString() === date.toDateString()
      ).length;

      const uniqueAssessments = new Set(
        filteredResults
          .filter(r => new Date(r.created_at).toDateString() === date.toDateString())
          .map(r => r.assessment_id)
      ).size;

      assessmentCompletionData.push({
        date: dateStr,
        completions,
        assessments: uniqueAssessments
      });
    }

    // Process organization performance
    const orgPerformanceMap = new Map();
    organizations.forEach(org => {
      const orgUsers = filteredUsers.filter(u => u.organization_id === org.id);
      const orgResults = filteredResults.filter(r => 
        orgUsers.some(u => u.id === r.user_id)
      );

      if (orgResults.length > 0) {
        const avgScore = orgResults.reduce((sum, r) => {
          const score = typeof r.score === 'number' ? r.score : 
                       r.score && typeof r.score === 'object' && 'total' in r.score ? 
                       (r.score as any).total : 0;
          return sum + score;
        }, 0) / orgResults.length;

        orgPerformanceMap.set(org.name, {
          organization: org.name,
          completions: orgResults.length,
          avg_score: Math.round(avgScore * 100) / 100
        });
      }
    });

    // Process competency scores
    const competencyMap = new Map();
    filteredResults.forEach(result => {
      if (result.responses && Array.isArray(result.responses)) {
        result.responses.forEach((response: any) => {
          if (response.question_id && response.value) {
            // Find the question to get competency info
            const assessment = assessments.find(a => a.id === result.assessment_id);
            if (assessment && assessment.sections) {
              assessment.sections.forEach(section => {
                if (section.questions) {
                  const question = section.questions.find(q => q.id === response.question_id);
                  if (question && question.competency) {
                    const competency = question.competency;
                    if (!competencyMap.has(competency)) {
                      competencyMap.set(competency, { total: 0, count: 0 });
                    }
                    const current = competencyMap.get(competency);
                    current.total += typeof response.value === 'number' ? response.value : 0;
                    current.count += 1;
                  }
                }
              });
            }
          }
        });
      }
    });

    const competencyScores = Array.from(competencyMap.entries()).map(([competency, data]) => ({
      competency,
      avg_score: Math.round((data.total / data.count) * 100) / 100,
      total_responses: data.count
    }));

    // Process user growth (monthly data)
    const userGrowthData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const totalUsers = filteredUsers.filter(u => 
        new Date(u.created_at) <= monthEnd
      ).length;

      const newUsers = filteredUsers.filter(u => {
        const createdDate = new Date(u.created_at);
        return createdDate >= monthStart && createdDate <= monthEnd;
      }).length;

      userGrowthData.push({
        month: monthStr,
        total_users: totalUsers,
        new_users: newUsers
      });
    }

    setAnalyticsData({
      userActivity: userActivityData,
      assessmentCompletion: assessmentCompletionData,
      organizationPerformance: Array.from(orgPerformanceMap.values()),
      competencyScores,
      userGrowth: userGrowthData
    });
  };

  const handleExport = async () => {
    try {
      await exportReports({
        type: 'analytics',
        filters,
        data: analyticsData
      });
    } catch (error) {
      console.error('Failed to export analytics:', error);
    }
  };

  const renderChart = () => {
    switch (activeChart) {
      case 'user':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analyticsData.userActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="active_users" 
                stroke="#8884d8" 
                name="Active Users"
              />
              <Line 
                type="monotone" 
                dataKey="new_users" 
                stroke="#82ca9d" 
                name="New Users"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'assessment':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.assessmentCompletion}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completions" fill="#8884d8" name="Completions" />
              <Bar dataKey="assessments" fill="#82ca9d" name="Unique Assessments" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'organization':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={analyticsData.organizationPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="organization" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completions" fill="#8884d8" name="Completions" />
              <Bar dataKey="avg_score" fill="#82ca9d" name="Avg Score" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'competency':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={analyticsData.competencyScores}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ competency, avg_score }) => `${competency}: ${avg_score}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="avg_score"
              >
                {analyticsData.competencyScores.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Select a chart type</div>;
    }
  };

  const isLoading = reportsLoading || resultsLoading || usersLoading || orgsLoading || assessmentsLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-1">
            Data insights and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={handleExport}
            leftIcon={<Download className="h-4 w-4" />}
            variant="outline"
          >
            Export Data
          </Button>
          <Button
            onClick={loadAnalyticsData}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormInput
              label="Date Range"
              type="select"
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              options={[
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
                { value: '90', label: 'Last 90 days' },
                { value: '365', label: 'Last year' }
              ]}
            />
            <FormInput
              label="Organization"
              type="select"
              value={filters.organizationId}
              onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
              options={[
                { value: '', label: 'All Organizations' },
                ...(organizations || []).map(org => ({
                  value: org.id,
                  label: org.name
                }))
              ]}
            />
            <FormInput
              label="Assessment"
              type="select"
              value={filters.assessmentId}
              onChange={(e) => setFilters({ ...filters, assessmentId: e.target.value })}
              options={[
                { value: '', label: 'All Assessments' },
                ...(assessments || []).map(assessment => ({
                  value: assessment.id,
                  label: assessment.title
                }))
              ]}
            />
            <FormInput
              label="User Role"
              type="select"
              value={filters.userRole}
              onChange={(e) => setFilters({ ...filters, userRole: e.target.value })}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'employee', label: 'Employee' },
                { value: 'reviewer', label: 'Reviewer' },
                { value: 'org_admin', label: 'Org Admin' }
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chart Selection */}
      <div className="flex space-x-2">
        <Button
          variant={activeChart === 'user' ? 'primary' : 'outline'}
          onClick={() => setActiveChart('user')}
          leftIcon={<Users className="h-4 w-4" />}
        >
          User Activity
        </Button>
        <Button
          variant={activeChart === 'assessment' ? 'primary' : 'outline'}
          onClick={() => setActiveChart('assessment')}
          leftIcon={<FileText className="h-4 w-4" />}
        >
          Assessment Completions
        </Button>
        <Button
          variant={activeChart === 'organization' ? 'primary' : 'outline'}
          onClick={() => setActiveChart('organization')}
          leftIcon={<Building2 className="h-4 w-4" />}
        >
          Organization Performance
        </Button>
        <Button
          variant={activeChart === 'competency' ? 'primary' : 'outline'}
          onClick={() => setActiveChart('competency')}
          leftIcon={<PieChartIcon className="h-4 w-4" />}
        >
          Competency Scores
        </Button>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>
              {activeChart === 'user' && 'User Activity Trends'}
              {activeChart === 'assessment' && 'Assessment Completion Trends'}
              {activeChart === 'organization' && 'Organization Performance'}
              {activeChart === 'competency' && 'Competency Score Distribution'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-pulse text-gray-500">Loading analytics data...</div>
            </div>
          ) : (
            renderChart()
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-600">Total Users</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {users?.length || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {analyticsData.userGrowth.slice(-1)[0]?.new_users || 0} new this month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Total Completions</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {results?.length || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {analyticsData.assessmentCompletion.reduce((sum, day) => sum + day.completions, 0)} in selected period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600">Active Organizations</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {organizations?.filter(org => org.status === 'active')?.length || 0}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {organizations?.length || 0} total organizations
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-600">Avg Completion Rate</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">
              {results && users && users.length > 0 
                ? Math.round((results.length / users.length) * 100) 
                : 0}%
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Overall completion rate
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;