import React, { useState } from 'react';
import { Trash2, AlertTriangle, Shield, FileText, CheckCircle } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { GDPRCompliance } from '../../lib/compliance/gdpr';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

export const RightToErasure: React.FC = () => {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const gdpr = GDPRCompliance.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      useNotificationStore.getState().addNotification({
        title: 'Error',
        message: 'You must be logged in to request data deletion',
        type: 'error'
      });
      return;
    }

    if (!confirmation) {
      useNotificationStore.getState().addNotification({
        title: 'Error',
        message: 'You must confirm that you understand the consequences of data deletion',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await gdpr.requestDataDeletion({
        userId: user.id,
        requestType: 'hard_delete',
        reason: reason.trim() || 'User requested data deletion',
        retentionPeriod: 0,
        confirmDeletion: true
      });

      if (result.success) {
        setShowConfirmation(true);
        useNotificationStore.getState().addNotification({
          title: 'Deletion Request Submitted',
          message: 'Your data deletion request has been submitted. We will process it within 30 days.',
          type: 'success'
        });
      } else {
        throw new Error(result.error || 'Failed to submit deletion request');
      }
    } catch (error) {
      console.error('Data deletion request failed:', error);
      useNotificationStore.getState().addNotification({
        title: 'Deletion Request Failed',
        message: error instanceof Error ? error.message : 'Failed to submit deletion request',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showConfirmation) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center text-green-900">
            <CheckCircle className="h-5 w-5 mr-2" />
            Deletion Request Submitted
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-green-800">
            Your data deletion request has been submitted successfully. Here's what happens next:
          </p>
          <div className="space-y-2 text-sm text-green-700">
            <div>• We will review your request within 30 days</div>
            <div>• You will receive an email confirmation</div>
            <div>• Legal and business records may be retained as required by law</div>
            <div>• Your account will be deactivated after data deletion</div>
          </div>
          <Button
            onClick={() => setShowConfirmation(false)}
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Warning Notice */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center text-red-900">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Right to Erasure (Right to be Forgotten)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-800 font-medium">
            This action will permanently delete your personal data from our system.
          </p>
          <div className="text-sm text-red-700 space-y-2">
            <div>• All your personal information will be permanently deleted</div>
            <div>• Assessment responses and feedback will be anonymized or deleted</div>
            <div>• Your account will be deactivated and cannot be recovered</div>
            <div>• Some data may be retained for legal or business purposes</div>
          </div>
        </CardContent>
      </Card>

      {/* Deletion Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trash2 className="h-5 w-5 mr-2" />
            Request Data Deletion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* What Will Be Deleted */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Data That Will Be Deleted</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Personal profile information
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Assessment responses
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Communication history
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Activity logs
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Account preferences
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Consent records
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Analytics data
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 text-gray-500" />
                    Support tickets
                  </div>
                </div>
              </div>
            </div>

            {/* Data That May Be Retained */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Data That May Be Retained</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm text-yellow-800 space-y-2">
                  <div>• Business records required by law (7 years)</div>
                  <div>• Assessment results for organizational purposes (anonymized)</div>
                  <div>• Financial and billing information (as required by tax law)</div>
                  <div>• Security logs and audit trails (for fraud prevention)</div>
                </div>
              </div>
            </div>

            {/* Reason for Deletion */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Deletion Request
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you're requesting data deletion..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                rows={3}
              />
            </div>

            {/* Confirmation */}
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={confirmation}
                  onChange={(e) => setConfirmation(e.target.checked)}
                  className="mt-1 mr-3"
                />
                <div className="text-sm text-gray-700">
                  <div className="font-medium mb-1">I understand and confirm that:</div>
                  <ul className="space-y-1">
                    <li>• This action is irreversible and permanent</li>
                    <li>• All my personal data will be deleted from the system</li>
                    <li>• My account will be deactivated and cannot be recovered</li>
                    <li>• I may lose access to assessment results and feedback</li>
                    <li>• Some data may be retained for legal or business purposes</li>
                  </ul>
                </div>
              </label>
            </div>

            {/* Legal Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <Shield className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Your Rights Under GDPR</div>
                  <p>
                    You have the right to request deletion of your personal data under GDPR Article 17. 
                    We will process your request within 30 days and notify you of the outcome. 
                    Some data may be retained if required by law or for legitimate business purposes.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || !confirmation}
                className="bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400"
              >
                {isSubmitting ? (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2 animate-spin" />
                    Processing Request...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Request Data Deletion
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}; 