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
  UserCheck,
  Hash,
  MessageSquare,
  ExternalLink
} from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReportGenerator from '../../components/reports/ReportGenerator';

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
      const reportElement = document.getElementById('assessment-report-admin');
      if (reportElement) {
        const canvas = await html2canvas(reportElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 297;  
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`assessment_results_${selectedUserId || selectedOrgId || 'all'}.pdf`);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleCreateSupportTicket = (assessmentId?: string, assessmentResultId?: string) => {
    // Navigate to support page with pre-filled assessment data
    const params = new URLSearchParams();
    if (assessmentId) params.append('assessmentId', assessmentId);
    if (assessmentResultId) params.append('assessmentResultId', assessmentResultId);
    
    window.open(`/support?${params.toString()}`, '_blank');
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
      const breakdown = await fetchOrgDepartmentBreakdown(targetOrgId);
      setDepartmentBreakdown(breakdown);
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
      'self': 'Self Assessment',
      'peer': 'Peer Review',
      'manager': 'Manager Review',
      'subordinate': 'Subordinate Review',
      'customer': 'Customer Review'
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  const getRoleBasedTitle = (): string => {
    if (user?.role === 'super_admin') {
      return selectedOrgId 
        ? `${organizations.find(o => o.id === selectedOrgId)?.name} Assessment Results`
        : 'All Organizations Assessment Results';
    }
    return `${currentOrganization?.name} Assessment Results`;
  };

  const getRoleBasedDescription = (): string => {
    if (user?.role === 'super_admin') {
      return selectedOrgId 
        ? `Comprehensive assessment results for ${organizations.find(o => o.id === selectedOrgId)?.name}`
        : 'Comprehensive assessment results across all organizations';
    }
    return `Comprehensive assessment results for ${currentOrganization?.name}`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading assessment results: {error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getRoleBasedTitle()}</h1>
          <p className="text-gray-600 mt-1">{getRoleBasedDescription()}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => handleCreateSupportTicket(selectedAssessment)}
            leftIcon={<MessageSquare className="h-4 w-4" />}
          >
            Get Support
          </Button>
          <Button
            variant="outline"
            onClick={handleExportResults}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            leftIcon={<FileText className="h-4 w-4" />}
          >
            Export PDF
          </Button>
        </div>
      </div>

      {/* Assessment ID Display */}
      {selectedAssessment && (
        <Card className="bg-blue-50 border-blue-200">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Hash className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Assessment ID:</span>
                <code className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono">
                  {selectedAssessment}
                </code>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCreateSupportTicket(selectedAssessment)}
                leftIcon={<MessageSquare className="h-4 w-4" />}
              >
                Report Issue
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Super Admin Controls */}
      {user?.role === 'super_admin' && (
        <Card>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization
                </label>
                <select
                  value={selectedOrgId}
                  onChange={(e) => setSelectedOrgId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Organizations</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Users</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={() => setShowUserSelector(!showUserSelector)}
                  variant="outline"
                  className="w-full"
                >
                  {showUserSelector ? 'Hide' : 'Show'} User Selector
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Assessment Selector */}
      <Card>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment
              </label>
              <select
                value={selectedAssessment}
                onChange={(e) => handleAssessmentChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Assessments</option>
                {assessments.map(assessment => (
                  <option key={assessment.id} value={assessment.id}>
                    {assessment.title} (ID: {assessment.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end space-x-2">
              <Button
                onClick={() => handleCreateSupportTicket(selectedAssessment)}
                variant="outline"
                leftIcon={<MessageSquare className="h-4 w-4" />}
              >
                Support for This Assessment
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'analytics', label: 'Analytics', icon: <BarChart3 className="h-4 w-4" /> },
            { key: 'self', label: 'Self Assessments', icon: <User className="h-4 w-4" /> },
            { key: 'reviews', label: 'Reviews', icon: <Users className="h-4 w-4" /> },
            { key: 'department', label: 'Department Breakdown', icon: <Building className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-1 ${
                viewMode === tab.key
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

      {/* Analytics View */}
      {viewMode === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Participants</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.totalParticipants}</p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Average Score</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.averageScore}%</p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.completionRate}%</p>
                  </div>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <PieChart className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Response Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics.responseRate}%</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Score Distribution</h3>
                <ResultChart data={analytics.scoreDistribution} type="bar" />
              </div>
            </Card>
            
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Response Trends</h3>
                <ResultChart data={analytics.responseTrends} type="line" />
              </div>
            </Card>
          </div>

          {/* Assessment Results Table with IDs */}
          <Card>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assessment Results</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreateSupportTicket(selectedAssessment)}
                  leftIcon={<MessageSquare className="h-4 w-4" />}
                >
                  Report Issues
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Assessment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
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
                    {analytics.results?.map((result: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <code className="text-sm font-mono text-gray-600">
                              {result.assessmentId?.slice(0, 8)}...
                            </code>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {result.participantName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.participantEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${getScoreColor(result.score)}`}>
                            {result.score}%
                          </div>
                          <div className="text-sm text-gray-500">
                            {getScoreLabel(result.score)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            result.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {result.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateSupportTicket(result.assessmentId, result.id)}
                              leftIcon={<MessageSquare className="h-4 w-4" />}
                            >
                              Support
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/assessment-report/${result.employeeId}/${result.assessmentId}`)}
                              leftIcon={<ExternalLink className="h-4 w-4" />}
                            >
                              View Report
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Other view modes would continue here... */}
    </div>
  );
};

export default AssessmentResults; 