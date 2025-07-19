import React, { useState, useEffect } from 'react';
import { Mail, Settings, TestTube, Check, X, AlertTriangle, Info, Send, Eye, EyeOff, RefreshCw, Server, Shield } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useEmailServiceStore } from '../../stores/emailServiceStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { SMTPEmailService } from '../../services/smtpEmailService';

const EmailServiceConfig: React.FC = () => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const {
    config,
    stats,
    history,
    isLoading,
    error,
    setProvider,
    configureSMTP,
    testConnection,
    resetConfiguration,
    sendTestEmail,
    validateEmailAddress,
    getProviderInfo
  } = useEmailServiceStore();

  const [activeTab, setActiveTab] = useState<'configuration' | 'templates' | 'statistics' | 'history'>('configuration');
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [smtpForm, setSMTPForm] = useState({
    host: '',
    port: 587,
    secure: false,
    username: '',
    password: '',
    fromName: currentOrganization?.name || 'GrowSight',
    fromEmail: ''
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const canManageEmail = isSuperAdmin || isOrgAdmin;

  useEffect(() => {
    // Load current SMTP configuration if available
    if (config.smtp) {
      setSMTPForm(prev => ({
        ...prev,
        ...config.smtp,
        password: '' // Don't pre-fill password for security
      }));
    }
  }, [config.smtp]);

  if (!canManageEmail) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only administrators can manage email service settings.</p>
        </div>
      </div>
    );
  }

  const handleSMTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!smtpForm.host || !smtpForm.username || !smtpForm.password || !smtpForm.fromEmail) {
      return;
    }

    const result = await configureSMTP(smtpForm);
    
    if (result.success) {
      // Clear password from form for security
      setSMTPForm(prev => ({ ...prev, password: '' }));
    }
  };

  const handleTestConnection = async () => {
    await testConnection();
  };

  const handleSendTestEmail = async () => {
    if (!validateEmailAddress(testEmail)) {
      return;
    }

    if (!currentOrganization?.id) {
      return;
    }

    await sendTestEmail(testEmail, currentOrganization.id);
    setTestEmail('');
  };

  const handleProviderPreset = (provider: string) => {
    const presets = SMTPEmailService.getCommonProviders();
    if (presets[provider]) {
      setSMTPForm(prev => ({
        ...prev,
        ...presets[provider]
      }));
    }
  };

  const providerInfo = getProviderInfo();

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Email Service Configuration</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure and manage email settings for notifications and communications
        </p>
      </div>

      {/* Provider Status Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-full ${config.isConfigured ? 'bg-success-100' : 'bg-warning-100'}`}>
                <Mail className={`h-6 w-6 ${config.isConfigured ? 'text-success-600' : 'text-warning-600'}`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {providerInfo.name}
                </h3>
                <p className="text-sm text-gray-600">{providerInfo.status}</p>
                {providerInfo.lastTested && (
                  <p className="text-xs text-gray-500">
                    Last tested: {new Date(providerInfo.lastTested).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {config.isConfigured && (
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isLoading}
                  leftIcon={<TestTube className="h-4 w-4" />}
                >
                  Test Connection
                </Button>
              )}
              <Button
                variant="outline"
                onClick={resetConfiguration}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Test Result */}
          {config.testResult && (
            <div className={`mt-4 p-3 rounded-lg border ${
              config.testResult.success 
                ? 'bg-success-50 border-success-200 text-success-700'
                : 'bg-error-50 border-error-200 text-error-700'
            }`}>
              <div className="flex items-center">
                {config.testResult.success ? 
                  <Check className="h-4 w-4 mr-2" /> : 
                  <X className="h-4 w-4 mr-2" />
                }
                <span className="text-sm font-medium">{config.testResult.message}</span>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg border bg-error-50 border-error-200 text-error-700">
              <div className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'configuration', label: 'Configuration', icon: Settings },
            { key: 'templates', label: 'Templates', icon: Mail },
            { key: 'statistics', label: 'Statistics', icon: Info },
            { key: 'history', label: 'History', icon: RefreshCw }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4 mr-1" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <div className="space-y-6">
          {/* Provider Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Server className="h-5 w-5 mr-2" />
                Email Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    config.provider === 'demo' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setProvider('demo')}
                >
                  <div className="text-center">
                    <TestTube className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <h3 className="font-medium">Demo Mode</h3>
                    <p className="text-sm text-gray-500">For development and testing</p>
                  </div>
                </div>
                
                <div 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    config.provider === 'smtp' 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setProvider('smtp')}
                >
                  <div className="text-center">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                    <h3 className="font-medium">SMTP</h3>
                    <p className="text-sm text-gray-500">Custom SMTP server</p>
                  </div>
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg opacity-50">
                  <div className="text-center">
                    <Shield className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <h3 className="font-medium text-gray-400">Cloud Services</h3>
                    <p className="text-sm text-gray-400">Coming soon</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMTP Configuration */}
          {config.provider === 'smtp' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  SMTP Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSMTPSubmit} className="space-y-6">
                  {/* Provider Presets */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quick Setup (Optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(SMTPEmailService.getCommonProviders()).map(provider => (
                        <button
                          key={provider}
                          type="button"
                          onClick={() => handleProviderPreset(provider)}
                          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                        >
                          {provider.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="SMTP Host"
                      value={smtpForm.host}
                      onChange={(e) => setSMTPForm(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="smtp.gmail.com"
                      required
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Port
                      </label>
                      <input
                        type="number"
                        value={smtpForm.port}
                        onChange={(e) => setSMTPForm(prev => ({ ...prev, port: parseInt(e.target.value) || 587 }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="65535"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="secure"
                      checked={smtpForm.secure}
                      onChange={(e) => setSMTPForm(prev => ({ ...prev, secure: e.target.checked }))}
                      className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                    />
                    <label htmlFor="secure" className="ml-2 text-sm text-gray-700">
                      Use SSL/TLS (port 465)
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="Username"
                      value={smtpForm.username}
                      onChange={(e) => setSMTPForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="your-email@example.com"
                      required
                    />
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={smtpForm.password}
                          onChange={(e) => setSMTPForm(prev => ({ ...prev, password: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md"
                          placeholder="Enter password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormInput
                      label="From Name"
                      value={smtpForm.fromName}
                      onChange={(e) => setSMTPForm(prev => ({ ...prev, fromName: e.target.value }))}
                      placeholder="Your Organization"
                      required
                    />
                    
                    <FormInput
                      label="From Email"
                      value={smtpForm.fromEmail}
                      onChange={(e) => setSMTPForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                      placeholder="noreply@yourorganization.com"
                      type="email"
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSMTPForm({
                        host: '',
                        port: 587,
                        secure: false,
                        username: '',
                        password: '',
                        fromName: currentOrganization?.name || 'GrowSight',
                        fromEmail: ''
                      })}
                    >
                      Reset Form
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading}
                      leftIcon={<Settings className="h-4 w-4" />}
                    >
                      {isLoading ? 'Configuring...' : 'Save Configuration'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Test Email */}
          {config.isConfigured && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 mr-2" />
                  Send Test Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <FormInput
                      label="Test Email Address"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      type="email"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSendTestEmail}
                      disabled={isLoading || !testEmail || !validateEmailAddress(testEmail)}
                      leftIcon={<Send className="h-4 w-4" />}
                    >
                      Send Test
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-success-600">{stats.totalSent}</div>
                <div className="text-sm text-gray-600">Total Sent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-error-600">{stats.totalFailed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-600">{stats.successRate.toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary-600">{stats.dailyCount}</div>
                <div className="text-sm text-gray-600">Today</div>
              </div>
            </div>
            
            {stats.lastSent && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Last email sent: {new Date(stats.lastSent).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No email history available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{entry.to}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          entry.status === 'sent' 
                            ? 'bg-success-100 text-success-700'
                            : 'bg-error-100 text-error-700'
                        }`}>
                          {entry.status}
                        </span>
                        <span className="text-xs text-gray-500">{entry.provider}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">{entry.subject}</div>
                      {entry.error && (
                        <div className="text-xs text-error-600 mt-1">{entry.error}</div>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(entry.sentAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmailServiceConfig;