import React, { useEffect, useState } from 'react';
import { useAssessmentResultsStore, AssessmentAnalytics, ComparisonData } from '../../stores/assessmentResultsStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { useUserStore } from '../../stores/userStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ResultChart } from '../../components/results/ResultChart';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  PieChart, 
  Download,
  Filter,
  RefreshCw,
  User,
  Eye,
  Send,
  FileText,
  FileDown,
  Building,
  UserCheck
} from 'lucide-react';

interface AssessmentResultsProps {}

export const AssessmentResults: React.FC<AssessmentResultsProps> = () => {
  const { 
    analytics, 
    comparisonData, 
    isLoading, 
    error,
    fetchAnalytics, 
    fetchComparisonData,
    fetchSelfAssessments,
    fetchReviewsAboutMe,
    fetchReviewsDoneByMe,
    fetchOrgDepartmentBreakdown,
    fetchAllOrgResults,
    exportAllResultsAsCSV
  } = useAssessmentResultsStore();
  
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { currentOrganization, organizations, fetchOrganizations } = useOrganizationStore();
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'analytics' | 'self' | 'reviews' | 'department'>('analytics');
  const [selfAssessments, setSelfAssessments] = useState<any[]>([]);
  const [reviewsAboutMe, setReviewsAboutMe] = useState<any[]>([]);
  const [reviewsDoneByMe, setReviewsDoneByMe] = useState<any[]>([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<any>(null);
  const [allOrgResults, setAllOrgResults] = useState<any[]>([]);
  
  // Super admin specific state
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showUserSelector, setShowUserSelector] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchOrganizations();
    }
  }, [user?.role, fetchOrganizations]);

  useEffect(() => {
    if (selectedOrgId && user?.role === 'super_admin') {
      fetchUsers(selectedOrgId);
    }
  }, [selectedOrgId, user?.role, fetchUsers]);

  useEffect(() => {
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    if (targetOrgId) {
      fetchAssessments(targetOrgId);
      fetchAnalytics(targetOrgId);
    }
  }, [user?.role, selectedOrgId, currentOrganization?.id, fetchAssessments, fetchAnalytics]);

  const handleAssessmentChange = (assessmentId: string) => {
    setSelectedAssessment(assessmentId);
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    if (assessmentId && targetOrgId) {
      fetchAnalytics(targetOrgId, assessmentId);
    }
  };

  const handleQuestionComparison = async () => {
    if (selectedQuestions.length > 0) {
      const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
      if (targetOrgId) {
        await fetchComparisonData(selectedQuestions, targetOrgId);
      }
    }
  };

  const handleExportResults = async () => {
    try {
      const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
      const targetUserId = user?.role === 'super_admin' ? selectedUserId : undefined;
      
      if (user?.role === 'super_admin') {
        // Super admins can export all results or specific org/user
        const csvData = await exportAllResultsAsCSV(targetOrgId, targetUserId);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = targetUserId 
          ? `user_${targetUserId}_results_${new Date().toISOString().split('T')[0]}.csv`
          : targetOrgId 
            ? `org_${targetOrgId}_results_${new Date().toISOString().split('T')[0]}.csv`
            : `all_assessment_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Org admins export their organization's results
        if (targetOrgId) {
          const csvData = await exportAllResultsAsCSV(targetOrgId, targetUserId);
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentOrganization?.name}_assessment_results_${new Date().toISOString().split('T')[0]}.csv`;
          a.click();
          window.URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Error exporting results:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      const { exportAssessmentResultsPDF } = await import('../../utils/pdfExport');
      
      const options = {
        title: getRoleBasedTitle(),
        subtitle: getRoleBasedDescription(),
        organizationName: user?.role === 'super_admin' 
          ? (selectedOrgId ? organizations.find(o => o.id === selectedOrgId)?.name : 'All Organizations')
          : currentOrganization?.name,
        includeCharts: true,
        includeTables: true,
        orientation: 'portrait' as const,
        format: 'a4' as const
      };

      const data = {
        analytics,
        comparisonData,
        selfAssessments,
        reviewsAboutMe,
        reviewsDoneByMe,
        departmentBreakdown,
        allOrgResults
      };

      const blob = await exportAssessmentResultsPDF(data, options);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessment_results_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const loadSelfAssessments = async () => {
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    const targetUserId = user?.role === 'super_admin' ? selectedUserId : user?.id;
    
    if (targetUserId && targetOrgId) {
      const results = await fetchSelfAssessments(targetUserId, targetOrgId);
      setSelfAssessments(results);
    }
  };

  const loadReviewsAboutMe = async () => {
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    const targetUserId = user?.role === 'super_admin' ? selectedUserId : user?.id;
    
    if (targetUserId && targetOrgId) {
      const results = await fetchReviewsAboutMe(targetUserId, targetOrgId);
      setReviewsAboutMe(results);
    }
  };

  const loadReviewsDoneByMe = async () => {
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    const targetUserId = user?.role === 'super_admin' ? selectedUserId : user?.id;
    
    if (targetUserId && targetOrgId) {
      const results = await fetchReviewsDoneByMe(targetUserId, targetOrgId);
      setReviewsDoneByMe(results);
    }
  };

  const loadDepartmentBreakdown = async () => {
    const targetOrgId = user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id;
    if (targetOrgId) {
      const results = await fetchOrgDepartmentBreakdown(targetOrgId);
      setDepartmentBreakdown(results);
    }
  };

  const loadAllOrgResults = async () => {
    if (user?.role === 'super_admin') {
      const results = await fetchAllOrgResults();
      setAllOrgResults(results);
    }
  };

  const getRelationshipTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'peer': 'Peer Review',
      'supervisor': 'Supervisor Review',
      'subordinate': 'Subordinate Review',
      'client': 'Client Review'
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 6) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 6) return 'Excellent';
    if (score >= 4) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Needs Improvement';
  };

  const getRoleBasedTitle = (): string => {
    switch (user?.role) {
      case 'super_admin':
        if (selectedUserId) {
          const selectedUser = users.find(u => u.id === selectedUserId);
          return `${selectedUser?.name || 'User'} Assessment Results`;
        }
        if (selectedOrgId) {
          const selectedOrg = organizations.find(o => o.id === selectedOrgId);
          return `${selectedOrg?.name || 'Organization'} Assessment Results`;
        }
        return 'All Organizations Assessment Results';
      case 'org_admin':
        return `${currentOrganization?.name || 'Organization'} Assessment Results`;
      default:
        return 'Assessment Results';
    }
  };

  const getRoleBasedDescription = (): string => {
    switch (user?.role) {
      case 'super_admin':
        if (selectedUserId) {
          return 'Individual user assessment results and analytics';
        }
        if (selectedOrgId) {
          return 'Organization-specific assessment performance and outcomes';
        }
        return 'Comprehensive analysis across all organizations and departments';
      case 'org_admin':
        return 'Analysis of assessment performance and outcomes for your organization';
      default:
        return 'Your assessment results and feedback';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="text-center text-red-600">
            <p>Error loading assessment results: {error}</p>
            <Button onClick={() => fetchAnalytics(currentOrganization?.id || '')}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{getRoleBasedTitle()}</h1>
          <p className="text-gray-600 mt-2">
            {getRoleBasedDescription()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportResults}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={() => fetchAnalytics(user?.role === 'super_admin' ? selectedOrgId : currentOrganization?.id || '', selectedAssessment)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Super Admin Organization and User Selectors */}
      {user?.role === 'super_admin' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Organization & User Selection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => {
                    setSelectedOrgId(e.target.value);
                    setSelectedUserId('');
                    setShowUserSelector(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Organizations</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrgId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User (Optional)
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setShowUserSelector(e.target.value !== '');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <Button 
                  onClick={() => {
                    if (selectedOrgId) {
                      fetchAnalytics(selectedOrgId, selectedAssessment);
                    }
                  }}
                  disabled={!selectedOrgId}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Load Results
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* View Mode Tabs */}
      <Card>
        <div className="p-6">
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setViewMode('analytics')}
              className={`pb-2 px-4 ${viewMode === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics Overview
            </button>
            {user?.role !== 'super_admin' && (
              <>
                <button
                  onClick={() => {
                    setViewMode('self');
                    loadSelfAssessments();
                  }}
                  className={`pb-2 px-4 ${viewMode === 'self' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                >
                  <User className="w-4 h-4 inline mr-2" />
                  My Self-Assessments
                </button>
                <button
                  onClick={() => {
                    setViewMode('reviews');
                    loadReviewsAboutMe();
                    loadReviewsDoneByMe();
                  }}
                  className={`pb-2 px-4 ${viewMode === 'reviews' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                >
                  <Eye className="w-4 h-4 inline mr-2" />
                  My Reviews
                </button>
              </>
            )}
            {user?.role === 'org_admin' && (
              <button
                onClick={() => {
                  setViewMode('department');
                  loadDepartmentBreakdown();
                }}
                className={`pb-2 px-4 ${viewMode === 'department' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Department Breakdown
              </button>
            )}
            {user?.role === 'super_admin' && (
              <button
                onClick={() => {
                  setViewMode('department');
                  loadAllOrgResults();
                }}
                className={`pb-2 px-4 ${viewMode === 'department' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
              >
                <FileText className="w-4 h-4 inline mr-2" />
                All Organizations
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Analytics Overview View */}
      {viewMode === 'analytics' && (
        <>
          {/* Filters */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters & Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assessment
                  </label>
                  <select
                    value={selectedAssessment}
                    onChange={(e) => handleAssessmentChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Assessments</option>
                    {assessments.map((assessment) => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Relationship Type
                  </label>
                  <select
                    value={relationshipTypeFilter}
                    onChange={(e) => setRelationshipTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="peer">Peer Review</option>
                    <option value="supervisor">Supervisor Review</option>
                    <option value="subordinate">Subordinate Review</option>
                    <option value="client">Client Review</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleQuestionComparison} disabled={selectedQuestions.length === 0}>
                    Compare Questions
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Analytics Overview */}
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.totalAssessments}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Target className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.completedAssessments}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <TrendingUp className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Average Score</p>
                        <p className={`text-2xl font-bold ${getScoreColor(analytics.averageScore)}`}>
                          {analytics.averageScore.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500">{getScoreLabel(analytics.averageScore)}</p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                        <p className="text-2xl font-bold text-gray-900">{analytics.completionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Relationship Type Breakdown */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <PieChart className="w-5 h-5 mr-2" />
                    Assessment Distribution by Relationship Type
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {Object.entries(analytics.relationshipTypeBreakdown).map(([type, count]) => (
                      <div key={type} className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-gray-600">
                          {getRelationshipTypeLabel(type)}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">{count}</p>
                        <p className="text-sm text-gray-500">
                          {((count / analytics.totalAssessments) * 100).toFixed(1)}% of total
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Top Strengths and Areas for Improvement */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-green-700">Top Strengths</h3>
                    <div className="space-y-3">
                      {analytics.topStrengths.map((strength, index) => (
                        <div key={strength} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">Strength {index + 1}</span>
                          <span className="text-sm text-green-600">Question ID: {strength}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4 text-red-700">Areas for Improvement</h3>
                    <div className="space-y-3">
                      {analytics.areasForImprovement.map((area, index) => (
                        <div key={area} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">Area {index + 1}</span>
                          <span className="text-sm text-red-600">Question ID: {area}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Question Averages Chart */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Question Performance Averages</h3>
                  <div className="h-64">
                    <ResultChart
                      data={Object.entries(analytics.questionAverages).map(([questionId, average]) => ({
                        question: `Q${questionId.slice(-3)}`,
                        score: average,
                        label: getScoreLabel(average)
                      }))}
                      type="bar"
                    />
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Comparison Data */}
          {comparisonData.length > 0 && (
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Question Comparison Analysis</h3>
                <div className="space-y-6">
                  {comparisonData.map((comparison) => (
                    <div key={comparison.questionId} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">{comparison.questionText}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Average Score</p>
                          <p className={`text-xl font-bold ${getScoreColor(comparison.averageScore)}`}>
                            {comparison.averageScore.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total Responses</p>
                          <p className="text-xl font-bold text-gray-900">{comparison.totalResponses}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Score Distribution</p>
                          <div className="flex space-x-1">
                            {Object.entries(comparison.scoreDistribution).map(([score, count]) => (
                              <div key={score} className="text-center">
                                <div className="text-xs text-gray-500">{score}</div>
                                <div className="text-sm font-medium">{count}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Relationship Type Averages */}
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">By Relationship Type:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(comparison.relationshipTypeAverages).map(([type, average]) => (
                            <div key={type} className="text-center p-2 bg-gray-50 rounded">
                              <p className="text-xs text-gray-600">{getRelationshipTypeLabel(type)}</p>
                              <p className={`text-sm font-bold ${getScoreColor(average)}`}>
                                {average.toFixed(1)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Self-Assessments View */}
      {viewMode === 'self' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">My Self-Assessments</h3>
            {selfAssessments.length > 0 ? (
              <div className="space-y-4">
                {selfAssessments.map((assessment) => (
                  <div key={assessment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900">{assessment.assessment_title}</h4>
                        <p className="text-sm text-gray-600">Completed: {new Date(assessment.completed_at).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">Average Score: {assessment.average_score?.toFixed(1) || 'N/A'}</p>
                        {assessment.section_averages && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700">Section Averages:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(assessment.section_averages).map(([section, avg]: [string, any]) => (
                                <span key={section} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {section}: {avg.toFixed(1)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assessment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assessment.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No self-assessments found.</p>
            )}
          </div>
        </Card>
      )}

      {/* Reviews View */}
      {viewMode === 'reviews' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reviews About Me</h3>
              {reviewsAboutMe.length > 0 ? (
                <div className="space-y-4">
                  {reviewsAboutMe.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{review.assessment_title}</h4>
                          <p className="text-sm text-gray-600">Reviewer: {review.reviewer_name}</p>
                          <p className="text-sm text-gray-600">Relationship: {getRelationshipTypeLabel(review.relationship_type)}</p>
                          <p className="text-sm text-gray-600">Score: {review.average_score?.toFixed(1) || 'N/A'}</p>
                          {review.section_averages && (
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700">Section Averages:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {Object.entries(review.section_averages).map(([section, avg]: [string, any]) => (
                                  <span key={section} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                    {section}: {avg.toFixed(1)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            review.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {review.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No reviews about you found.</p>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Reviews Done By Me</h3>
              {reviewsDoneByMe.length > 0 ? (
                <div className="space-y-4">
                  {reviewsDoneByMe.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{review.assessment_title}</h4>
                          <p className="text-sm text-gray-600">Reviewee: {review.reviewee_name}</p>
                          <p className="text-sm text-gray-600">Relationship: {getRelationshipTypeLabel(review.relationship_type)}</p>
                          <p className="text-sm text-gray-600">Score: {review.average_score?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            review.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {review.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No reviews done by you found.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Department/Organization Breakdown View */}
      {viewMode === 'department' && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {user?.role === 'super_admin' ? 'All Organizations Overview' : 'Department Breakdown'}
            </h3>
            {user?.role === 'super_admin' ? (
              allOrgResults.length > 0 ? (
                <div className="space-y-4">
                  {allOrgResults.map((org) => (
                    <div key={org.organization_id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{org.organization_name}</h4>
                          <p className="text-sm text-gray-600">Total Assessments: {org.total_assessments}</p>
                          <p className="text-sm text-gray-600">Completed: {org.completed_assessments}</p>
                          <p className="text-sm text-gray-600">Average Score: {org.average_score?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            Send Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No organization results found.</p>
              )
            ) : (
              departmentBreakdown ? (
                <div className="space-y-4">
                  {Object.entries(departmentBreakdown).map(([deptName, data]: [string, any]) => (
                    <div key={deptName} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-900">{deptName}</h4>
                          <p className="text-sm text-gray-600">Total Assessments: {data.total_assessments}</p>
                          <p className="text-sm text-gray-600">Completed: {data.completed_assessments}</p>
                          <p className="text-sm text-gray-600">Average Score: {data.average_score?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                          <Button variant="outline" size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            Send Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No department breakdown available.</p>
              )
            )}
          </div>
        </Card>
      )}

      {!analytics && !isLoading && viewMode === 'analytics' && (
        <Card>
          <div className="p-6 text-center">
            <p className="text-gray-600">No assessment results available yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Results will appear here once assessments are completed.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AssessmentResults; 