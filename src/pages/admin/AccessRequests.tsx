import { useEffect } from 'react';
import { Check, X, Shield, Mail, Building2, User } from 'lucide-react';
import { useAccessRequestStore } from '../../stores/accessRequestStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

const AccessRequests = () => {
  const { requests, fetchRequests, approveRequest, rejectRequest, isLoading } = useAccessRequestStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (user?.role !== 'super_admin') {
    return <div>Access Denied</div>;
  }

  const pendingRequests = requests.filter(req => req.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="h-6 w-6 mr-3 text-primary-600" />
          Access Requests
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review and approve or reject requests for access to the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests ({pendingRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No pending requests</h3>
              <p className="mt-1 text-sm text-gray-500">There are no pending access requests at this time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map(request => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-600" />
                      <span className="font-medium text-gray-900">{request.firstName} {request.lastName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">{request.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">{request.organizationName}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <span className="text-gray-700">{request.requestedRole}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => rejectRequest(request.id)}
                      isLoading={isLoading}
                      leftIcon={<X className="h-4 w-4" />}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveRequest(request.id)}
                      isLoading={isLoading}
                      leftIcon={<Check className="h-4 w-4" />}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessRequests;