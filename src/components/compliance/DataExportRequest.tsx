import React, { useState } from 'react';
import { Download, FileText, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { GDPRCompliance } from '../../lib/compliance/gdpr';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface DataExportRequestProps {
  onRequestSubmitted?: (requestId: string) => void;
}

export const DataExportRequest: React.FC<DataExportRequestProps> = ({ 
  onRequestSubmitted 
}) => {
  const { user } = useAuthStore();
  const [requestType, setRequestType] = useState<'full_export' | 'specific_data'>('full_export');
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentRequest, setCurrentRequest] = useState<any>(null);

  const gdpr = GDPRCompliance.getInstance();

  const availableDataTypes = [
    { id: 'profile', label: 'Profile Information', description: 'Personal details, contact information, preferences' },
    { id: 'assessments', label: 'Assessment Data', description: 'All assessment responses and feedback received' },
    { id: 'assignments', label: 'Assessment Assignments', description: 'Assessments assigned to you and their status' },
    { id: 'results', label: 'Assessment Results', description: 'Your assessment results and analytics' },
    { id: 'communications', label: 'Communications', description: 'Emails, notifications, and support tickets' },
    { id: 'activity', label: 'Activity Logs', description: 'Login history, platform usage, and activity records' },
    { id: 'consent', label: 'Consent Records', description: 'Your consent history and preferences' },
    { id: 'analytics', label: 'Analytics Data', description: 'Usage analytics and behavioral data' }
  ];

  const handleDataTypeToggle = (dataType: string) => {
    setDataTypes(prev => 
      prev.includes(dataType) 
        ? prev.filter(type => type !== dataType)
        : [...prev, dataType]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.id) {
      useNotificationStore.getState().addNotification({
        title: 'Error',
        message: 'You must be logged in to request data export',
        type: 'error'
      });
      return;
    }

    if (requestType === 'specific_data' && dataTypes.length === 0) {
      useNotificationStore.getState().addNotification({
        title: 'Error',
        message: 'Please select at least one data type for specific export',
        type: 'error'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const request = {
        userId: user.id,
        requestType,
        dataTypes: requestType === 'specific_data' ? dataTypes : undefined,
        format,
        reason: reason.trim() || undefined
      };

      const result = await gdpr.requestDataExport(request);

      if (result.success && result.requestId) {
        setCurrentRequest({
          id: result.requestId,
          status: 'pending',
          requestedAt: new Date(),
          format,
          dataTypes: requestType === 'specific_data' ? dataTypes : 'All data'
        });

        useNotificationStore.getState().addNotification({
          title: 'Export Request Submitted',
          message: 'Your data export request has been submitted successfully. You will receive an email when it\'s ready.',
          type: 'success'
        });

        onRequestSubmitted?.(result.requestId);
      } else {
        throw new Error(result.error || 'Failed to submit export request');
      }
    } catch (error) {
      console.error('Data export request failed:', error);
      useNotificationStore.getState().addNotification({
        title: 'Export Request Failed',
        message: error instanceof Error ? error.message : 'Failed to submit export request',
        type: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready for download';
      case 'processing':
        return 'Processing your data';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Request submitted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Request Status */}
      {currentRequest && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-900">
              {getStatusIcon(currentRequest.status)}
              <span className="ml-2">Current Export Request</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Status:</span> {getStatusText(currentRequest.status)}
              </div>
              <div>
                <span className="font-medium">Format:</span> {currentRequest.format.toUpperCase()}
              </div>
              <div>
                <span className="font-medium">Requested:</span> {currentRequest.requestedAt.toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium">Data Types:</span> {Array.isArray(currentRequest.dataTypes) ? currentRequest.dataTypes.join(', ') : currentRequest.dataTypes}
              </div>
            </div>
            {currentRequest.status === 'completed' && currentRequest.downloadUrl && (
              <Button
                onClick={() => window.open(currentRequest.downloadUrl, '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Export
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* New Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Request Data Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Request Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Type
              </label>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="full_export"
                    checked={requestType === 'full_export'}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Complete Data Export</div>
                    <div className="text-sm text-gray-600">
                      Export all your personal data from our platform
                    </div>
                  </div>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="specific_data"
                    checked={requestType === 'specific_data'}
                    onChange={(e) => setRequestType(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">Specific Data Export</div>
                    <div className="text-sm text-gray-600">
                      Select specific types of data to export
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Data Types Selection */}
            {requestType === 'specific_data' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Data Types
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {availableDataTypes.map((dataType) => (
                    <label key={dataType.id} className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={dataTypes.includes(dataType.id)}
                        onChange={() => handleDataTypeToggle(dataType.id)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <div className="font-medium text-sm">{dataType.label}</div>
                        <div className="text-xs text-gray-600">{dataType.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="grid md:grid-cols-3 gap-3">
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">JSON</div>
                    <div className="text-sm text-gray-600">Machine-readable format</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">CSV</div>
                    <div className="text-sm text-gray-600">Spreadsheet format</div>
                  </div>
                </label>
                <label className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="radio"
                    value="pdf"
                    checked={format === 'pdf'}
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">PDF</div>
                    <div className="text-sm text-gray-600">Human-readable format</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Reason (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Export (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you're requesting this export..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            {/* Information Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                <div className="text-sm text-blue-800">
                  <div className="font-medium mb-1">Important Information</div>
                  <ul className="space-y-1">
                    <li>• Your export request will be processed within 30 days as required by GDPR</li>
                    <li>• You will receive an email notification when your export is ready</li>
                    <li>• Export files are available for download for 30 days</li>
                    <li>• Large exports may take longer to process</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Submit Export Request
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