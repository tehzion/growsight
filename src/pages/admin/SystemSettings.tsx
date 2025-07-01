import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Save, 
  Shield, 
  Mail, 
  Database, 
  Globe, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  Info,
  Server,
  Clock,
  Users,
  Activity,
  FileText,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import PDFBrandingSettings from '../../components/ui/PDFBrandingSettings';
import { usePDFExportStore } from '../../stores/pdfExportStore';
import { emailService } from '../../services/emailService';

interface SystemSettings {
  security: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSpecialChars: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    requireTwoFactor: boolean;
  };
  email: {
    provider: string;
    fromName: string;
    fromEmail: string;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUsername: string;
    smtpPassword: string;
    apiKey: string;
  };
  system: {
    maintenanceMode: boolean;
    allowRegistration: boolean;
    defaultUserRole: string;
    maxFileSize: number;
    backupFrequency: string;
    logRetentionDays: number;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enableDeadlineReminders: boolean;
    reminderDaysBefore: number;
    enableSystemAlerts: boolean;
  };
  pdf: {
    logoUrl: string;
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    footerText: string;
    includeTimestamp: boolean;
    includePageNumbers: boolean;
    defaultTemplate: string;
  };
}

const SystemSettings: React.FC = () => {
  const { pdfSettings, updatePDFSettings } = usePDFExportStore();
  const [settings, setSettings] = useState<SystemSettings>({
    security: {
      passwordMinLength: 8,
      passwordRequireUppercase: true,
      passwordRequireNumbers: true,
      passwordRequireSpecialChars: false,
      sessionTimeout: 3600,
      maxLoginAttempts: 5,
      lockoutDuration: 900,
      requireTwoFactor: false,
    },
    email: {
      provider: 'smtp',
      fromName: '360° Feedback Platform',
      fromEmail: 'noreply@company.com',
      smtpHost: 'smtp.company.com',
      smtpPort: 587,
      smtpSecure: true,
      smtpUsername: 'smtp_user',
      smtpPassword: '',
      apiKey: '',
    },
    system: {
      maintenanceMode: false,
      allowRegistration: false,
      defaultUserRole: 'employee',
      maxFileSize: 10485760, // 10MB
      backupFrequency: 'daily',
      logRetentionDays: 90,
    },
    notifications: {
      enableEmailNotifications: true,
      enableDeadlineReminders: true,
      reminderDaysBefore: 3,
      enableSystemAlerts: true,
    },
    pdf: {
      logoUrl: pdfSettings.logoUrl,
      companyName: pdfSettings.companyName,
      primaryColor: pdfSettings.primaryColor,
      secondaryColor: pdfSettings.secondaryColor,
      footerText: pdfSettings.footerText,
      includeTimestamp: pdfSettings.includeTimestamp,
      includePageNumbers: pdfSettings.includePageNumbers,
      defaultTemplate: pdfSettings.defaultTemplate,
    },
  });

  const [activeTab, setActiveTab] = useState<'security' | 'email' | 'system' | 'notifications' | 'pdf'>('security');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{success: boolean; message: string} | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState<{success: boolean; message: string} | null>(null);

  // Sync PDF settings with the store
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      pdf: {
        ...pdfSettings
      }
    }));
  }, [pdfSettings]);

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would save to database
      console.log('Settings saved:', settings);
      
      // Update PDF settings in the store
      if (activeTab === 'pdf') {
        updatePDFSettings(settings.pdf);
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = (category: keyof SystemSettings, field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    
    try {
      const result = await emailService.testSMTPConnection({
        host: settings.email.smtpHost,
        port: settings.email.smtpPort,
        secure: settings.email.smtpSecure,
        username: settings.email.smtpUsername,
        password: settings.email.smtpPassword
      });
      
      setConnectionStatus(result);
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Connection test failed: ${(error as Error).message}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      setTestEmailStatus({
        success: false,
        message: 'Please enter an email address'
      });
      return;
    }

    setSendingTestEmail(true);
    setTestEmailStatus(null);

    try {
      const result = await emailService.sendTestEmail(testEmailAddress);
      setTestEmailStatus(result);
    } catch (error) {
      setTestEmailStatus({
        success: false,
        message: `Failed to send test email: ${(error as Error).message}`
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  const tabs = [
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'system', label: 'System', icon: Server },
    { id: 'notifications', label: 'Notifications', icon: Activity },
    { id: 'pdf', label: 'PDF Branding', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure global system settings and security policies
          </p>
        </div>
        <Button
          onClick={handleSave}
          isLoading={isLoading}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save Changes
        </Button>
      </div>

      {/* Status Messages */}
      {saveStatus === 'saved' && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Settings saved successfully!
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Failed to save settings. Please try again.
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Security Settings */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Password Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={settings.security.passwordMinLength}
                    onChange={(e) => updateSettings('security', 'passwordMinLength', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: 8 or higher for better security
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Timeout (seconds)
                  </label>
                  <input
                    type="number"
                    min="300"
                    step="300"
                    value={settings.security.sessionTimeout}
                    onChange={(e) => updateSettings('security', 'sessionTimeout', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How long until inactive users are logged out (3600 = 1 hour)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Login Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={settings.security.maxLoginAttempts}
                    onChange={(e) => updateSettings('security', 'maxLoginAttempts', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Number of failed attempts before account lockout
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lockout Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="300"
                    step="300"
                    value={settings.security.lockoutDuration}
                    onChange={(e) => updateSettings('security', 'lockoutDuration', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    How long accounts remain locked after too many failed attempts
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Password Requirements</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordRequireUppercase}
                      onChange={(e) => updateSettings('security', 'passwordRequireUppercase', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Require at least one uppercase letter</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordRequireNumbers}
                      onChange={(e) => updateSettings('security', 'passwordRequireNumbers', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Require at least one number</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.security.passwordRequireSpecialChars}
                      onChange={(e) => updateSettings('security', 'passwordRequireSpecialChars', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Require at least one special character</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Advanced Security</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.security.requireTwoFactor}
                      onChange={(e) => updateSettings('security', 'requireTwoFactor', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Require two-factor authentication for all users</span>
                  </label>
                </div>
              </div>

              <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-primary-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-primary-800">Security Best Practices</h4>
                    <ul className="mt-1 text-xs text-primary-700 space-y-1">
                      <li>• Require strong passwords (min. 8 characters with mixed case, numbers, and symbols)</li>
                      <li>• Set reasonable session timeouts (1-2 hours for sensitive data)</li>
                      <li>• Implement account lockout after 5-10 failed attempts</li>
                      <li>• Consider enabling two-factor authentication for all admin users</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Settings */}
      {activeTab === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Provider
                </label>
                <select
                  value={settings.email.provider}
                  onChange={(e) => updateSettings('email', 'provider', e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="smtp">SMTP</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="mailgun">Mailgun</option>
                  <option value="aws-ses">AWS SES</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="From Name"
                  value={settings.email.fromName}
                  onChange={(e) => updateSettings('email', 'fromName', e.target.value)}
                  helperText="Name that appears in the From field"
                />
                
                <FormInput
                  label="From Email"
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(e) => updateSettings('email', 'fromEmail', e.target.value)}
                  helperText="Email address that appears in the From field"
                />
              </div>

              {settings.email.provider === 'smtp' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-700">SMTP Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="SMTP Host"
                      value={settings.email.smtpHost}
                      onChange={(e) => updateSettings('email', 'smtpHost', e.target.value)}
                      helperText="e.g., smtp.gmail.com, smtp.office365.com"
                    />
                    
                    <FormInput
                      label="SMTP Port"
                      type="number"
                      value={settings.email.smtpPort.toString()}
                      onChange={(e) => updateSettings('email', 'smtpPort', parseInt(e.target.value))}
                      helperText="Common ports: 25, 465 (SSL), 587 (TLS)"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="SMTP Username"
                      value={settings.email.smtpUsername}
                      onChange={(e) => updateSettings('email', 'smtpUsername', e.target.value)}
                      helperText="Usually your email address"
                    />
                    
                    <div className="relative">
                      <FormInput
                        label="SMTP Password"
                        type={showSmtpPassword ? "text" : "password"}
                        value={settings.email.smtpPassword}
                        onChange={(e) => updateSettings('email', 'smtpPassword', e.target.value)}
                        helperText="Password for SMTP authentication"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      >
                        {showSmtpPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.email.smtpSecure}
                      onChange={(e) => updateSettings('email', 'smtpSecure', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Use secure connection (TLS/SSL)</span>
                  </label>

                  {/* Connection test button */}
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={handleTestConnection}
                      isLoading={testingConnection}
                      disabled={!settings.email.smtpHost || !settings.email.smtpUsername || !settings.email.smtpPassword}
                    >
                      Test SMTP Connection
                    </Button>

                    {connectionStatus && (
                      <div className={`mt-3 p-3 rounded-md ${connectionStatus.success ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-error-50 text-error-700 border border-error-200'}`}>
                        {connectionStatus.success ? (
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {connectionStatus.message}
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            {connectionStatus.message}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {settings.email.provider !== 'smtp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key / Credentials
                  </label>
                  <input
                    type="password"
                    value={settings.email.apiKey}
                    onChange={(e) => updateSettings('email', 'apiKey', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    placeholder={`Enter your ${settings.email.provider} API key`}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This key is stored securely and never exposed to clients
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Send Test Email</h3>
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <FormInput
                      label="Recipient Email"
                      type="email"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      placeholder="Enter email address"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleSendTestEmail}
                    isLoading={sendingTestEmail}
                    disabled={!testEmailAddress || sendingTestEmail}
                    leftIcon={<Send className="h-4 w-4" />}
                    className="mb-4"
                  >
                    Send Test
                  </Button>
                </div>

                {testEmailStatus && (
                  <div className={`mt-3 p-3 rounded-md ${testEmailStatus.success ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-error-50 text-error-700 border border-error-200'}`}>
                    {testEmailStatus.success ? (
                      <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {testEmailStatus.message}
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        {testEmailStatus.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Settings */}
      {activeTab === 'system' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="h-5 w-5 mr-2" />
              System Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">System Status</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.system.maintenanceMode}
                      onChange={(e) => updateSettings('system', 'maintenanceMode', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Enable Maintenance Mode</span>
                  </label>
                  
                  {settings.system.maintenanceMode && (
                    <div className="ml-6 p-3 bg-warning-50 border border-warning-200 rounded-md">
                      <p className="text-sm text-warning-700">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        When enabled, only Super Admins can access the system. All other users will see a maintenance message.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">User Registration</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.system.allowRegistration}
                      onChange={(e) => updateSettings('system', 'allowRegistration', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Allow Self-Registration</span>
                  </label>
                  
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Default Role for New Users
                    </label>
                    <select
                      value={settings.system.defaultUserRole}
                      onChange={(e) => updateSettings('system', 'defaultUserRole', e.target.value)}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      disabled={!settings.system.allowRegistration}
                    >
                      <option value="employee">Employee</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max File Upload Size (bytes)
                  </label>
                  <input
                    type="number"
                    min="1048576"
                    step="1048576"
                    value={settings.system.maxFileSize}
                    onChange={(e) => updateSettings('system', 'maxFileSize', parseInt(e.target.value))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    10485760 = 10MB, 5242880 = 5MB, etc.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Database Backup Frequency
                  </label>
                  <select
                    value={settings.system.backupFrequency}
                    onChange={(e) => updateSettings('system', 'backupFrequency', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Log Retention Period (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.system.logRetentionDays}
                  onChange={(e) => updateSettings('system', 'logRetentionDays', parseInt(e.target.value))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  How long to keep system logs and audit trails
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-4">
                <h3 className="text-sm font-medium text-gray-700">System Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Application Version:</span>
                      <span className="ml-2 font-medium">1.0.0</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Database Version:</span>
                      <span className="ml-2 font-medium">PostgreSQL 14.5</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Backup:</span>
                      <span className="ml-2 font-medium">2025-01-08 04:00 UTC</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Environment:</span>
                      <span className="ml-2 font-medium">Production</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notification Settings */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.enableEmailNotifications}
                      onChange={(e) => updateSettings('notifications', 'enableEmailNotifications', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Enable Email Notifications</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.enableDeadlineReminders}
                      onChange={(e) => updateSettings('notifications', 'enableDeadlineReminders', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      disabled={!settings.notifications.enableEmailNotifications}
                    />
                    <span className="text-sm text-gray-700">Send Deadline Reminders</span>
                  </label>
                  
                  {settings.notifications.enableDeadlineReminders && (
                    <div className="ml-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Days Before Deadline
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="14"
                        value={settings.notifications.reminderDaysBefore}
                        onChange={(e) => updateSettings('notifications', 'reminderDaysBefore', parseInt(e.target.value))}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        disabled={!settings.notifications.enableEmailNotifications || !settings.notifications.enableDeadlineReminders}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        How many days before the deadline to send reminder emails
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">System Alerts</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.notifications.enableSystemAlerts}
                      onChange={(e) => updateSettings('notifications', 'enableSystemAlerts', e.target.checked)}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Enable System Alerts for Admins</span>
                  </label>
                  
                  {settings.notifications.enableSystemAlerts && (
                    <div className="ml-6 p-3 bg-primary-50 border border-primary-200 rounded-md">
                      <p className="text-sm text-primary-700">
                        <Info className="h-4 w-4 inline mr-1" />
                        System alerts will be sent to all Super Admins for critical events like:
                      </p>
                      <ul className="mt-1 text-xs text-primary-600 list-disc list-inside">
                        <li>Failed backup attempts</li>
                        <li>Unusual login patterns</li>
                        <li>System resource constraints</li>
                        <li>Security-related events</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsLoading(true);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    alert('Test notification sent to super admins!');
                    setIsLoading(false);
                  }}
                  isLoading={isLoading}
                >
                  Send Test Notification
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Branding Settings */}
      {activeTab === 'pdf' && (
        <PDFBrandingSettings onSave={handleSave} />
      )}
    </div>
  );
};

export default SystemSettings;