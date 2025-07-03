import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, BarChart3, Eye, ArrowRight } from 'lucide-react';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssessment360Store, Assessment360Overview } from '../../stores/assessment360Store';
import { useAuthStore } from '../../stores/authStore';
import Button from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import FormInput from '../ui/FormInput';

const Assessment360Selector = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { overviews, fetchOverviews } = useAssessment360Store();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [filteredOverviews, setFilteredOverviews] = useState<Assessment360Overview[]>([]);

  useEffect(() => {
    fetchAssessments();
  }, []);

  useEffect(() => {
    if (selectedAssessment) {
      fetchOverviews(selectedAssessment);
    }
  }, [selectedAssessment]);

  useEffect(() => {
    if (overviews.length > 0) {
      const filtered = overviews.filter(overview => 
        overview.participantFirstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        overview.participantLastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        overview.participantEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        overview.participantRole.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOverviews(filtered);
    }
  }, [overviews, searchTerm]);

  const handleView360Assessment = (assessmentId: string, participantId?: string) => {
    const path = participantId 
      ? `/assessment-360/${assessmentId}/${participantId}`
      : `/assessment-360/${assessmentId}`;
    navigate(path);
  };

  const getCompletionStatus = (overview: Assessment360Overview) => {
    if (overview.completionRate >= 90) return { status: 'Complete', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (overview.completionRate >= 70) return { status: 'In Progress', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { status: 'Pending', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';

  if (!isSuperAdmin && !isOrgAdmin) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to view 360° assessments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">360° Assessment Reporting</h1>
        <p className="text-gray-600">
          View comprehensive 360° leadership assessment results with self-ratings, peer feedback, and organizational benchmarks.
        </p>
      </div>

      {/* Assessment Selection */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Select Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose 360° Assessment
              </label>
              <select
                value={selectedAssessment}
                onChange={(e) => setSelectedAssessment(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select an assessment...</option>
                {assessments
                  .filter(assessment => assessment.assessmentType === '360_leadership')
                  .map(assessment => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.title} - {assessment.organizationName}
                    </option>
                  ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button
                onClick={() => selectedAssessment && handleView360Assessment(selectedAssessment)}
                disabled={!selectedAssessment}
                className="w-full"
              >
                View Assessment Overview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participant Search and Results */}
      {selectedAssessment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Assessment Participants</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <FormInput
                  type="text"
                  placeholder="Search participants by name, email, or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Results */}
            {filteredOverviews.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No participants found' : 'No participants available'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm 
                    ? 'Try adjusting your search terms.'
                    : 'Participants will appear here once they are assigned to this assessment.'
                  }
                </p>
              </div>
            ) : (
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
                        Assignments
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion
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
                    {filteredOverviews.map(overview => {
                      const status = getCompletionStatus(overview);
                      return (
                        <tr key={overview.participantId} className="hover:bg-gray-50">
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {overview.completedAssignments} / {overview.totalAssignments}
                            </div>
                            <div className="text-xs text-gray-500">
                              Self: {overview.selfAssessments} | 
                              Peer: {overview.peerAssessments} | 
                              Sub: {overview.subordinateAssessments} | 
                              Sup: {overview.supervisorAssessments}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${overview.completionRate}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-900">
                                {overview.completionRate.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                              {status.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView360Assessment(selectedAssessment, overview.participantId)}
                              leftIcon={<Eye className="h-4 w-4" />}
                            >
                              View Results
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {selectedAssessment && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Assessment Overview</h3>
                  <p className="text-sm text-gray-600">View overall assessment statistics</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleView360Assessment(selectedAssessment)}
              >
                View Overview
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Export Results</h3>
                  <p className="text-sm text-gray-600">Download comprehensive reports</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* Export CSV */}}
                >
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {/* Export PDF */}}
                >
                  PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Manage Assignments</h3>
                  <p className="text-sm text-gray-600">Assign reviewers and participants</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate('/assessment-assignments')}
              >
                Manage
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Assessment360Selector; 