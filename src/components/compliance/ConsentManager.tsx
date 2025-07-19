import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, XCircle, Settings, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { GDPRCompliance } from '../../lib/compliance/gdpr';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';

export const ConsentManager: React.FC = () => {
  const { user } = useAuthStore();
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const gdpr = GDPRCompliance.getInstance();

  const consentTypes = [
    {
      id: 'necessary',
      label: 'Necessary Cookies',
      description: 'Essential for the website to function properly',
      required: true,
      examples: 'Authentication, security, basic functionality'
    },
    {
      id: 'functional',
      label: 'Functional Cookies',
      description: 'Enable enhanced functionality and personalization',
      required: false,
      examples: 'Remembering preferences, settings, and customizations'
    },
    {
      id: 'analytics',
      label: 'Analytics Cookies',
      description: 'Help us understand how visitors use our platform',
      required: false,
      examples: 'Usage statistics, performance metrics, user behavior'
    },
    {
      id: 'marketing',
      label: 'Marketing Cookies',
      description: 'Used for advertising and marketing purposes',
      required: false,
      examples: 'Targeted advertising, campaign tracking, social media'
    }
  ];

  useEffect(() => {
    loadConsentStatus();
  }, [user?.id]);

  const loadConsentStatus = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const { success, consents: userConsents } = await gdpr.getConsentStatus(user.id);
      if (success && userConsents) {
        setConsents(userConsents);
      }
    } catch (error) {
      console.error('Failed to load consent status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConsentChange = async (consentType: string, granted: boolean) => {
    if (!user?.id) return;

    setIsUpdating(true);

    try {
      const result = await gdpr.recordConsent({
        userId: user.id,
        consentType: consentType as any,
        granted,
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent,
        version: '1.0'
      });

      if (result.success) {
        setConsents(prev => ({
          ...prev,
          [consentType]: granted
        }));

        useNotificationStore.getState().addNotification({
          title: 'Consent Updated',
          message: `Your ${consentType} consent has been ${granted ? 'granted' : 'withdrawn'}`,
          type: 'success'
        });
      } else {
        throw new Error(result.error || 'Failed to update consent');
      }
    } catch (error) {
      console.error('Failed to update consent:', error);
      useNotificationStore.getState().addNotification({
        title: 'Consent Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update consent',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWithdrawAll = async () => {
    if (!user?.id) return;

    setIsUpdating(true);

    try {
      const promises = consentTypes
        .filter(type => !type.required)
        .map(type => 
          gdpr.withdrawConsent(user.id, type.id as any)
        );

      await Promise.all(promises);

      setConsents(prev => {
        const updated = { ...prev };
        consentTypes.forEach(type => {
          if (!type.required) {
            updated[type.id] = false;
          }
        });
        return updated;
      });

      useNotificationStore.getState().addNotification({
        title: 'All Consents Withdrawn',
        message: 'You have withdrawn all optional consents',
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to withdraw consents:', error);
      useNotificationStore.getState().addNotification({
        title: 'Consent Withdrawal Failed',
        message: 'Failed to withdraw some consents',
        type: 'error'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3">Loading consent preferences...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            Consent Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Manage your consent preferences for how we collect and use your data. 
            You can change these settings at any time.
          </p>
        </CardContent>
      </Card>

      {/* Consent Types */}
      <div className="space-y-4">
        {consentTypes.map((consentType) => (
          <Card key={consentType.id} className="border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="font-medium text-gray-900">{consentType.label}</h3>
                    {consentType.required && (
                      <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{consentType.description}</p>
                  <div className="text-xs text-gray-500">
                    <strong>Examples:</strong> {consentType.examples}
                  </div>
                </div>
                <div className="ml-6 flex items-center">
                  {consentType.required ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">Always Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consents[consentType.id] || false}
                          onChange={(e) => handleConsentChange(consentType.id, e.target.checked)}
                          disabled={isUpdating}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <div className="text-sm">
                        {consents[consentType.id] ? (
                          <span className="text-green-600 font-medium">Active</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Bulk Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleWithdrawAll}
              disabled={isUpdating}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Withdraw All Optional Consents
            </Button>
            <Button
              onClick={loadConsentStatus}
              disabled={isUpdating}
              variant="outline"
            >
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <AlertTriangle className="h-5 w-5 mr-2" />
            About Consent Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <div>
            <strong>Your Rights:</strong> Under GDPR, you have the right to withdraw consent at any time. 
            Withdrawing consent will not affect the lawfulness of processing based on consent before its withdrawal.
          </div>
          <div>
            <strong>Required Cookies:</strong> Necessary cookies are essential for the website to function 
            and cannot be disabled. They do not store any personally identifiable information.
          </div>
          <div>
            <strong>Changes:</strong> When you change your consent preferences, we will immediately 
            stop processing your data for the withdrawn consent types.
          </div>
          <div>
            <strong>Data Retention:</strong> We retain consent records for 3 years to demonstrate 
            compliance with data protection laws.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 