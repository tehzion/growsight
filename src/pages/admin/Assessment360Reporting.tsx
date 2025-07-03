import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Target, 
  Award,
  Download,
  Filter,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  PieChart,
  LineChart,
  Settings,
  Shield,
  Building2
} from 'lucide-react';
import { useAssessment360Store, Assessment360Summary, Assessment360Overview } from '../../stores/assessment360Store';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import FormInput from '../../components/ui/FormInput';
import Assessment360ExportManager from '../../components/admin/Assessment360ExportManager';

const Assessment360Reporting = () => {
  const { assessmentId, participantId } = useParams<{ assessmentId: string; participantId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentAssessment } = useAssessmentStore();
  const {
    isLoading,
    error,
    summaries,
    overviews,
    fetchSummaries,
    fetchOverviews,
    calculateSummary,
    get360Results,
    clearError,
    checkPermissions,
    canViewAllOrganizations,
    canViewOrganization,
    canViewOwnData,
    canExportWithNames
  } = useAssessment360Store();

  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(participantId || null);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison' | 'export'>('overview');
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [showExportManager, setShowExportManager] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  useEffect(() => {
    checkPermissions();
  }, []);

  useEffect(() => {
    if (assessmentId) {
      fetchOverviews(assessmentId);
      if (selectedParticipant) {
        fetchSummaries(assessmentId, selectedParticipant);
      }
    }
  }, [assessmentId, selectedParticipant]);

  const handleParticipantChange = (participantId: string) => {
    setSelectedParticipant(participantId);
    if (assessmentId) {
      fetchSummaries(assessmentId, participantId);
    }
  };

  const handleCalculateSummary = async () => {
    if (assessmentId && selectedParticipant) {
      await calculateSummary(assessmentId, selectedParticipant);
    }
  };

  const handleExportComplete = (success: boolean, message: string) => {
    if (success) {
      // Show success notification
      console.log('Export successful:', message);
    } else {
      // Show error notification
      console.error('Export failed:', message);
    }
  };

  const getRatingColor = (rating: number | null) => {
    if (!rating) return 'text-gray-400';
    if (rating >= 8) return 'text-green-600';
    if (rating >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGapColor = (gap: number | null) => {
    if (!gap) return 'text-gray-400';
    if (Math.abs(gap) <= 0.5) return 'text-green-600';
    if (Math.abs(gap) <= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getGapIcon = (gap: number | null) => {
    if (!gap) return null;
    if (gap > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (gap < 0) return <TrendingUp className="h-4 w-4 text-red-600 transform rotate-180" />;
    return <Target className="h-4 w-4 text-green-600" />;
  };

  const getCompletionStatus = (overview: Assessment360Overview) => {
    if (overview.completionRate >= 90) return { status: 'Complete', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
    if (overview.completionRate >= 70) return { status: 'In Progress', color: 'text-yellow-600', icon: <Clock className="h-4 w-4" /> };
    return { status: 'Pending', color: 'text-red-600', icon: <AlertCircle className="h-4 w-4" /> };
  };

  const getPermissionInfo = () => {
    if (isSuperAdmin) {
      return {
        title: 'Super Admin Access',
        description: 'You can view all 360° assessment data across all organizations',
        icon: <Shield className="h-5 w-5 text-purple-600" />,
        color: 'text-purple-600'
      };
    } else if (isOrgAdmin) {
      return {
        title: 'Organization Admin Access',
        description: 'You can view 360° assessment data within your organization',
        icon: <Building2 className="h-5 w-5 text-blue-600" />,
        color: 'text-blue-600'
      };
    } else {
      return {
        title: 'User Access',
        description: 'You can only view your own 360° assessment results',
        icon: <Users className="h-5 w-5 text-green-600" />,
        color: 'text-green-600'
      };
    }
  };

  const permissionInfo = getPermissionInfo();

  if (!assessmentId) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Assessment Not Found</h3>
          <p className="text-gray-600">Please select a valid 360° assessment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/assessment-360')}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">360° Assessment Reporting</h1>
                  <p className="text-gray-600">
                    {currentAssessment?.title || 'Assessment Results'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCalculateSummary}
                  isLoading={isLoading}
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Refresh Data
                </Button>
                
                <Button
                  onClick={() => setViewMode('export')}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export Data
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Permission Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              {permissionInfo.icon}
              <div>
                <h3 className={`font-medium ${permissionInfo.color}`}>{permissionInfo.title}</h3>
                <p className="text-sm text-gray-600">{permissionInfo.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Participant:</span>
            </div>
            
            <select
              value={selectedParticipant || ''}
              onChange={(e) => handleParticipantChange(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select Participant</option>
              {overviews.map(overview => (
                <option key={overview.participantId} value={overview.participantId}>
                  {overview.participantFirstName} {overview.participantLastName} 
                  ({overview.participantRole}) - {overview.completionRate.toFixed(1)}% Complete
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-2 ml-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex space-x-1">
                {[
                  { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
                  { id: 'detailed', label: 'Detailed', icon: <Eye className="h-4 w-4" /> },
                  { id: 'comparison', label: 'Comparison', icon: <LineChart className="h-4 w-4" /> },
                  { id: 'export', label: 'Export', icon: <Download className="h-4 w-4" /> }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as any)}
                    className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewMode === mode.id
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {mode.icon}
                    <span>{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-red-800">{error}</span>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'export' ? (
          <Assessment360ExportManager
            assessmentId={assessmentId}
            participantId={selectedParticipant || undefined}
            onExportComplete={handleExportComplete}
          />
        ) : viewMode === 'overview' ? (
          <div className="space-y-6">
            {/* Participant Overview */}
            {selectedParticipant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Participant Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {overviews.filter(o => o.participantId === selectedParticipant).map(overview => {
                    const status = getCompletionStatus(overview);
                    return (
                      <div key={overview.participantId} className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {overview.totalAssignments}
                          </div>
                          <div className="text-sm text-blue-800">Total Assignments</div>
                        </div>
                        
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {overview.completedAssignments}
                          </div>
                          <div className="text-sm text-green-800">Completed</div>
                        </div>
                        
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">
                            {overview.completionRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-yellow-800">Completion Rate</div>
                        </div>
                        
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="flex items-center justify-center space-x-1">
                            {status.icon}
                            <span className={`text-sm font-medium ${status.color}`}>
                              {status.status}
                            </span>
                          </div>
                          <div className="text-sm text-purple-800">Status</div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            )}

            {/* Assessment Overview Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Assessment Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participant
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Self
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Peer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Subordinate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Supervisor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {overviews.map(overview => {
                        const status = getCompletionStatus(overview);
                        return (
                          <tr 
                            key={overview.participantId}
                            className={`cursor-pointer hover:bg-gray-50 ${
                              selectedParticipant === overview.participantId ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => handleParticipantChange(overview.participantId)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {overview.participantFirstName} {overview.participantLastName}
                                </div>
                                <div className="text-sm text-gray-500">{overview.participantEmail}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.participantRole}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.selfAssessments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.peerAssessments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.subordinateAssessments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.supervisorAssessments}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {overview.completionRate.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-1">
                                {status.icon}
                                <span className={`text-sm font-medium ${status.color}`}>
                                  {status.status}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'detailed' && selectedParticipant ? (
          <div className="space-y-6">
            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Eye className="h-5 w-5" />
                  <span>Detailed 360° Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaries.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Available</h3>
                    <p className="text-gray-600 mb-4">Complete the assessment to see detailed results.</p>
                    <Button onClick={handleCalculateSummary}>
                      Calculate Results
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {summaries.map(summary => (
                      <div key={summary.dimensionId} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {summary.dimension?.name}
                          </h3>
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {summary.dimension?.category}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Self Rating */}
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {summary.selfRating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-blue-800">Self Rating</div>
                            <div className="text-xs text-gray-500">
                              {summary.selfRatingCount} response{summary.selfRatingCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {/* Others Rating */}
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {summary.overallOthersRating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-green-800">Others Average</div>
                            <div className="text-xs text-gray-500">
                              {summary.overallOthersCount} response{summary.overallOthersCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          {/* Department Average */}
                          <div className="text-center p-4 bg-purple-50 rounded-lg">
                            <div className="text-2xl font-bold text-purple-600">
                              {summary.departmentAverage?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-purple-800">Department Avg</div>
                            <div className="text-xs text-gray-500">Benchmark</div>
                          </div>
                          
                          {/* Gap Analysis */}
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="flex items-center justify-center space-x-1">
                              {getGapIcon(summary.gapAnalysis)}
                              <span className={`text-2xl font-bold ${getGapColor(summary.gapAnalysis)}`}>
                                {summary.gapAnalysis?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <div className="text-sm text-yellow-800">Gap Analysis</div>
                            <div className="text-xs text-gray-500">
                              {summary.gapAnalysis && summary.gapAnalysis > 0 ? 'Self Higher' : 
                               summary.gapAnalysis && summary.gapAnalysis < 0 ? 'Others Higher' : 'Aligned'}
                            </div>
                          </div>
                        </div>
                        
                        {/* Detailed Breakdown */}
                        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="text-lg font-semibold text-gray-700">
                              {summary.peerRating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Peer Rating</div>
                            <div className="text-xs text-gray-500">
                              {summary.peerRatingCount} response{summary.peerRatingCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="text-lg font-semibold text-gray-700">
                              {summary.subordinateRating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Subordinate Rating</div>
                            <div className="text-xs text-gray-500">
                              {summary.subordinateRatingCount} response{summary.subordinateRatingCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          
                          <div className="text-center p-3 bg-gray-50 rounded">
                            <div className="text-lg font-semibold text-gray-700">
                              {summary.supervisorRating?.toFixed(1) || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-600">Supervisor Rating</div>
                            <div className="text-xs text-gray-500">
                              {summary.supervisorRatingCount} response{summary.supervisorRatingCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : viewMode === 'comparison' && selectedParticipant ? (
          <div className="space-y-6">
            {/* Comparison Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5" />
                  <span>Self vs Others Comparison</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summaries.length === 0 ? (
                  <div className="text-center py-8">
                    <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Data for Comparison</h3>
                    <p className="text-gray-600">Complete the assessment to see comparison charts.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {summaries.map(summary => (
                      <div key={summary.dimensionId} className="border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {summary.dimension?.name}
                        </h3>
                        
                        <div className="space-y-4">
                          {/* Rating Bars */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-600">Self Rating</span>
                              <span className="text-sm font-medium text-blue-600">
                                {summary.selfRating?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((summary.selfRating || 0) / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-600">Others Average</span>
                              <span className="text-sm font-medium text-green-600">
                                {summary.overallOthersRating?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((summary.overallOthersRating || 0) / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-purple-600">Department Average</span>
                              <span className="text-sm font-medium text-purple-600">
                                {summary.departmentAverage?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((summary.departmentAverage || 0) / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-orange-600">Organization Average</span>
                              <span className="text-sm font-medium text-orange-600">
                                {summary.organizationAverage?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-orange-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((summary.organizationAverage || 0) / 10) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Gap Analysis */}
                        {summary.gapAnalysis !== null && (
                          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700">Gap Analysis</span>
                              <div className="flex items-center space-x-2">
                                {getGapIcon(summary.gapAnalysis)}
                                <span className={`text-lg font-semibold ${getGapColor(summary.gapAnalysis)}`}>
                                  {summary.gapAnalysis.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">
                              {summary.gapAnalysis > 0 
                                ? 'Self-rating is higher than others\' ratings'
                                : summary.gapAnalysis < 0
                                ? 'Others\' ratings are higher than self-rating'
                                : 'Self-rating aligns with others\' ratings'
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Assessment360Reporting; 