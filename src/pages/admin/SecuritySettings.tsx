import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Key,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  Database,
  Globe,
  FileText,
  Users,
  Activity,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useNotificationStore } from '../../stores/notificationStore';
import { environment } from '../../config/environment';
import { getSecurityHeaders } from '../../lib/security/securityHeaders';
import { securityManager } from '../../lib/security';

interface SecurityConfig {
  authentication: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    passwordRequireSpecialChars: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireUppercase: boolean;
    enableTwoFactor: boolean;
    sessionConcurrencyLimit: number;
  };
  contentSecurity: {
    enableCSP: boolean;
    allowedScriptSources: string[];
    allowedStyleSources: string[];
    allowedImageSources: string[];
    allowedConnectSources: string[];
    reportViolations: boolean;
  };
  dataProtection: {
    enableEncryption: boolean;
    encryptionAlgorithm: string;
    dataRetentionDays: number;
    enableAuditLogging: boolean;
    enableDataMasking: boolean;
    requireExplicitConsent: boolean;
  };
  accessControl: {
    enableRateLimit: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
    enableIPWhitelist: boolean;
    whitelistedIPs: string[];
    enableGeolocation: boolean;
    allowedCountries: string[];
  };
  monitoring: {
    enableRealTimeAlerts: boolean;
    alertThresholds: {
      failedLogins: number;
      dataAccessAttempts: number;
      systemErrors: number;
    };
    enableSecurityDashboard: boolean;
    enableComplianceReports: boolean;
  };
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  authentication: {
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    passwordMinLength: 12,
    passwordRequireSpecialChars: true,
    passwordRequireNumbers: true,
    passwordRequireUppercase: true,
    enableTwoFactor: false,
    sessionConcurrencyLimit: 3,
  },
  contentSecurity: {
    enableCSP: true,
    allowedScriptSources: ['self', 'unsafe-inline'],
    allowedStyleSources: ['self', 'unsafe-inline'],
    allowedImageSources: ['self', 'data:', 'https:'],
    allowedConnectSources: ['self'],
    reportViolations: true,
  },
  dataProtection: {
    enableEncryption: true,
    encryptionAlgorithm: 'AES-256',
    dataRetentionDays: 365,
    enableAuditLogging: true,
    enableDataMasking: true,
    requireExplicitConsent: true,
  },
  accessControl: {
    enableRateLimit: true,
    rateLimitRequests: 100,
    rateLimitWindow: 900,
    enableIPWhitelist: false,
    whitelistedIPs: [],
    enableGeolocation: false,
    allowedCountries: [],
  },
  monitoring: {
    enableRealTimeAlerts: true,
    alertThresholds: {
      failedLogins: 10,
      dataAccessAttempts: 50,
      systemErrors: 5,
    },
    enableSecurityDashboard: true,
    enableComplianceReports: true,
  },
};

