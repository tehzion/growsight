import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, CheckCircle2, Clock, ArrowRight, Star, Filter, Calendar, BarChart3, TrendingUp, Users, Bell, Eye } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useReminderStore } from '../../stores/reminderStore';
import ReminderSetup from '../../components/assessments/ReminderSetup';

interface AssessmentFilter {
  status: 'all' | 'pending' | 'in_progress' | 'completed';
  dueDate: 'all' | 'overdue' | 'due_soon' | 'due_later';
  search: string;
}

const UserAssessments = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { userAssessments, fetchUserAssessments, isLoading } = useAssessmentStore();
  const { fetchUserResults } = useAssessmentResultsStore();
  const { fetchUserReminders, reminders } = useReminderStore();
  
  const [filters, setFilters] = useState<AssessmentFilter>({
    status: 'all',
    dueDate: 'all',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showReminderSetup, setShowReminderSetup] = useState(false);
  const [reminderAssessment, setReminderAssessment] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchUserAssessments(user.id);
      fetchUserResults(user.id);
      fetchUserReminders(user.id);
    }
  }, [user, fetchUserAssessments, fetchUserResults, fetchUserReminders]);

  // Mock assessment data for the user with different statuses
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
      category: 'Leadership',
      estimatedTime: '30 minutes',
      attempts: 0,
      lastAttempt: null,
      feedback: null,
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
      category: 'Communication',
      estimatedTime: '25 minutes',
      attempts: 1,
      lastAttempt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      feedback: 'Good start! Focus on active listening in the next section.',
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
      category: 'Teamwork',
      estimatedTime: '20 minutes',
      attempts: 1,
      lastAttempt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      feedback: 'Excellent teamwork skills demonstrated. Strong collaboration abilities.',
      score: 85,
      maxScore: 100,
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
        category: 'General',
        estimatedTime: '30 minutes',
        attempts: 0,
        lastAttempt: null,
        feedback: null,
      }))
  ];

  // Filter assessments based on current filters
  const filteredAssessments = mockUserAssessments.filter(assessment => {
    // Status filter
    if (filters.status !== 'all' && assessment.status !== filters.status) {
      return false;
    }

    // Due date filter
    if (filters.dueDate !== 'all') {
      const now = new Date();
      const dueDate = new Date(assessment.dueDate);
      const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      switch (filters.dueDate) {
        case 'overdue':
          if (daysUntilDue >= 0) return false;
          break;
        case 'due_soon':
          if (daysUntilDue < 0 || daysUntilDue > 7) return false;
          break;
        case 'due_later':
          if (daysUntilDue <= 7) return false;
          break;
      }
    }

    // Search filter
    if (filters.search && !assessment.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !assessment.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    return true;
  });

  const pendingAssessments = filteredAssessments.filter(a => a.status === 'pending');
  const inProgressAssessments = filteredAssessments.filter(a => a.status === 'in_progress');
  const completedAssessments = filteredAssessments.filter(a => a.status === 'completed');
  
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

  const getDueDateStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const daysUntilDue = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilDue < 0) {
      return { status: 'overdue', text: 'Overdue', color: 'text-red-600' };
    } else if (daysUntilDue <= 3) {
      return { status: 'urgent', text: 'Due Soon', color: 'text-orange-600' };
    } else if (daysUntilDue <= 7) {
      return { status: 'warning', text: 'Due This Week', color: 'text-yellow-600' };
    } else {
      return { status: 'normal', text: 'Due Later', color: 'text-gray-600' };
    }
  };

  const handleDetailedView = (assessment: any) => {
    setSelectedAssessment(assessment);
    setShowDetailedView(true);
  };

  const handleReminderSetup = (assessment: any) => {
    setReminderAssessment(assessment);
    setShowReminderSetup(true);
  };

  const getRemindersForAssessment = (assessmentId: string) => {
    return reminders.filter(reminder => reminder.assessmentId === assessmentId);
  };

  const getAnalyticsData = () => {
    const completed = completedAssessments.length;
    const total = mockUserAssessments.length;
    const averageScore = completedAssessments.reduce((sum, a) => sum + (a.score || 0), 0) / completed || 0;
    const overdueCount = mockUserAssessments.filter(a => getDueDateStatus(a.dueDate).status === 'overdue').length;
    const activeReminders = reminders.filter(r => r.status === 'pending').length;

    return { completed, total, averageScore, overdueCount, activeReminders };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const analytics = getAnalyticsData();
  
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Assessments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete your assigned assessments and track your progress
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              leftIcon={<BarChart3 className="h-4 w-4" />}
            >
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              leftIcon={<Filter className="h-4 w-4" />}
            >
              Filter
            </Button>
          </div>
        </div>
      </div>

      {/* Analytics Overview */}
      {showAnalytics && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Your Assessment Analytics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.completed}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(analytics.averageScore)}%</div>
                <div className="text-sm text-gray-600">Avg Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.overdueCount}</div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analytics.activeReminders}</div>
                <div className="text-sm text-gray-600">Reminders</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round((analytics.completed / analytics.total) * 100)}%
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(analytics.completed / analytics.total) * 100}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Filters */}
      {showFilters && (
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <select
                  value={filters.dueDate}
                  onChange={(e) => setFilters({ ...filters, dueDate: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Dates</option>
                  <option value="overdue">Overdue</option>
                  <option value="due_soon">Due Soon (≤3 days)</option>
                  <option value="due_later">Due Later (&gt;7 days)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search assessments..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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
            {[...inProgressAssessments, ...pendingAssessments].map(assessment => {
              const dueStatus = getDueDateStatus(assessment.dueDate);
              const assessmentReminders = getRemindersForAssessment(assessment.id);
              return (
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

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-gray-500">
                          <span className="bg-gray-100 px-2 py-1 rounded">{assessment.category}</span>
                          <span className="ml-2">• {assessment.estimatedTime}</span>
                        </div>
                        
                        <div className="flex items-center text-sm text-gray-500">
                          <Clock className="h-4 w-4 mr-1" />
                          <span className={dueStatus.color}>
                            {dueStatus.text}: {new Date(assessment.dueDate).toLocaleDateString()}
                          </span>
                        </div>

                        {assessment.attempts > 0 && (
                          <div className="text-xs text-gray-500">
                            Attempts: {assessment.attempts} • Last: {assessment.lastAttempt ? new Date(assessment.lastAttempt).toLocaleDateString() : 'Never'}
                          </div>
                        )}

                        {assessmentReminders.length > 0 && (
                          <div className="text-xs text-blue-600 flex items-center">
                            <Bell className="h-3 w-3 mr-1" />
                            {assessmentReminders.length} reminder{assessmentReminders.length > 1 ? 's' : ''} set
                          </div>
                        )}
                      </div>
                      
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
                      
                      <div className="mt-auto flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDetailedView(assessment)}
                          leftIcon={<Eye className="h-4 w-4" />}
                        >
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReminderSetup(assessment)}
                          leftIcon={<Bell className="h-4 w-4" />}
                        >
                          Reminders
                        </Button>
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
              );
            })}
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

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-1 rounded">{assessment.category}</span>
                        <span className="ml-2">• {assessment.estimatedTime}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <CheckCircle2 className="h-4 w-4 mr-1 text-success-500" />
                        Completed on: {assessment.completedAt ? new Date(assessment.completedAt).toLocaleDateString() : 'Unknown'}
                      </div>

                      {assessment.score && (
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">Score: {assessment.score}/{assessment.maxScore}</span>
                          <span className="text-gray-500 ml-2">({Math.round((assessment.score / assessment.maxScore) * 100)}%)</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-4 flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDetailedView(assessment)}
                        leftIcon={<Eye className="h-4 w-4" />}
                      >
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/my-results/${assessment.id}`)}
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

      {/* Detailed View Modal */}
      {showDetailedView && selectedAssessment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedAssessment.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetailedView(false)}
              >
                ×
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600">{selectedAssessment.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Category</h3>
                  <p className="text-gray-600">{selectedAssessment.category}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Estimated Time</h3>
                  <p className="text-gray-600">{selectedAssessment.estimatedTime}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Status</h3>
                  <div>{getStatusBadge(selectedAssessment.status)}</div>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Due Date</h3>
                  <p className="text-gray-600">{new Date(selectedAssessment.dueDate).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedAssessment.attempts > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Previous Attempts</h3>
                  <p className="text-gray-600">
                    Attempts: {selectedAssessment.attempts} • 
                    Last attempt: {selectedAssessment.lastAttempt ? new Date(selectedAssessment.lastAttempt).toLocaleDateString() : 'Never'}
                  </p>
                </div>
              )}

              {selectedAssessment.feedback && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Feedback</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedAssessment.feedback}</p>
                </div>
              )}

              {selectedAssessment.score && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Score</h3>
                  <p className="text-gray-600">
                    {selectedAssessment.score}/{selectedAssessment.maxScore} ({Math.round((selectedAssessment.score / selectedAssessment.maxScore) * 100)}%)
                  </p>
                </div>
              )}

              <div className="flex space-x-2 pt-4">
                {selectedAssessment.status !== 'completed' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowDetailedView(false);
                      handleReminderSetup(selectedAssessment);
                    }}
                    leftIcon={<Bell className="h-4 w-4" />}
                  >
                    Set Reminder
                  </Button>
                )}
                <Button
                  onClick={() => {
                    setShowDetailedView(false);
                    navigate(`/my-assessments/${selectedAssessment.id}`);
                  }}
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {selectedAssessment.status === 'pending' ? 'Start Assessment' : 'Continue Assessment'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Setup Modal */}
      {showReminderSetup && reminderAssessment && (
        <ReminderSetup
          assessmentId={reminderAssessment.id}
          assessmentTitle={reminderAssessment.title}
          dueDate={reminderAssessment.dueDate}
          onClose={() => {
            setShowReminderSetup(false);
            setReminderAssessment(null);
          }}
          onReminderSet={() => {
            // Refresh reminders after setting new ones
            if (user) {
              fetchUserReminders(user.id);
            }
          }}
        />
      )}
    </div>
  );
};

export default UserAssessments;