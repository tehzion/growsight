import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  AlertTriangle,
  MessageSquare,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import SecureLogger from '../../lib/secureLogger';

interface RootAccessRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  position: string;
  phone: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  reviewer_notes?: string;
}

interface RootAccessManagerProps {
  onRequestsUpdate?: (count: number) => void;
}

const RootAccessManager: React.FC<RootAccessManagerProps> = ({ onRequestsUpdate }) => {
  const [requests, setRequests] = useState<RootAccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RootAccessRequest | null>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!supabase) {
        throw new Error('Database connection not available');
      }

      const { data, error } = await supabase
        .from('root_access_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) {
        throw error;
      }

      setRequests(data || []);
      
      // Update parent component with pending count
      const pendingCount = data?.filter(req => req.status === 'pending').length || 0;
      onRequestsUpdate?.(pendingCount);
      
    } catch (err) {
      console.error('Error fetching root access requests:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from('root_access_requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: reviewerNotes || null,
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Log the approval
      SecureLogger.info('Root access request approved', {
        type: 'root_access_approval',
        requestId,
        approvedBy: user.id,
        reviewerNotes
      });

      addNotification({
        title: 'Request Approved',
        message: 'Root access request has been approved successfully',
        type: 'success'
      });

      // Refresh requests
      await fetchRequests();
      setSelectedRequest(null);
      setReviewerNotes('');
      
    } catch (err) {
      console.error('Error approving request:', err);
      addNotification({
        title: 'Error',
        message: 'Failed to approve request',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      if (!supabase) {
        throw new Error('Database connection not available');
      }

      // Update the request status
      const { error: updateError } = await supabase
        .from('root_access_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          reviewer_notes: reviewerNotes || null,
        })
        .eq('id', requestId);

      if (updateError) {
        throw updateError;
      }

      // Log the rejection
      SecureLogger.info('Root access request rejected', {
        type: 'root_access_rejection',
        requestId,
        rejectedBy: user.id,
        reviewerNotes
      });

      addNotification({
        title: 'Request Rejected',
        message: 'Root access request has been rejected',
        type: 'info'
      });

      // Refresh requests
      await fetchRequests();
      setSelectedRequest(null);
      setReviewerNotes('');
      
    } catch (err) {
      console.error('Error rejecting request:', err);
      addNotification({
        title: 'Error',
        message: 'Failed to reject request',
        type: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-primary-600" />
              Root Access Requests
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Requests</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRequests}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No {filter === 'all' ? '' : filter} root access requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {request.first_name} {request.last_name}
                          </h3>
                          <p className="text-sm text-gray-600">{request.position}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        <span className="capitalize">{request.status}</span>
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedRequest(request)}
                        leftIcon={<Eye className="h-4 w-4" />}
                      >
                        Review
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <span>{request.company_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{request.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>{new Date(request.requested_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {request.justification}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Review Root Access Request</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-sm text-gray-900">{selectedRequest.first_name} {selectedRequest.last_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <p className="text-sm text-gray-900">{selectedRequest.company_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <p className="text-sm text-gray-900">{selectedRequest.position}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{selectedRequest.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requested</label>
                    <p className="text-sm text-gray-900">{new Date(selectedRequest.requested_at).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Justification</label>
                  <div className="p-3 bg-gray-50 rounded-md">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedRequest.justification}</p>
                  </div>
                </div>

                {selectedRequest.status === 'pending' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Notes</label>
                    <textarea
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add notes about your decision..."
                    />
                  </div>
                )}

                {selectedRequest.reviewer_notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer Notes</label>
                    <div className="p-3 bg-gray-50 rounded-md">
                      <p className="text-sm text-gray-700">{selectedRequest.reviewer_notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="secondary"
                      onClick={() => handleReject(selectedRequest.id)}
                      disabled={isProcessing}
                      leftIcon={<XCircle className="h-4 w-4" />}
                    >
                      {isProcessing ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(selectedRequest.id)}
                      disabled={isProcessing}
                      leftIcon={<CheckCircle className="h-4 w-4" />}
                    >
                      {isProcessing ? 'Processing...' : 'Approve'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RootAccessManager;