import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, ArrowRight, Star } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAuthStore } from '../../stores/authStore';

const UserAssessments = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { userAssessments, fetchUserAssessments, isLoading } = useAssessmentStore();
  
  useEffect(() => {
    if (user) {
      fetchUserAssessments(user.id);
    }
  }, [user, fetchUserAssessments]);

  // Mock assessment data for the user with different statuses
  // This would be filtered based on assessments published to their organization
  const mockUserAssessments = [
    {
      id: 'demo-assessment-1',
      title: 'Leadership Skills Assessment',
      description: 'Comprehensive evaluation of leadership capabilities',
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      progress: 0,
      isPublished: true,
    },
    {
      id: 'demo-assessment-2',
      title: 'Communication Skills',
      description: 'Evaluate your communication effectiveness',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: null,
      progress: 40,
      isPublished: true,
    },
    {
      id: 'demo-assessment-3',
      title: 'Team Collaboration',
      description: 'Assessment of teamwork and collaboration skills',
      status: 'completed',
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      progress: 100,
      isPublished: true,
    },
    // Add any newly published assessments from the store that are assigned to user's organization
    ...userAssessments
      .filter(assessment => 
        assessment.assignedOrganizations?.some(org => org.id === user?.organizationId)
      )
      .map(assessment => ({
        id: assessment.id,
        title: assessment.title,
        description: assessment.description || 'No description provided',
        status: 'pending' as const,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: null,
        progress: 0,
        isPublished: true,
      }))
  ];
  
  const pendingAssessments = mockUserAssessments.filter(a => a.status === 'pending');
  const inProgressAssessments = mockUserAssessments.filter(a => a.status === 'in_progress');
  const completedAssessments = mockUserAssessments.filter(a => a.status === 'completed');
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Not Started</span>;
      case 'in_progress':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning-100 text-warning-800">In Progress</span>;
      case 'completed':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-100 text-success-800">Completed</span>;
      default:
        return null;
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Assessments</h1>
        <p className="text-sm text-gray-500 mt-1">
          Complete your assigned assessments and track your progress
        </p>
      </div>
      
      {/* New Assessments Alert */}
      {userAssessments.filter(a => a.assignedOrganizations?.some(org => org.id === user?.organizationId)).length > 0 && (
        <Card className="bg-primary-50 border-primary-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Star className="h-5 w-5 text-primary-600" />
              <div>
                <h3 className="text-sm font-medium text-primary-800">
                  New Assessment{userAssessments.length > 1 ? 's' : ''} Available!
                </h3>
                <p className="text-sm text-primary-600">
                  {userAssessments.filter(a => a.assignedOrganizations?.some(org => org.id === user?.organizationId)).length} new assessment{userAssessments.length > 1 ? 's have' : ' has'} been published and assigned to you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Priority Assessments */}
      {(pendingAssessments.length > 0 || inProgressAssessments.length > 0) && (
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4">To Complete</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...inProgressAssessments, ...pendingAssessments].map(assessment => (
              <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                      {getStatusBadge(assessment.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                    
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{assessment.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${assessment.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <Clock className="h-4 w-4 mr-1" />
                      Due: {new Date(assessment.dueDate).toLocaleDateString()}
                    </div>
                    
                    <div className="mt-auto">
                      <Button
                        fullWidth
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                        onClick={() => navigate(`/my-assessments/${assessment.id}`)}
                      >
                        {assessment.status === 'pending' ? 'Start Assessment' : 'Continue Assessment'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      
      {/* Completed Assessments */}
      {completedAssessments.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAssessments.map(assessment => (
              <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow bg-gray-50">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{assessment.title}</h3>
                      {getStatusBadge(assessment.status)}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {assessment.description}
                    </p>
                    
                    <div className="flex items-center text-sm text-gray-500 mb-2">
                      <CheckCircle2 className="h-4 w-4 mr-1 text-success-500" />
                      Completed on: {assessment.completedAt ? new Date(assessment.completedAt).toLocaleDateString() : 'Unknown'}
                    </div>
                    
                    <div className="mt-auto pt-4 flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/my-assessments/${assessment.id}`)}
                      >
                        View Assessment
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => navigate('/my-results')}
                      >
                        View Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      
      {/* Empty State */}
      {mockUserAssessments.length === 0 && (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No assessments assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any assessments assigned to you yet. Contact your organization administrator for more information.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserAssessments;