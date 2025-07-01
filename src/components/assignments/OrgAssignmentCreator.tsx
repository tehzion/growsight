import React, { useState, useEffect } from 'react';
import { Building2, Users, UserCheck, Calendar, Mail, Plus, X, Search, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useUserStore } from '../../stores/userStore';
import { useAssessmentStore } from '../../stores/assessmentStore';
import { useAssignmentStore } from '../../stores/assignmentStore';
import { useOrganizationStore } from '../../stores/organizationStore';

interface OrgAssignmentCreatorProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const OrgAssignmentCreator: React.FC<OrgAssignmentCreatorProps> = ({ onClose, onSuccess }) => {
  const { currentOrganization } = useOrganizationStore();
  const { users, fetchUsers } = useUserStore();
  const { assessments, fetchAssessments } = useAssessmentStore();
  const { createAssignment } = useAssignmentStore();
  
  const [selectedAssessment, setSelectedAssessment] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'assessment' | 'employees' | 'reviewers' | 'confirm'>('assessment');

  useEffect(() => {
    if (currentOrganization?.id) {
      fetchUsers(currentOrganization.id);
      fetchAssessments(currentOrganization.id);
    }
  }, [currentOrganization, fetchUsers, fetchAssessments]);

  // Filter users by organization and role
  const organizationUsers = users.filter(user => 
    user.organizationId === currentOrganization?.id &&
    ['employee', 'reviewer', 'subscriber'].includes(user.role)
  );

  const orgAdmins = users.filter(user => 
    user.organizationId === currentOrganization?.id &&
    user.role === 'org_admin'
  );

  // Filter users by search term and department
  const filteredUsers = organizationUsers.filter(user => {
    const matchesSearch = user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !departmentFilter || user.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // Get unique departments
  const departments = [...new Set(organizationUsers.map(user => user.department).filter(Boolean))];

  const handleCreateAssignment = async () => {
    if (!selectedAssessment || selectedEmployees.length === 0 || !deadline) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Create assignments for each selected employee
      for (const employeeId of selectedEmployees) {
        await createAssignment({
          assessmentId: selectedAssessment,
          employeeId: employeeId,
          reviewerIds: selectedReviewers,
          deadline: new Date(deadline).toISOString(),
          organizationId: currentOrganization?.id || '',
          createdBy: 'org_admin'
        });
      }
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to create assignment:', error);
      alert('Failed to create assignment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAssessmentTitle = (assessmentId: string) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    return assessment?.title || 'Unknown Assessment';
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getUserDetails = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? {
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      department: user.department || 'N/A',
      role: user.role
    } : null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Organization Assignment</h2>
              <p className="text-sm text-gray-600 mt-1">
                Assign assessments to employees in {currentOrganization?.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-6">
            {['assessment', 'employees', 'reviewers', 'confirm'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step === stepName 
                    ? 'bg-primary-600 text-white' 
                    : index < ['assessment', 'employees', 'reviewers', 'confirm'].indexOf(step)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                {index < 3 && (
                  <div className={`w-16 h-0.5 mx-2 ${
                    index < ['assessment', 'employees', 'reviewers', 'confirm'].indexOf(step)
                      ? 'bg-green-600'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Select Assessment */}
          {step === 'assessment' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Select Assessment</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assessments.map(assessment => (
                  <div
                    key={assessment.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAssessment === assessment.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedAssessment(assessment.id)}
                  >
                    <h4 className="font-medium text-gray-900">{assessment.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{assessment.description}</p>
                    <div className="mt-2 flex items-center text-xs text-gray-500">
                      <Calendar className="h-3 w-3 mr-1" />
                      {assessment.estimatedDuration} minutes
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => setStep('employees')}
                  disabled={!selectedAssessment}
                >
                  Next: Select Employees
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Select Employees */}
          {step === 'employees' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Select Employees</h3>
              
              {/* Search and Filter */}
              <div className="flex space-x-4">
                <div className="flex-1">
                  <FormInput
                    type="text"
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-4 w-4" />}
                  />
                </div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Employee List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className={`p-3 border-b border-gray-100 cursor-pointer transition-colors ${
                      selectedEmployees.includes(user.id)
                        ? 'bg-primary-50 border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedEmployees(prev => 
                        prev.includes(user.id)
                          ? prev.filter(id => id !== user.id)
                          : [...prev, user.id]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-gray-500">
                          {user.department || 'No Department'} • {user.role}
                        </div>
                      </div>
                      {selectedEmployees.includes(user.id) && (
                        <div className="text-primary-600">
                          <UserCheck className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('assessment')}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep('reviewers')}
                  disabled={selectedEmployees.length === 0}
                >
                  Next: Select Reviewers
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Reviewers */}
          {step === 'reviewers' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Select Reviewers</h3>
              <p className="text-sm text-gray-600">
                Choose who will review the assessments for the selected employees
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orgAdmins.map(admin => (
                  <div
                    key={admin.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedReviewers.includes(admin.id)
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedReviewers(prev => 
                        prev.includes(admin.id)
                          ? prev.filter(id => id !== admin.id)
                          : [...prev, admin.id]
                      );
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {admin.firstName} {admin.lastName}
                        </div>
                        <div className="text-sm text-gray-600">{admin.email}</div>
                        <div className="text-xs text-gray-500">Organization Admin</div>
                      </div>
                      {selectedReviewers.includes(admin.id) && (
                        <div className="text-primary-600">
                          <UserCheck className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('employees')}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep('confirm')}
                  disabled={selectedReviewers.length === 0}
                >
                  Next: Confirm Assignment
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Confirm Assignment */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Assignment</h3>
              
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Assessment</h4>
                    <p className="text-gray-600">{getAssessmentTitle(selectedAssessment)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Employees ({selectedEmployees.length})</h4>
                    <div className="space-y-2">
                      {selectedEmployees.map(employeeId => {
                        const details = getUserDetails(employeeId);
                        return details ? (
                          <div key={employeeId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{details.name}</div>
                              <div className="text-sm text-gray-600">{details.email}</div>
                            </div>
                            <div className="text-xs text-gray-500">{details.department}</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Selected Reviewers ({selectedReviewers.length})</h4>
                    <div className="space-y-2">
                      {selectedReviewers.map(reviewerId => {
                        const details = getUserDetails(reviewerId);
                        return details ? (
                          <div key={reviewerId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="font-medium">{details.name}</div>
                              <div className="text-sm text-gray-600">{details.email}</div>
                            </div>
                            <div className="text-xs text-gray-500">Org Admin</div>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assignment Deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('reviewers')}>
                  Back
                </Button>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={isLoading || !deadline}
                  loading={isLoading}
                >
                  Create Assignment
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrgAssignmentCreator; 