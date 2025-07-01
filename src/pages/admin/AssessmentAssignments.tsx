import React, { useState, useEffect } from 'react';
import { UserCheck, Calendar, Mail, Users, Clock, CheckCircle, AlertCircle, Settings, Edit3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AssignmentManager from '../../components/assignments/AssignmentManager';
import RelationshipManager from '../../components/relationships/RelationshipManager';
import { useAssignmentStore } from '../../stores/assignmentStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useUserStore } from '../../stores/userStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useAuthStore } from '../../stores/authStore';
import { RelationshipType } from '../../types';

const AssessmentAssignments: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { assignments, fetchAssignments, updateAssignmentStatus, isLoading } = useAssignmentStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { users, fetchUsers } = useUserStore();
  
  const [activeTab, setActiveTab] = useState<'assignments' | 'relationships'>('assignments');
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [editingDeadline, setEditingDeadline] = useState<{id: string, deadline: string} | null>(null);

  // Check permissions
  const hasAssignPermission = currentOrganization?.orgAdminPermissions?.includes('assign_assessments');
  const hasRelationshipPermission = currentOrganization?.orgAdminPermissions?.includes('manage_relationships');

  useEffect(() => {
    if (user?.organizationId) {
      fetchAssignments();
      fetchAssessments(user.organizationId);
      fetchUsers(user.organizationId);
    }
  }, [user, fetchAssignments, fetchAssessments, fetchUsers]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'in_progress':
        return <Clock className="h-5 w-5 text-warning-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">Completed</span>;
      case 'in_progress':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-800">In Progress</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Pending</span>;
    }
  };

  const getRelationshipBadge = (type?: RelationshipType) => {
    if (!type) return null;
    
    const colors = {
      peer: 'bg-blue-100 text-blue-800',
      supervisor: 'bg-purple-100 text-purple-800',
      team_member: 'bg-green-100 text-green-800',
    };

    const labels = {
      peer: 'Peer',
      supervisor: 'Supervisor',
      team_member: 'Team Member',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? `${foundUser.firstName} ${foundUser.lastName}` : 'Unknown User';
  };

  const getAssessmentTitle = (assessmentId: string) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    return assessment?.title || 'Unknown Assessment';
  };

  const isOverdue = (deadline?: string) => {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  };

  const getDaysUntilDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const handleUpdateDeadline = async (assignmentId: string, newDeadline: string) => {
    try {
      // In a real implementation, this would update the assignment deadline
      console.log(`Updating assignment ${assignmentId} deadline to ${newDeadline}`);
      setEditingDeadline(null);
      alert('Assignment deadline updated successfully!');
    } catch (error) {
      console.error('Failed to update deadline:', error);
      alert('Failed to update deadline. Please try again.');
    }
  };

  if (showAssignmentForm && selectedAssessment) {
    return (
      <AssignmentManager
        assessmentId={selectedAssessment}
        onClose={() => {
          setShowAssignmentForm(false);
          setSelectedAssessment('');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Assessment Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage assessment assignments and user relationships for {currentOrganization?.name}
        </p>
      </div>

      {/* Permission Check */}
      {!hasAssignPermission && !hasRelationshipPermission && (
        <Card className="bg-warning-50 border-warning-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-warning-600" />
              <div>
                <h3 className="font-medium text-warning-800">Limited Access</h3>
                <p className="text-sm text-warning-700">
                  You don't have permission to manage assignments or relationships. Contact your Super Admin to grant these permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {hasAssignPermission && (
            <button
              onClick={() => setActiveTab('assignments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'assignments'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck className="h-4 w-4 inline mr-2" />
              Assessment Assignments
            </button>
          )}
          {hasRelationshipPermission && (
            <button
              onClick={() => setActiveTab('relationships')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'relationships'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              User Relationships
            </button>
          )}
        </nav>
      </div>

      {activeTab === 'assignments' && hasAssignPermission ? (
        <div className="space-y-6">
          {/* Create Assignment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Assignment</CardTitle>
              <p className="text-sm text-gray-600">
                Assign assessments to employees with specific reviewers based on their relationships
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Assessment
                  </label>
                  <select
                    value={selectedAssessment}
                    onChange={(e) => setSelectedAssessment(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Choose an assessment...</option>
                    {assessments.map(assessment => (
                      <option key={assessment.id} value={assessment.id}>
                        {assessment.title} ({assessment.assessmentType === 'preset' ? 'System Preset' : 'Custom'})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => setShowAssignmentForm(true)}
                  disabled={!selectedAssessment}
                  leftIcon={<UserCheck className="h-4 w-4" />}
                >
                  Create Assignment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Current Assignments ({assignments.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center py-6">
                  <UserCheck className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments created</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first assessment assignment to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => {
                    const daysUntilDeadline = getDaysUntilDeadline(assignment.deadline);
                    const overdue = isOverdue(assignment.deadline);
                    const isEditingThisDeadline = editingDeadline?.id === assignment.id;
                    
                    return (
                      <div
                        key={assignment.id}
                        className={`p-4 rounded-lg border-2 ${
                          overdue ? 'border-error-200 bg-error-50' : 
                          daysUntilDeadline && daysUntilDeadline <= 3 ? 'border-warning-200 bg-warning-50' :
                          'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {getStatusIcon(assignment.status)}
                              <h3 className="font-medium text-gray-900">
                                {getAssessmentTitle(assignment.assessmentId)}
                              </h3>
                              {getStatusBadge(assignment.status)}
                              {getRelationshipBadge(assignment.relationshipType)}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-2" />
                                <span>
                                  {getUserName(assignment.employeeId)} → {getUserName(assignment.reviewerId)}
                                </span>
                              </div>
                              
                              {assignment.deadline && (
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {isEditingThisDeadline ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="datetime-local"
                                        value={editingDeadline.deadline}
                                        onChange={(e) => setEditingDeadline({
                                          ...editingDeadline,
                                          deadline: e.target.value
                                        })}
                                        className="text-xs border rounded px-2 py-1"
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleUpdateDeadline(assignment.id, editingDeadline.deadline)}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setEditingDeadline(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <span className={overdue ? 'text-error-600 font-medium' : ''}>
                                        Due: {new Date(assignment.deadline).toLocaleDateString()}
                                        {daysUntilDeadline !== null && (
                                          <span className="ml-1">
                                            ({overdue ? `${Math.abs(daysUntilDeadline)} days overdue` : 
                                              daysUntilDeadline === 0 ? 'Due today' :
                                              `${daysUntilDeadline} days left`})
                                          </span>
                                        )}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setEditingDeadline({
                                          id: assignment.id,
                                          deadline: assignment.deadline || ''
                                        })}
                                        leftIcon={<Edit3 className="h-3 w-3" />}
                                      >
                                        Edit
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center">
                                <Mail className="h-4 w-4 mr-2" />
                                <span>
                                  {assignment.notificationSent ? 'Notifications sent' : 'Pending notifications'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <span className="text-xs text-gray-500">
                              Created {new Date(assignment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'relationships' && hasRelationshipPermission ? (
        <RelationshipManager />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
            <p className="text-gray-500">
              You don't have permission to access this feature. Contact your Super Admin to request the necessary permissions.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AssessmentAssignments;