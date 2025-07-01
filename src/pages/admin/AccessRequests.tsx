import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Calendar, 
  Building2, 
  AlertTriangle,
  Search,
  Filter,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';

interface AccessRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  requestedRole: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  approvedById?: string;
  approvedAt?: string;
}

const AccessRequests: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<AccessRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mock data for demo
  const mockRequests: AccessRequest[] = [
    {
      id: '1',
      email: 'john.smith@example.com',
      firstName: 'John',
      lastName: 'Smith',
      organizationName: 'Acme Corporation',
      requestedRole: 'org_admin',
      message: 'We need access to manage our team assessments. We have 50 employees who will be using the system.',
      status: 'pending',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      email: 'lisa.wong@techcorp.com',
      firstName: 'Lisa',
      lastName: 'Wong',
      organizationName: 'Tech Corporation',
      requestedRole: 'org_admin',
      message: 'Looking to implement 360 feedback for our quarterly reviews.',
      status: 'approved',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      approvedById: '1',
      approvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      email: 'mark.johnson@invalidmail.com',
      firstName: 'Mark',
      lastName: 'Johnson',
      organizationName: 'Unknown Company',
      requestedRole: 'org_admin',
      status: 'rejected',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '4',
      email: 'sarah.miller@newstart.org',
      firstName: 'Sarah',
      lastName: 'Miller',
      organizationName: 'NewStart Foundation',
      requestedRole: 'org_admin',
      message: 'We are a non-profit organization looking to implement feedback for our volunteers and staff.',
      status: 'pending',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  useEffect(() => {
    // Simulate API call
    setIsLoading(true);
    setTimeout(() => {
      setRequests(mockRequests);
      setFilteredRequests(mockRequests);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    // Apply filters
    let filtered = requests;
    
    if (searchTerm) {
      filtered = filtered.filter(req => 
        req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.organizationName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }
    
    setFilteredRequests(filtered);
  }, [requests, searchTerm, statusFilter]);

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update request status
      const updatedRequests = requests.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: 'approved' as const, 
              approvedById: '1', // Current user ID
              approvedAt: new Date().toISOString() 
            } 
          : req
      );
      
      setRequests(updatedRequests);
      setSuccessMessage(`Access request for ${selectedRequest.firstName} ${selectedRequest.lastName} has been approved. An email with account details has been sent.`);
      setShowApproveModal(false);
      setSelectedRequest(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setErrorMessage('Failed to approve request. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update request status
      const updatedRequests = requests.map(req => 
        req.id === selectedRequest.id 
          ? { 
              ...req, 
              status: 'rejected' as const
            } 
          : req
      );
      
      setRequests(updatedRequests);
      setSuccessMessage(`Access request for ${selectedRequest.firstName} ${selectedRequest.lastName} has been rejected.`);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      setErrorMessage('Failed to reject request. Please try again.');
      
      // Clear error message after 5 seconds
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Access Requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage organization access requests from new users
        </p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          {errorMessage}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative flex-1">
              <FormInput
                placeholder="Search by name, email, or organization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Access Requests ({filteredRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading access requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No access requests found</h3>
              <p className="text-gray-500 mt-1">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'New access requests will appear here'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organization
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requested
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                              {request.firstName.charAt(0)}{request.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {request.firstName} {request.lastName}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {request.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request.organizationName}</div>
                        <div className="text-xs text-gray-500 flex items-center">
                          <Shield className="h-3 w-3 mr-1" />
                          {request.requestedRole === 'org_admin' ? 'Organization Admin' : request.requestedRole}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="h-4 w-4" />}
                            onClick={() => setSelectedRequest(request)}
                          >
                            View
                          </Button>
                          
                          {request.status === 'pending' && (
                            <>
                              <Button
                                variant="success"
                                size="sm"
                                leftIcon={<CheckCircle className="h-4 w-4" />}
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowApproveModal(true);
                                }}
                              >
                                Approve
                              </Button>
                              
                              <Button
                                variant="danger"
                                size="sm"
                                leftIcon={<XCircle className="h-4 w-4" />}
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowRejectModal(true);
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Modal */}
      {selectedRequest && !showApproveModal && !showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900">Access Request Details</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium text-lg">
                        {selectedRequest.firstName.charAt(0)}{selectedRequest.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedRequest.firstName} {selectedRequest.lastName}
                      </h3>
                      <p className="text-gray-500">{selectedRequest.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Organization</h4>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.organizationName}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Requested Role</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedRequest.requestedRole === 'org_admin' ? 'Organization Admin' : selectedRequest.requestedRole}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Request Date</h4>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedRequest.status === 'approved' && selectedRequest.approvedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Approved Date</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedRequest.approvedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedRequest.message && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-500">Additional Message</h4>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                      {selectedRequest.message}
                    </p>
                  </div>
                )}
                
                <div className="pt-6 border-t border-gray-200 flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Close
                  </Button>
                  
                  {selectedRequest.status === 'pending' && (
                    <>
                      <Button
                        variant="danger"
                        leftIcon={<XCircle className="h-4 w-4" />}
                        onClick={() => {
                          setShowRejectModal(true);
                        }}
                      >
                        Reject
                      </Button>
                      
                      <Button
                        variant="success"
                        leftIcon={<CheckCircle className="h-4 w-4" />}
                        onClick={() => {
                          setShowApproveModal(true);
                        }}
                      >
                        Approve
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900">Approve Access Request</h2>
                <button
                  onClick={() => setShowApproveModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-600">
                  You are about to approve the access request for:
                </p>
                
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {selectedRequest.firstName.charAt(0)}{selectedRequest.lastName.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {selectedRequest.firstName} {selectedRequest.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedRequest.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm">
                    <div><strong>Organization:</strong> {selectedRequest.organizationName}</div>
                    <div><strong>Role:</strong> {selectedRequest.requestedRole === 'org_admin' ? 'Organization Admin' : selectedRequest.requestedRole}</div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-md">
                  <p className="text-sm text-primary-700 flex items-start">
                    <Info className="h-4 w-4 mr-2 mt-0.5" />
                    Approving this request will:
                  </p>
                  <ul className="mt-1 text-xs text-primary-600 list-disc list-inside ml-6">
                    <li>Create a new user account with the requested role</li>
                    <li>Create the organization if it doesn't exist</li>
                    <li>Send an email with login credentials</li>
                    <li>Require the user to set a password on first login</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowApproveModal(false)}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="success"
                  leftIcon={<CheckCircle className="h-4 w-4" />}
                  onClick={handleApprove}
                  isLoading={isLoading}
                >
                  Confirm Approval
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900">Reject Access Request</h2>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-600">
                  You are about to reject the access request for:
                </p>
                
                <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <div><strong>Name:</strong> {selectedRequest.firstName} {selectedRequest.lastName}</div>
                    <div><strong>Email:</strong> {selectedRequest.email}</div>
                    <div><strong>Organization:</strong> {selectedRequest.organizationName}</div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder="Provide a reason for rejecting this request..."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This reason will be included in the rejection email sent to the user.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason('');
                  }}
                >
                  Cancel
                </Button>
                
                <Button
                  variant="danger"
                  leftIcon={<XCircle className="h-4 w-4" />}
                  onClick={handleReject}
                  isLoading={isLoading}
                >
                  Confirm Rejection
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessRequests;