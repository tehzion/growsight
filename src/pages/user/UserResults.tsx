import React, { useEffect, useState } from 'react';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ResultChart } from '../../components/results/ResultChart';
import { 
  User, 
  Eye, 
  TrendingUp, 
  Target, 
  BarChart3,
  Download,
  RefreshCw,
  Send
} from 'lucide-react';

interface UserResultsProps {}

export const UserResults: React.FC<UserResultsProps> = () => {
  const { 
    fetchSelfAssessments,
    fetchReviewsAboutMe,
    fetchReviewsDoneByMe,
    exportAllResultsAsCSV
  } = useAssessmentResultsStore();
  
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [viewMode, setViewMode] = useState<'overview' | 'self' | 'reviews'>('overview');
  const [selfAssessments, setSelfAssessments] = useState<any[]>([]);
  const [reviewsAboutMe, setReviewsAboutMe] = useState<any[]>([]);
  const [reviewsDoneByMe, setReviewsDoneByMe] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id && currentOrganization?.id) {
      loadUserData();
    }
  }, [user?.id, currentOrganization?.id]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const [selfResults, aboutMeResults, doneByMeResults] = await Promise.all([
        fetchSelfAssessments(user!.id, currentOrganization!.id),
        fetchReviewsAboutMe(user!.id, currentOrganization!.id),
        fetchReviewsDoneByMe(user!.id, currentOrganization!.id)
      ]);
      
      setSelfAssessments(selfResults);
      setReviewsAboutMe(aboutMeResults);
      setReviewsDoneByMe(doneByMeResults);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportResults = async () => {
    if (user?.id && currentOrganization?.id) {
      try {
        const csvData = await exportAllResultsAsCSV(currentOrganization.id, user.id);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my_assessment_results_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error exporting results:', error);
      }
    }
  };

  const sendResultsToOrgAdmin = () => {
    // Implementation for sending results to org admin
    console.log('Sending results to organization admin...');
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

  const calculateAverageScore = (assessments: any[]): number => {
    if (assessments.length === 0) return 0;
    const total = assessments.reduce((sum, assessment) => sum + (assessment.average_score || 0), 0);
    return total / assessments.length;
  };

  const getCompletionRate = (assessments: any[]): number => {
    if (assessments.length === 0) return 0;
    const completed = assessments.filter(a => a.status === 'completed').length;
    return (completed / assessments.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Assessment Results</h1>
          <p className="text-gray-600 mt-2">
            View your self-assessments and feedback from others
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportResults}>
            <Download className="w-4 h-4 mr-2" />
            Export My Results
          </Button>
          <Button onClick={loadUserData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Card>
        <div className="p-6">
          <div className="flex space-x-4 border-b">
            <button
              onClick={() => setViewMode('overview')}
              className={`pb-2 px-4 ${viewMode === 'overview' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setViewMode('self')}
              className={`pb-2 px-4 ${viewMode === 'self' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              <User className="w-4 h-4 inline mr-2" />
              My Self-Assessments
            </button>
            <button
              onClick={() => setViewMode('reviews')}
              className={`pb-2 px-4 ${viewMode === 'reviews' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Reviews About Me
            </button>
          </div>
        </div>
      </Card>

      {/* Overview View */}
      {viewMode === 'overview' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Self-Assessments</p>
                    <p className="text-2xl font-bold text-gray-900">{selfAssessments.length}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Eye className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Reviews About Me</p>
                    <p className="text-2xl font-bold text-gray-900">{reviewsAboutMe.length}</p>
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
                    <p className={`text-2xl font-bold ${getScoreColor(calculateAverageScore([...selfAssessments, ...reviewsAboutMe]))}`}>
                      {calculateAverageScore([...selfAssessments, ...reviewsAboutMe]).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getCompletionRate([...selfAssessments, ...reviewsAboutMe]).toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Assessment Activity</h3>
              <div className="space-y-4">
                {[...selfAssessments, ...reviewsAboutMe]
                  .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())
                  .slice(0, 5)
                  .map((assessment) => (
                    <div key={assessment.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium text-gray-900">{assessment.assessment_title}</h4>
                        <p className="text-sm text-gray-600">
                          {assessment.reviewer_name ? `Review by ${assessment.reviewer_name}` : 'Self-assessment'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {new Date(assessment.completed_at || assessment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getScoreColor(assessment.average_score || 0)}`}>
                          {assessment.average_score?.toFixed(1) || 'N/A'}
                        </p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          assessment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {assessment.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </Card>

          {/* Send Results to Org Admin */}
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Share Results</h3>
              <p className="text-gray-600 mb-4">
                Send your assessment results to your organization administrator for review and feedback.
              </p>
              <Button onClick={sendResultsToOrgAdmin}>
                <Send className="w-4 h-4 mr-2" />
                Send Results to Organization Admin
              </Button>
            </div>
          </Card>
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
    </div>
  );
};

export default UserResults;