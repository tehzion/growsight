import React, { useState, useEffect } from 'react';
import { Calendar, Users, Clock, Mail, Plus, UserCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useAssignmentStore } from '../../stores/assignmentStore';
import { useRelationshipStore } from '../../stores/relationshipStore';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAuthStore } from '../../stores/authStore';
import { RelationshipType } from '../../types';

interface AssignmentManagerProps {
  assessmentId: string;
  onClose: () => void;
}

const AssignmentManager: React.FC<AssignmentManagerProps> = ({ assessmentId, onClose }) => {
  const { user } = useAuthStore();
  const { users, fetchUsers } = useUserStore();
  const { relationships, fetchRelationships } = useRelationshipStore();
  const { assignments, createAssignment, isLoading } = useAssignmentStore();
  const { currentAssessment } = useAssessmentStore();
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedReviewer, setSelectedReviewer] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('peer');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.organizationId) {
      fetchUsers(user.organizationId);
      fetchRelationships();
    }
  }, [user, fetchUsers, fetchRelationships]);

  // Filter users by role
  const employees = users.filter(u => u.role === 'employee');
  const reviewers = users.filter(u => u.role === 'reviewer' || u.role === 'org_admin');

  // Get available reviewers based on selected employee and relationship type
  const getAvailableReviewers = () => {
    if (!selectedEmployee) return reviewers;
    
    const employeeRelationships = relationships.filter(rel => 
      (rel.userId === selectedEmployee || rel.relatedUserId === selectedEmployee) &&
      rel.relationshipType === relationshipType
    );

    if (employeeRelationships.length === 0) {
      return reviewers; // If no specific relationships, show all reviewers
    }

    return reviewers.filter(reviewer => 
      employeeRelationships.some(rel => 
        rel.userId === reviewer.id || rel.relatedUserId === reviewer.id
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedEmployee || !selectedReviewer || !deadline) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(deadline) <= new Date()) {
      setError('Deadline must be in the future');
      return;
    }

    try {
      await createAssignment({
        assessmentId,
        employeeId: selectedEmployee,
        reviewerId: selectedReviewer,
        relationshipType,
        deadline,
      });

      // Reset form
      setSelectedEmployee('');
      setSelectedReviewer('');
      setRelationshipType('peer');
      setDeadline('');
      
      alert('Assessment assigned successfully! Email notifications have been sent to both the employee and reviewer.');
    } catch (err) {
      setError((err as Error).message || 'Failed to create assignment');
    }
  };

  const getRelationshipLabel = (type: RelationshipType) => {
    switch (type) {
      case 'peer': return 'Peer Review';
      case 'supervisor': return 'Supervisor Review';
      case 'team_member': return 'Team Member Review';
      default: return type;
    }
  };

  const getRelationshipDescription = (type: RelationshipType) => {
    switch (type) {
      case 'peer': return 'Review from a colleague at the same level';
      case 'supervisor': return 'Review from a direct supervisor or manager';
      case 'team_member': return 'Review from a team member or subordinate';
      default: return '';
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="h-5 w-5 mr-2" />
          Assign Assessment: {currentAssessment?.title}
        </CardTitle>
        <p className="text-sm text-gray-600">
          Create relationship-based assessment assignments with deadlines and automatic email notifications
        </p>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-error-50 border border-error-200 text-error-700 rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Employee
            </label>
            <select
              value={selectedEmployee}
              onChange={(e) => {
                setSelectedEmployee(e.target.value);
                setSelectedReviewer(''); // Reset reviewer when employee changes
              }}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            >
              <option value="">Choose an employee...</option>
              {employees.map(employee => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} ({employee.email})
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type
            </label>
            <div className="space-y-3">
              {(['peer', 'supervisor', 'team_member'] as RelationshipType[]).map(type => (
                <label key={type} className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="relationshipType"
                    value={type}
                    checked={relationshipType === type}
                    onChange={(e) => {
                      setRelationshipType(e.target.value as RelationshipType);
                      setSelectedReviewer(''); // Reset reviewer when relationship type changes
                    }}
                    className="mt-1 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                  />
                  <div>
                    <div className="font-medium text-gray-900">{getRelationshipLabel(type)}</div>
                    <div className="text-sm text-gray-500">{getRelationshipDescription(type)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Reviewer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Reviewer
            </label>
            <select
              value={selectedReviewer}
              onChange={(e) => setSelectedReviewer(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
              disabled={!selectedEmployee}
            >
              <option value="">Choose a reviewer...</option>
              {getAvailableReviewers().map(reviewer => (
                <option key={reviewer.id} value={reviewer.id}>
                  {reviewer.firstName} {reviewer.lastName} ({reviewer.role})
                </option>
              ))}
            </select>
            {selectedEmployee && getAvailableReviewers().length === 0 && (
              <p className="mt-1 text-sm text-warning-600">
                No reviewers found with the selected relationship type. Consider setting up relationships first.
              </p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Deadline
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Both employee and reviewer will receive email reminders 3 days before the deadline
            </p>
          </div>

          {/* Assignment Summary */}
          {selectedEmployee && selectedReviewer && deadline && (
            <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
              <h3 className="font-medium text-primary-800 mb-2">Assignment Summary</h3>
              <div className="space-y-2 text-sm text-primary-700">
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  <span>
                    {users.find(u => u.id === selectedEmployee)?.firstName} {users.find(u => u.id === selectedEmployee)?.lastName} 
                    {' → '} 
                    {users.find(u => u.id === selectedReviewer)?.firstName} {users.find(u => u.id === selectedReviewer)?.lastName}
                  </span>
                </div>
                <div className="flex items-center">
                  <UserCheck className="h-4 w-4 mr-2" />
                  <span>{getRelationshipLabel(relationshipType)}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Due: {new Date(deadline).toLocaleDateString()} at {new Date(deadline).toLocaleTimeString()}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Email notifications will be sent automatically</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              disabled={!selectedEmployee || !selectedReviewer || !deadline || isLoading}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Assignment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AssignmentManager;