export const SecuritySettings: React.FC = () => {
  const { user } = useAuthStore();
  const { addNotification } = useNotificationStore();

  // Determine user's security access level
  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const hasSystemAccess = isSuperAdmin;
  const hasOrgAccess = isSuperAdmin || isOrgAdmin;

  const [config, setConfig] = useState<SecurityConfig>(DEFAULT_SECURITY_CONFIG);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'auth' | 'csp' | 'data' | 'access' | 'monitoring'>('auth');
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  useEffect(() => {
    loadSecurityConfig();
  }, []);

  const loadSecurityConfig = async () => {
    try {
      // In a real implementation, this would load from a secure backend
      const savedConfig = localStorage.getItem('security_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.error('Failed to load security config:', error);
    }
  };

  const updateConfig = (section: keyof SecurityConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  };

  const updateNestedConfig = (section: keyof SecurityConfig, nestedKey: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [nestedKey]: {
          ...(prev[section] as any)[nestedKey],
          [key]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const validateConfiguration = async () => {
    setIsValidating(true);
    try {
      const results = securityManager.validateSecurityConfig();
      setValidationResults(results);
      
      if (results.isValid) {
        addNotification({
          type: 'success',
          title: 'Security Configuration Valid',
          message: 'All security settings are properly configured'
        });
      } else {
        addNotification({
          type: 'warning',
          title: 'Security Issues Found',
          message: `${results.issues?.length || 0} security issues detected`
        });
      }
    } catch (error) {
      console.error('Validation failed:', error);
      addNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Unable to validate security configuration'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    try {
      // In a real implementation, this would save to a secure backend
      localStorage.setItem('security_config', JSON.stringify(config));
      
      addNotification({
        type: 'success',
        title: 'Security Settings Saved',
        message: 'Security configuration has been updated successfully'
      });
      
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save security config:', error);
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save security configuration'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportConfiguration = () => {
    const configBlob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'security-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetToDefaults = () => {
    setConfig(DEFAULT_SECURITY_CONFIG);
    setHasChanges(true);
  };

  const tabs = [
    { id: 'auth', label: 'Authentication', icon: <Lock className="h-4 w-4" />, requiresSystemAccess: false },
    { id: 'csp', label: 'Content Security', icon: <Shield className="h-4 w-4" />, requiresSystemAccess: true },
    { id: 'data', label: 'Data Protection', icon: <Database className="h-4 w-4" />, requiresSystemAccess: true },
    { id: 'access', label: 'Access Control', icon: <Key className="h-4 w-4" />, requiresSystemAccess: true },
    { id: 'monitoring', label: 'Monitoring', icon: <Activity className="h-4 w-4" />, requiresSystemAccess: false },
  ];

  const renderAuthenticationSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Session Timeout (seconds)"
          type="number"
          value={config.authentication.sessionTimeout}
          onChange={(e) => updateConfig('authentication', 'sessionTimeout', parseInt(e.target.value))}
          min="300"
          max="86400"
        />
        <FormInput
          label="Max Login Attempts"
          type="number"
          value={config.authentication.maxLoginAttempts}
          onChange={(e) => updateConfig('authentication', 'maxLoginAttempts', parseInt(e.target.value))}
          min="3"
          max="20"
        />
        <FormInput
          label="Password Min Length"
          type="number"
          value={config.authentication.passwordMinLength}
          onChange={(e) => updateConfig('authentication', 'passwordMinLength', parseInt(e.target.value))}
          min="8"
          max="50"
        />
        <FormInput
          label="Session Concurrency Limit"
          type="number"
          value={config.authentication.sessionConcurrencyLimit}
          onChange={(e) => updateConfig('authentication', 'sessionConcurrencyLimit', parseInt(e.target.value))}
          min="1"
          max="10"
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Password Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.authentication.passwordRequireSpecialChars}
              onChange={(e) => updateConfig('authentication', 'passwordRequireSpecialChars', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require Special Characters</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.authentication.passwordRequireNumbers}
              onChange={(e) => updateConfig('authentication', 'passwordRequireNumbers', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require Numbers</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.authentication.passwordRequireUppercase}
              onChange={(e) => updateConfig('authentication', 'passwordRequireUppercase', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require Uppercase Letters</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.authentication.enableTwoFactor}
              onChange={(e) => updateConfig('authentication', 'enableTwoFactor', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Two-Factor Authentication</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderContentSecuritySettings = () => (
    <div className="space-y-6">
      <label className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={config.contentSecurity.enableCSP}
          onChange={(e) => updateConfig('contentSecurity', 'enableCSP', e.target.checked)}
          className="rounded border-gray-300"
        />
        <span className="text-sm font-medium text-gray-700">Enable Content Security Policy</span>
      </label>

      {config.contentSecurity.enableCSP && (
        <div className="space-y-4">
          <FormInput
            label="Allowed Script Sources"
            type="textarea"
            value={config.contentSecurity.allowedScriptSources.join('\n')}
            onChange={(e) => updateConfig('contentSecurity', 'allowedScriptSources', e.target.value.split('\n').filter(Boolean))}
            placeholder="self\nunsafe-inline\nhttps://trusted-domain.com"
            rows={4}
          />
          <FormInput
            label="Allowed Style Sources"
            type="textarea"
            value={config.contentSecurity.allowedStyleSources.join('\n')}
            onChange={(e) => updateConfig('contentSecurity', 'allowedStyleSources', e.target.value.split('\n').filter(Boolean))}
            placeholder="self\nunsafe-inline"
            rows={3}
          />
          <FormInput
            label="Allowed Image Sources"
            type="textarea"
            value={config.contentSecurity.allowedImageSources.join('\n')}
            onChange={(e) => updateConfig('contentSecurity', 'allowedImageSources', e.target.value.split('\n').filter(Boolean))}
            placeholder="self\ndata:\nhttps:"
            rows={3}
          />
          <FormInput
            label="Allowed Connect Sources"
            type="textarea"
            value={config.contentSecurity.allowedConnectSources.join('\n')}
            onChange={(e) => updateConfig('contentSecurity', 'allowedConnectSources', e.target.value.split('\n').filter(Boolean))}
            placeholder="self\nhttps://api.example.com"
            rows={3}
          />
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.contentSecurity.reportViolations}
              onChange={(e) => updateConfig('contentSecurity', 'reportViolations', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Report CSP Violations</span>
          </label>
        </div>
      )}
    </div>
  );

  const renderDataProtectionSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormInput
          label="Encryption Algorithm"
          type="select"
          value={config.dataProtection.encryptionAlgorithm}
          onChange={(e) => updateConfig('dataProtection', 'encryptionAlgorithm', e.target.value)}
          options={[
            { value: 'AES-256', label: 'AES-256' },
            { value: 'AES-128', label: 'AES-128' },
            { value: 'ChaCha20', label: 'ChaCha20' }
          ]}
        />
        <FormInput
          label="Data Retention (days)"
          type="number"
          value={config.dataProtection.dataRetentionDays}
          onChange={(e) => updateConfig('dataProtection', 'dataRetentionDays', parseInt(e.target.value))}
          min="30"
          max="2555"
        />
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Data Protection Features</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.dataProtection.enableEncryption}
              onChange={(e) => updateConfig('dataProtection', 'enableEncryption', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Data Encryption</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.dataProtection.enableAuditLogging}
              onChange={(e) => updateConfig('dataProtection', 'enableAuditLogging', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Audit Logging</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.dataProtection.enableDataMasking}
              onChange={(e) => updateConfig('dataProtection', 'enableDataMasking', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Data Masking</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.dataProtection.requireExplicitConsent}
              onChange={(e) => updateConfig('dataProtection', 'requireExplicitConsent', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require Explicit Consent</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderAccessControlSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Rate Limiting</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.accessControl.enableRateLimit}
            onChange={(e) => updateConfig('accessControl', 'enableRateLimit', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable Rate Limiting</span>
        </label>
        
        {config.accessControl.enableRateLimit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
            <FormInput
              label="Max Requests"
              type="number"
              value={config.accessControl.rateLimitRequests}
              onChange={(e) => updateConfig('accessControl', 'rateLimitRequests', parseInt(e.target.value))}
              min="10"
              max="1000"
            />
            <FormInput
              label="Time Window (seconds)"
              type="number"
              value={config.accessControl.rateLimitWindow}
              onChange={(e) => updateConfig('accessControl', 'rateLimitWindow', parseInt(e.target.value))}
              min="60"
              max="3600"
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">IP Whitelisting</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.accessControl.enableIPWhitelist}
            onChange={(e) => updateConfig('accessControl', 'enableIPWhitelist', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable IP Whitelisting</span>
        </label>
        
        {config.accessControl.enableIPWhitelist && (
          <div className="pl-6">
            <FormInput
              label="Whitelisted IP Addresses"
              type="textarea"
              value={config.accessControl.whitelistedIPs.join('\n')}
              onChange={(e) => updateConfig('accessControl', 'whitelistedIPs', e.target.value.split('\n').filter(Boolean))}
              placeholder="192.168.1.1\n10.0.0.0/8\n172.16.0.0/12"
              rows={4}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Geolocation Restrictions</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.accessControl.enableGeolocation}
            onChange={(e) => updateConfig('accessControl', 'enableGeolocation', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable Geolocation Restrictions</span>
        </label>
        
        {config.accessControl.enableGeolocation && (
          <div className="pl-6">
            <FormInput
              label="Allowed Countries (ISO codes)"
              type="textarea"
              value={config.accessControl.allowedCountries.join('\n')}
              onChange={(e) => updateConfig('accessControl', 'allowedCountries', e.target.value.split('\n').filter(Boolean))}
              placeholder="US\nCA\nGB\nAU"
              rows={3}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderMonitoringSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={config.monitoring.enableRealTimeAlerts}
            onChange={(e) => updateConfig('monitoring', 'enableRealTimeAlerts', e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Enable Real-time Security Alerts</span>
        </label>

        {config.monitoring.enableRealTimeAlerts && (
          <div className="pl-6 space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Alert Thresholds</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Failed Logins"
                type="number"
                value={config.monitoring.alertThresholds.failedLogins}
                onChange={(e) => updateNestedConfig('monitoring', 'alertThresholds', 'failedLogins', parseInt(e.target.value))}
                min="5"
                max="100"
              />
              <FormInput
                label="Data Access Attempts"
                type="number"
                value={config.monitoring.alertThresholds.dataAccessAttempts}
                onChange={(e) => updateNestedConfig('monitoring', 'alertThresholds', 'dataAccessAttempts', parseInt(e.target.value))}
                min="10"
                max="1000"
              />
              <FormInput
                label="System Errors"
                type="number"
                value={config.monitoring.alertThresholds.systemErrors}
                onChange={(e) => updateNestedConfig('monitoring', 'alertThresholds', 'systemErrors', parseInt(e.target.value))}
                min="3"
                max="50"
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-900">Reporting & Dashboard</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.monitoring.enableSecurityDashboard}
              onChange={(e) => updateConfig('monitoring', 'enableSecurityDashboard', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Security Dashboard</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={config.monitoring.enableComplianceReports}
              onChange={(e) => updateConfig('monitoring', 'enableComplianceReports', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Enable Compliance Reports</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'auth':
        return renderAuthenticationSettings();
      case 'csp':
        return renderContentSecuritySettings();
      case 'data':
        return renderDataProtectionSettings();
      case 'access':
        return renderAccessControlSettings();
      case 'monitoring':
        return renderMonitoringSettings();
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure security policies and access controls
          </p>
          <div className="flex items-center space-x-4 mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isSuperAdmin ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {isSuperAdmin ? 'System Administrator' : 'Organization Administrator'}
            </span>
            <span className="text-xs text-gray-500">
              {hasSystemAccess ? 'Full system access' : 'Organization-scoped access'}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={exportConfiguration}
            leftIcon={<Download className="h-4 w-4" />}
            variant="outline"
          >
            Export Config
          </Button>
          <Button
            onClick={validateConfiguration}
            isLoading={isValidating}
            leftIcon={<CheckCircle className="h-4 w-4" />}
            variant="outline"
          >
            Validate
          </Button>
          <Button
            onClick={saveConfiguration}
            isLoading={isSaving}
            disabled={!hasChanges}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Validation Results */}
      {validationResults && (
        <Card className={`border-l-4 ${
          validationResults.isValid ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {validationResults.isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {validationResults.isValid ? 'Configuration Valid' : 'Security Issues Detected'}
              </span>
            </div>
            {validationResults.issues && validationResults.issues.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {validationResults.issues.map((issue: string, index: number) => (
                  <li key={index} className="text-red-700">• {issue}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const isAccessible = !tab.requiresSystemAccess || hasSystemAccess;
            return (
              <button
                key={tab.id}
                onClick={() => isAccessible && setActiveTab(tab.id as any)}
                disabled={!isAccessible}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : isAccessible
                    ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    : 'border-transparent text-gray-300 cursor-not-allowed'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {!isAccessible && (
                  <Lock className="h-3 w-3 text-gray-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <Card>
        <CardContent className="p-6">
          {renderTabContent()}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button
          onClick={resetToDefaults}
          variant="outline"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Reset to Defaults
        </Button>
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <span className="text-sm text-yellow-600 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              You have unsaved changes
            </span>
          )}
          <Button
            onClick={() => setShowSensitiveData(!showSensitiveData)}
            variant="ghost"
            leftIcon={showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          >
            {showSensitiveData ? 'Hide' : 'Show'} Sensitive Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings;