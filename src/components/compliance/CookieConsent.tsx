import React, { useState, useEffect } from 'react';
import { X, Settings, Check, AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { GDPRCompliance } from '../../lib/compliance/gdpr';
import { useAuthStore } from '../../stores/authStore';
import { config } from '../../config/environment';

interface CookieConsentProps {
  onConsentChange?: (consents: Record<string, boolean>) => void;
  showSettings?: boolean;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ 
  onConsentChange, 
  showSettings = false 
}) => {
  const { user } = useAuthStore();
  const [showBanner, setShowBanner] = useState(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState(showSettings);
  const [consents, setConsents] = useState({
    necessary: true, // Always required
    functional: false,
    analytics: false,
    marketing: false
  });
  const [isLoading, setIsLoading] = useState(false);

  const gdpr = GDPRCompliance.getInstance();

  useEffect(() => {
    // Check if user has already given consent
    const checkConsent = async () => {
      if (user?.id) {
        const { success, consents: userConsents } = await gdpr.getConsentStatus(user.id);
        if (success && userConsents) {
          setConsents(prev => ({
            ...prev,
            ...userConsents
          }));
          // Don't show banner if user has already consented
          if (Object.values(userConsents).some(consent => consent)) {
            return;
          }
        }
      }
      
      // Show banner if no consent has been given
      const hasConsent = localStorage.getItem('cookie-consent');
      if (!hasConsent) {
        setShowBanner(true);
      }
    };

    checkConsent();
  }, [user?.id]);

  const handleConsentChange = (type: keyof typeof consents, value: boolean) => {
    setConsents(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleAcceptAll = async () => {
    setIsLoading(true);
    try {
      const allConsents = {
        necessary: true,
        functional: true,
        analytics: true,
        marketing: true
      };

      if (user?.id) {
        const clientIP = await getClientIP();
        // Record all consents
        await Promise.all([
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'necessary',
            granted: true,
            ipAddress: clientIP,
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'functional',
            granted: true,
            ipAddress: clientIP,
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'analytics',
            granted: true,
            ipAddress: clientIP,
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'marketing',
            granted: true,
            ipAddress: clientIP,
            userAgent: navigator.userAgent,
            version: '1.0'
          })
        ]);
      }

      setConsents(allConsents);
      localStorage.setItem('cookie-consent', JSON.stringify(allConsents));
      setShowBanner(false);
      onConsentChange?.(allConsents);
    } catch (error) {
      console.error('Failed to record consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSelected = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const clientIP = await getClientIP();
        // Record selected consents
        await Promise.all(
          Object.entries(consents).map(([type, granted]) =>
            gdpr.recordConsent({
              userId: user.id,
              consentType: type as any,
              granted,
              ipAddress: clientIP,
              userAgent: navigator.userAgent,
              version: '1.0'
            })
          )
        );
      }

      localStorage.setItem('cookie-consent', JSON.stringify(consents));
      setShowBanner(false);
      setShowSettingsPanel(false);
      onConsentChange?.(consents);
    } catch (error) {
      console.error('Failed to record consent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectAll = async () => {
    setIsLoading(true);
    try {
      const minimalConsents = {
        necessary: true, // Always required
        functional: false,
        analytics: false,
        marketing: false
      };

      if (user?.id) {
        // Record minimal consents
        await Promise.all([
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'necessary',
            granted: true,
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'functional',
            granted: false,
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'analytics',
            granted: false,
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            version: '1.0'
          }),
          gdpr.recordConsent({
            userId: user.id,
            consentType: 'marketing',
            granted: false,
            ipAddress: await getClientIP(),
            userAgent: navigator.userAgent,
            version: '1.0'
          })
        ]);
      }

      setConsents(minimalConsents);
      localStorage.setItem('cookie-consent', JSON.stringify(minimalConsents));
      setShowBanner(false);
      onConsentChange?.(minimalConsents);
    } catch (error) {
      console.error('Failed to record consent:', error);
    } finally {
      setIsLoading(false);
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

  if (!showBanner && !showSettingsPanel) {
    return null;
  }

  return (
    <>
      {/* Cookie Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  We value your privacy
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  We use cookies and similar technologies to provide, protect, and improve our services. 
                  By clicking "Accept All", you consent to our use of cookies for analytics, personalization, 
                  and marketing purposes. You can customize your preferences or learn more in our{' '}
                  <a 
                    href="/privacy-policy" 
                    className="text-blue-600 hover:text-blue-800 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleAcceptAll}
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isLoading ? 'Processing...' : 'Accept All'}
                  </Button>
                  <Button
                    onClick={() => setShowSettingsPanel(true)}
                    variant="outline"
                    disabled={isLoading}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                  <Button
                    onClick={handleRejectAll}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Reject All
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setShowBanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Panel */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  Cookie Preferences
                </CardTitle>
                <button
                  onClick={() => setShowSettingsPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Necessary Cookies */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 text-green-600 mr-2" />
                    <h4 className="font-medium">Necessary Cookies</h4>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={consents.necessary}
                      disabled
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-500">Always Active</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600">
                  These cookies are essential for the website to function properly. They enable basic 
                  functions like page navigation, access to secure areas, and form submissions.
                </p>
              </div>

              {/* Functional Cookies */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 text-blue-600 mr-2" />
                    <h4 className="font-medium">Functional Cookies</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={consents.functional}
                    onChange={(e) => handleConsentChange('functional', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  These cookies enable enhanced functionality and personalization, such as remembering 
                  your preferences and settings.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <h4 className="font-medium">Analytics Cookies</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={consents.analytics}
                    onChange={(e) => handleConsentChange('analytics', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  These cookies help us understand how visitors interact with our website by collecting 
                  and reporting information anonymously.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
                    <h4 className="font-medium">Marketing Cookies</h4>
                  </div>
                  <input
                    type="checkbox"
                    checked={consents.marketing}
                    onChange={(e) => handleConsentChange('marketing', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  These cookies are used to track visitors across websites to display relevant and 
                  engaging advertisements.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  onClick={() => setShowSettingsPanel(false)}
                  variant="outline"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAcceptSelected}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}; 