import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Filter, 
  Search, 
  Calendar,
  Building2,
  User,
  Star,
  TrendingUp,
  Bell,
  BellRing,
  Download,
  FileText,
  Menu,
  X,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { supabase } from '../../lib/supabase';
import { exportUserResultsPDF } from '../../utils/pdfExport';

interface SubscriberAssessment {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate: string;
  completedAt: string | null;
  progress: number;
  assignedBy: string;
  organizationName: string;
  assessmentType: 'custom' | 'preset';
  sections: number;
  totalQuestions: number;
  priority: 'low' | 'medium' | 'high';
}

const SubscriberAssessments = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { userAssessments, fetchUserAssessments, isLoading: assessmentLoading } = useAssessmentStore();
  const { currentOrganization } = useOrganizationStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Mobile-specific state
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isExporting, setIsExporting] = useState(false);

  // Load real subscriber assessments from Supabase
  const [subscriberAssessments, setSubscriberAssessments] = useState<SubscriberAssessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSubscriberAssessments();
  }, [user?.id]);

  const loadSubscriberAssessments = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('assessment_assignments')
        .select(`
          *,
          assessments (
            id,
            title,
            description,
            assessment_type,
            sections
          ),
          users!assessment_assignments_assigned_by_id_fkey (
            first_name,
            last_name
          )
        `)
        .eq('employee_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const transformedAssessments: SubscriberAssessment[] = data.map((assignment: any) => ({
        id: assignment.id,
        title: assignment.assessments?.title || 'Untitled Assessment',
        description: assignment.assessments?.description || '',
        status: assignment.status,
        dueDate: assignment.due_date,
        completedAt: assignment.completed_at,
        progress: assignment.progress || 0,
        assignedBy: `${assignment.users?.first_name || ''} ${assignment.users?.last_name || ''}`.trim() || 'Unknown',
        organizationName: currentOrganization?.name || 'Unknown Organization',
        assessmentType: assignment.assessments?.assessment_type || 'custom',
        sections: assignment.assessments?.sections?.length || 0,
        totalQuestions: assignment.assessments?.sections?.reduce((total: number, section: any) => total + (section.questions?.length || 0), 0) || 0,
        priority: assignment.priority || 'normal'
      }));

      setSubscriberAssessments(transformedAssessments);
    } catch (error) {
      console.error('Failed to load subscriber assessments:', error);
      setSubscriberAssessments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add real assessments from the store
  const allAssessments: SubscriberAssessment[] = [
    ...subscriberAssessments,
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
        assignedBy: 'Organization Admin',
        organizationName: currentOrganization?.name || 'Organization',
        assessmentType: assessment.assessmentType || 'custom',
        sections: assessment.sections?.length || 0,
        totalQuestions: assessment.sections?.reduce((acc, section) => acc + (section.questions?.length || 0), 0) || 0,
        priority: 'medium' as const
      }))
  ];

  useEffect(() => {
    if (user) {
      fetchUserAssessments(user.id);
    }
  }, [user, fetchUserAssessments]);

  // Filter and sort assessments
  const filteredAssessments = allAssessments
    .filter(assessment => {
      const matchesSearch = assessment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           assessment.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || assessment.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || assessment.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-error-100 text-error-800">High Priority</span>;
      case 'medium':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning-100 text-warning-800">Medium Priority</span>;
      case 'low':
        return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-100 text-success-800">Low Priority</span>;
      default:
        return null;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getAssessmentStats = () => {
    return {
      total: allAssessments.length,
      pending: allAssessments.filter(a => a.status === 'pending').length,
      inProgress: allAssessments.filter(a => a.status === 'in_progress').length,
      completed: allAssessments.filter(a => a.status === 'completed').length,
      overdue: allAssessments.filter(a => new Date(a.dueDate) < new Date() && a.status !== 'completed').length
    };
  };

  const stats = getAssessmentStats();

  // PDF Export functionality
  const handleExportPDF = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const userData = {
        selfAssessments: completedAssessments.map(a => ({
          assessment_title: a.title,
          completed_at: a.completedAt || '',
          average_score: 0, // Will be calculated from real data
          status: a.status
        })),
        reviewsAboutMe: [],
        reviewsDoneByMe: []
      };

      const pdfOptions = {
        title: 'My Assessment Report',
        subtitle: `Personal Assessment Summary for ${user.firstName} ${user.lastName}`,
        organizationName: currentOrganization?.name || 'Organization',
        includeCharts: true,
        includeTables: true,
        orientation: 'portrait' as const,
        format: 'a4' as const
      };

      const blob = await exportUserResultsPDF(userData, pdfOptions);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${user.firstName}_${user.lastName}_Assessment_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Notification handlers
  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    setShowNotifications(false);
  };

  const urgentNotifications = notifications.filter(n => 
    n.type === 'deadline_reminder' && !n.read
  ).slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Enhanced Header with Mobile Support */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Assessments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Assessments assigned by your organization administrators
            </p>
          </div>
          
          {/* Mobile-friendly action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                {unreadCount > 0 ? (
                  <BellRing className="h-5 w-5 text-warning-600" />
                ) : (
                  <Bell className="h-5 w-5 text-gray-600" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-error-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAllAsRead()}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {urgentNotifications.length > 0 ? (
                      urgentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleNotificationClick(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-1">
                              <AlertCircle className="h-4 w-4 text-warning-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">No new notifications</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Export PDF Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || completedAssessments.length === 0}
              leftIcon={isExporting ? <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500" /> : <Download className="h-4 w-4" />}
              className="hidden sm:flex"
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>

            {/* Mobile Export Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExporting || completedAssessments.length === 0}
              className="sm:hidden"
            >
              <Download className="h-4 w-4" />
            </Button>

            {/* Mobile Filter Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="sm:hidden"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats Summary */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
          <span>{stats.total} total</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{stats.pending} pending</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">{stats.completed} completed</span>
          {stats.overdue > 0 && (
            <>
              <span className="hidden sm:inline">•</span>
              <span className="text-error-600 font-medium">{stats.overdue} overdue</span>
            </>
          )}
        </div>
      </div>

      {/* Statistics Cards - Enhanced Mobile Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
        <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-l-4 border-primary-500">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-primary-700">Total</p>
                <p className="mt-1 text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900">{stats.total}</p>
              </div>
              <div className="p-2 sm:p-3 bg-primary-500 bg-opacity-10 rounded-full">
                <ClipboardList className="h-4 w-4 sm:h-5 w-5 lg:h-6 lg:w-6 text-primary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-warning-50 to-warning-100 border-l-4 border-warning-500">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-warning-700">Pending</p>
                <p className="mt-1 text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
              <div className="p-2 sm:p-3 bg-warning-500 bg-opacity-10 rounded-full">
                <Clock className="h-4 w-4 sm:h-5 w-5 lg:h-6 lg:w-6 text-warning-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-l-4 border-secondary-500">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-secondary-700">In Progress</p>
                <p className="mt-1 text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900">{stats.inProgress}</p>
              </div>
              <div className="p-2 sm:p-3 bg-secondary-500 bg-opacity-10 rounded-full">
                <TrendingUp className="h-4 w-4 sm:h-5 w-5 lg:h-6 lg:w-6 text-secondary-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success-50 to-success-100 border-l-4 border-success-500">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-success-700">Completed</p>
                <p className="mt-1 text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900">{stats.completed}</p>
              </div>
              <div className="p-2 sm:p-3 bg-success-500 bg-opacity-10 rounded-full">
                <CheckCircle className="h-4 w-4 sm:h-5 w-5 lg:h-6 lg:w-6 text-success-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-error-50 to-error-100 border-l-4 border-error-500">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-error-700">Overdue</p>
                <p className="mt-1 text-lg sm:text-2xl lg:text-3xl font-semibold text-gray-900">{stats.overdue}</p>
              </div>
              <div className="p-2 sm:p-3 bg-error-500 bg-opacity-10 rounded-full">
                <AlertCircle className="h-4 w-4 sm:h-5 w-5 lg:h-6 lg:w-6 text-error-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Enhanced Mobile Experience */}
      <Card className={`${showMobileFilters ? 'block' : 'hidden sm:block'}`}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="w-full relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field as any);
                  setSortOrder(order as any);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="dueDate-asc">Due Date (Earliest)</option>
                <option value="dueDate-desc">Due Date (Latest)</option>
                <option value="priority-desc">Priority (High to Low)</option>
                <option value="priority-asc">Priority (Low to High)</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
            </div>

            {/* Mobile Close Button */}
            <div className="sm:hidden flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileFilters(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending and In Progress Assessments */}
      {[...inProgressAssessments, ...pendingAssessments].length > 0 && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-900">Active Assessments</h2>
            <div className="hidden sm:flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-gray-100' : ''}
              >
                Grid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-gray-100' : ''}
              >
                List
              </Button>
            </div>
          </div>
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
            {[...inProgressAssessments, ...pendingAssessments].map(assessment => (
              <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 line-clamp-2">{assessment.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(assessment.status)}
                        {getPriorityBadge(assessment.priority)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {assessment.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2" />
                        {assessment.organizationName}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Assigned by: {assessment.assignedBy}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        {getDaysUntilDue(assessment.dueDate)}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        {assessment.sections} sections • {assessment.totalQuestions} questions
                      </div>
                    </div>

                    {assessment.status === 'in_progress' && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="text-gray-900">{assessment.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${assessment.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

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
          <h2 className="text-lg font-medium text-gray-900 mb-4">Completed Assessments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAssessments.map(assessment => (
              <Card key={assessment.id} className="hover:shadow-card-hover transition-shadow border-success-200">
                <CardContent className="p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900 line-clamp-2">{assessment.title}</h3>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(assessment.status)}
                        {getPriorityBadge(assessment.priority)}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {assessment.description}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Building2 className="h-4 w-4 mr-2" />
                        {assessment.organizationName}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <User className="h-4 w-4 mr-2" />
                        Assigned by: {assessment.assignedBy}
                      </div>
                      <div className="flex items-center text-sm text-success-600">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completed: {assessment.completedAt ? new Date(assessment.completedAt).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <ClipboardList className="h-4 w-4 mr-2" />
                        {assessment.sections} sections • {assessment.totalQuestions} questions
                      </div>
                    </div>

                    <div className="mt-auto">
                      <Button
                        variant="outline"
                        fullWidth
                        rightIcon={<ArrowRight className="h-4 w-4" />}
                        onClick={() => navigate(`/my-results`)}
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
      {filteredAssessments.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ClipboardList className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                ? 'Try adjusting your search or filters to find assessments.'
                : 'You don\'t have any assessments assigned yet. Organization administrators will assign assessments to you when needed.'
              }
            </p>
            {(searchTerm || statusFilter !== 'all' || priorityFilter !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubscriberAssessments; 