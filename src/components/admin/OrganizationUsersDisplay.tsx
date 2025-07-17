import React, { useEffect, useState } from 'react';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { User, AssessmentResult } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { Download, Eye, Loader2, AlertTriangle, Users, X } from 'lucide-react';

interface OrganizationUsersDisplayProps {
  organizationId: string;
}

const OrganizationUsersDisplay: React.FC<OrganizationUsersDisplayProps> = ({ organizationId }) => {
  const { users, fetchUsers, isLoading: usersLoading, error: usersError } = useUserStore();
  const { results: allOrgResults, fetchAssessmentResults, isLoading: resultsLoading, error: resultsError } = useAssessmentResultsStore();
  const [orgUsers, setOrgUsers] = useState<User[]>([]);
  const [userResultsMap, setUserResultsMap] = useState<Map<string, AssessmentResult[]>>(new Map());
  const [previewUser, setPreviewUser] = useState<{user: User, results: AssessmentResult[]} | null>(null);

  useEffect(() => {
    if (organizationId) {
      // Fetch all users, then filter by organizationId
      fetchUsers(); 
      // Fetch all assessment results for the organization
      fetchAssessmentResults(organizationId);
    }
  }, [organizationId, fetchUsers, fetchAssessmentResults]);

  useEffect(() => {
    if (users && organizationId) {
      setOrgUsers(users.filter(user => user.organizationId === organizationId));
    }
  }, [users, organizationId]);

  useEffect(() => {
    if (allOrgResults && orgUsers.length > 0) {
      const map = new Map<string, AssessmentResult[]>();
      orgUsers.forEach(user => {
        const userSpecificResults = allOrgResults.filter(result => 
          result.employeeId === user.id || result.reviewerId === user.id
        );
        map.set(user.id, userSpecificResults);
      });
      setUserResultsMap(map);
    }
  }, [allOrgResults, orgUsers]);

  const handleDownloadResults = async (userId: string, userName: string) => {
    try {
      const userResults = userResultsMap.get(userId) || [];
      if (userResults.length === 0) {
        alert(`No results found for ${userName}`);
        return;
      }

      // Create CSV content
      const csvContent = [
        ['Assessment Title', 'Status', 'Score', 'Completed Date', 'Employee', 'Reviewer'].join(','),
        ...userResults.map(result => [
          result.assessmentTitle || 'Unknown Assessment',
          result.status || 'Unknown',
          result.score || 'N/A',
          result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'N/A',
          result.employeeName || 'Unknown',
          result.reviewerName || 'Self Assessment'
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${userName.replace(/\s+/g, '_')}_assessment_results.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading results:', error);
      alert('Failed to download results. Please try again.');
    }
  };

  const handlePreviewResults = (userId: string, userName: string) => {
    const user = orgUsers.find(u => u.id === userId);
    const results = userResultsMap.get(userId) || [];
    
    if (user) {
      setPreviewUser({ user, results });
    }
  };

  if (usersLoading || resultsLoading) {
    return (
      <div className="flex justify-center items-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="ml-3 text-gray-600">Loading users and results...</p>
      </div>
    );
  }

  if (usersError || resultsError) {
    return (
      <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded relative">
        <AlertTriangle className="h-4 w-4 inline mr-2" />
        Error loading data: {usersError || resultsError}
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Users in Selected Organization ({orgUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orgUsers.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              No users found for this organization.
            </div>
          ) : (
            <div className="space-y-4">
              {orgUsers.map(user => (
                <div key={user.id} className="border p-3 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <p className="font-medium">{user.firstName} {user.lastName} ({user.email})</p>
                    <p className="text-sm text-gray-500">Role: {user.role}</p>
                    <p className="text-sm text-gray-500">Total Results: {userResultsMap.get(user.id)?.length || 0}</p>
                  </div>
                  <div className="flex space-x-2 mt-3 sm:mt-0">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={() => handleDownloadResults(user.id, `${user.firstName} ${user.lastName}`)}
                      disabled={(userResultsMap.get(user.id)?.length || 0) === 0}
                    >
                      Download Results
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      leftIcon={<Eye className="h-4 w-4" />}
                      onClick={() => handlePreviewResults(user.id, `${user.firstName} ${user.lastName}`)}
                      disabled={(userResultsMap.get(user.id)?.length || 0) === 0}
                    >
                      Preview Results
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {previewUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Assessment Results - {previewUser.user.firstName} {previewUser.user.lastName}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewUser(null)}
                leftIcon={<X className="h-4 w-4" />}
              >
                Close
              </Button>
            </div>
            
            <div className="space-y-6">
              {/* User Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="ml-2 text-gray-900">{previewUser.user.email}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Role:</span>
                    <span className="ml-2 text-gray-900 capitalize">{previewUser.user.role}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Department:</span>
                    <span className="ml-2 text-gray-900">{previewUser.user.department || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Title:</span>
                    <span className="ml-2 text-gray-900">{previewUser.user.title || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Assessment Results ({previewUser.results.length})</h4>
                
                {previewUser.results.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No assessment results found for this user.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {previewUser.results.map((result, index) => (
                      <div key={result.id || index} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">{result.assessmentTitle || 'Unknown Assessment'}</h5>
                            <p className="text-sm text-gray-600">
                              {result.employeeName && result.reviewerName ? 
                                `${result.employeeName} reviewed by ${result.reviewerName}` :
                                'Self Assessment'
                              }
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              result.status === 'completed' ? 'bg-green-100 text-green-800' :
                              result.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {result.status || 'Unknown'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">Score:</span>
                            <span className="ml-2 text-gray-900">{result.score || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Completed:</span>
                            <span className="ml-2 text-gray-900">
                              {result.completedAt ? new Date(result.completedAt).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        {result.feedback && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <h6 className="font-medium text-blue-900 mb-1">Feedback:</h6>
                            <p className="text-sm text-blue-800">{result.feedback}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrganizationUsersDisplay;
