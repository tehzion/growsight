import React, { useState, useEffect } from 'react';
import { Save, CheckCircle, AlertTriangle, FileText, RefreshCw, Globe, Mail, RotateCcw, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import FormInput from '../ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { useBrandingStore } from '../../stores/brandingStore';
import { useNotificationStore } from '../../stores/notificationStore';

interface OrganizationBrandingProps {
  organizationId?: string;
}

const OrganizationBranding: React.FC<OrganizationBrandingProps> = ({ organizationId }) => {
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const { 
    webBranding, 
    emailBranding, 
    pdfBranding, 
    saveWebBranding, 
    saveEmailBranding, 
    savePdfBranding, 
    loadBranding,
    isLoading,
    error 
  } = useBrandingStore();
  const { addNotification } = useNotificationStore();
  
  const [activeTab, setActiveTab] = useState<'web' | 'pdf' | 'email'>('web');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  
  // Local state for editing
  const [localWebBranding, setLocalWebBranding] = useState(webBranding);
  const [localEmailBranding, setLocalEmailBranding] = useState(emailBranding);
  const [localPdfBranding, setLocalPdfBranding] = useState(pdfBranding);
  
  // Update local state when store data changes
  useEffect(() => {
    setLocalWebBranding(webBranding);
  }, [webBranding]);
  
  useEffect(() => {
    setLocalEmailBranding(emailBranding);
  }, [emailBranding]);
  
  useEffect(() => {
    setLocalPdfBranding(pdfBranding);
  }, [pdfBranding]);

  const isSuperAdmin = user?.role === 'super_admin';
  const isOrgAdmin = user?.role === 'org_admin';
  const targetOrgId = organizationId || user?.organizationId;

  useEffect(() => {
    if (targetOrgId) {
      loadBranding(targetOrgId);
    }
  }, [targetOrgId, loadBranding]);

  // Check if user has permission to view branding
  const canViewBranding = () => {
    if (isSuperAdmin) return true;
    if (isOrgAdmin && user?.organizationId === targetOrgId) return true;
    return false;
  };

  if (!canViewBranding()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view branding settings for this organization.</p>
        </div>
      </div>
    );
  }

  const handleWebBrandingChange = (field: string, value: string | boolean) => {
    // This will be handled by the individual input handlers
  };

  const handleEmailBrandingChange = (field: string, value: string) => {
    // This will be handled by the individual input handlers
  };

  const resetToDefaults = () => {
    if (activeTab === 'web' && targetOrgId) {
      const defaultSettings = {
        primary_color: '#2563EB',
        secondary_color: '#7E22CE',
        accent_color: '#14B8A6',
        company_name: currentOrganization?.name || 'GrowSight',
        font_family: 'Inter',
        button_style: 'rounded',
        dark_mode_enabled: false,
        logo_url: '',
        favicon_url: '',
      };
      saveWebBranding(targetOrgId, defaultSettings);
    } else if (activeTab === 'email' && targetOrgId) {
      const defaultSettings = {
        email_header_color: '#2563EB',
        template_style: 'modern',
        sender_name: currentOrganization?.name || 'GrowSight',
        reply_to_email: 'noreply@example.com',
      };
      saveEmailBranding(targetOrgId, defaultSettings);
    } else if (activeTab === 'pdf' && targetOrgId) {
      const defaultSettings = {
        primary_color: '#2563EB',
        secondary_color: '#7E22CE',
        font_family: 'Helvetica',
        include_watermark: false,
        page_layout: 'portrait',
        include_timestamp: true,
        include_page_numbers: true,
        header_logo_url: '',
        footer_text: `© ${new Date().getFullYear()} ${currentOrganization?.name || 'GrowSight'}. All rights reserved.`,
      };
      savePdfBranding(targetOrgId, defaultSettings);
    }
  };

  const saveWebBrandingSettings = async () => {
    if (!targetOrgId || !localWebBranding) return;
    
    setSaveStatus('saving');
    setSaveMessage('Saving web branding settings...');
    
    try {
      await saveWebBranding(targetOrgId, localWebBranding);
      
      setSaveStatus('saved');
      setSaveMessage('Web branding settings saved successfully!');
      addNotification({
        title: 'Success',
        message: 'Web branding settings saved successfully!',
        type: 'success'
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save web branding:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save web branding settings. Please try again.');
      addNotification({
        title: 'Error',
        message: 'Failed to save web branding settings.',
        type: 'error'
      });
    }
  };

  const savePDFBrandingSettings = async () => {
    if (!targetOrgId || !localPdfBranding) return;
    
    setSaveStatus('saving');
    setSaveMessage('Saving PDF branding settings...');
    
    try {
      await savePdfBranding(targetOrgId, localPdfBranding);
      
      setSaveStatus('saved');
      setSaveMessage('PDF branding settings saved successfully!');
      addNotification({
        title: 'Success',
        message: 'PDF branding settings saved successfully!',
        type: 'success'
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save PDF branding:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save PDF branding settings. Please try again.');
      addNotification({
        title: 'Error',
        message: 'Failed to save PDF branding settings.',
        type: 'error'
      });
    }
  };

  const saveEmailBrandingSettings = async () => {
    if (!targetOrgId || !localEmailBranding) return;
    
    setSaveStatus('saving');
    setSaveMessage('Saving email branding settings...');
    
    try {
      await saveEmailBranding(targetOrgId, localEmailBranding);
      
      setSaveStatus('saved');
      setSaveMessage('Email branding settings saved successfully!');
      addNotification({
        title: 'Success',
        message: 'Email branding settings saved successfully!',
        type: 'success'
      });
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save email branding:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save email branding settings. Please try again.');
      addNotification({
        title: 'Error',
        message: 'Failed to save email branding settings.',
        type: 'error'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Organization Branding</h1>
            <p className="text-sm text-gray-500 mt-1">
              Customize your organization's branding for web interface, PDF exports, and emails
            </p>
          </div>
        </div>
        
        {/* Organization Info */}
        <div className="bg-primary-50 p-4 rounded-lg">
          <div className="flex items-center space-x-3">
            <Building2 className="h-5 w-5 text-primary-600" />
            <div>
              <h3 className="font-medium text-primary-800">
                {currentOrganization?.name || 'Loading...'}
              </h3>
              <p className="text-sm text-primary-700">
                {isSuperAdmin ? 'Super Admin View' : 'Organization Admin View'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('web')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'web'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="h-4 w-4 mr-1" />
            Web Interface
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'pdf'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-1" />
            PDF Exports
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'email'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Mail className="h-4 w-4 mr-1" />
            Email Templates
          </button>
        </nav>
      </div>

      {/* Web Branding Tab */}
      {activeTab === 'web' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Web Interface Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Company Name"
                  value={localWebBranding?.company_name || ''}
                  onChange={(e) => setLocalWebBranding(prev => prev ? { ...prev, company_name: e.target.value } : null)}
                  helperText="Name displayed in the application header and emails"
                />
                
                <FormInput
                  label="Logo URL"
                  value={localWebBranding?.logo_url || ''}
                  onChange={(e) => setLocalWebBranding(prev => prev ? { ...prev, logo_url: e.target.value } : null)}
                  helperText="URL to your company logo (recommended size: 200x60px)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={localWebBranding?.primary_color || '#2563EB'}
                      onChange={(e) => setLocalWebBranding(prev => prev ? { ...prev, primary_color: e.target.value } : null)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={localWebBranding?.primary_color || '#2563EB'}
                      onChange={(e) => setLocalWebBranding(prev => prev ? { ...prev, primary_color: e.target.value } : null)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={webBranding.secondaryColor}
                      onChange={(e) => handleWebBrandingChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={webBranding.secondaryColor}
                      onChange={(e) => handleWebBrandingChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={webBranding.accentColor}
                      onChange={(e) => handleWebBrandingChange('accentColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={webBranding.accentColor}
                      onChange={(e) => handleWebBrandingChange('accentColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Style
                  </label>
                  <select
                    value={webBranding.buttonStyle}
                    onChange={(e) => handleWebBrandingChange('buttonStyle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-pointer"
                  >
                    <option value="rounded">Rounded</option>
                    <option value="pill">Pill</option>
                    <option value="square">Square</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={webBranding.fontFamily}
                    onChange={(e) => handleWebBrandingChange('fontFamily', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-pointer"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Lato">Lato</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                </div>
              </div>

              <FormInput
                label="Email Footer"
                value={webBranding.emailFooter}
                onChange={(e) => handleWebBrandingChange('emailFooter', e.target.value)}
                helperText="Footer text displayed in emails sent from the platform"
                className="opacity-75"
              />

              {/* Preview */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Preview</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`px-3 py-1 text-sm rounded ${
                        previewMode === 'mobile' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Mobile
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`px-3 py-1 text-sm rounded ${
                        previewMode === 'tablet' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Tablet
                    </button>
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`px-3 py-1 text-sm rounded ${
                        previewMode === 'desktop' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      Desktop
                    </button>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className={`mx-auto ${
                    previewMode === 'mobile' ? 'max-w-[375px]' : 
                    previewMode === 'tablet' ? 'max-w-[768px]' : 
                    'w-full'
                  }`}>
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-4" style={{borderBottomColor: webBranding.primaryColor}}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-[100px] h-[30px] bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                            Logo
                          </div>
                          <h3 className="ml-3 font-bold" style={{color: webBranding.primaryColor}}>
                            {webBranding.companyName}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 rounded-full bg-gray-200"></div>
                          {previewMode !== 'mobile' && (
                            <div className="text-sm font-medium">User Name</div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="bg-gray-50 p-6">
                      <div className="max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-4" style={{color: webBranding.primaryColor}}>
                          Welcome to {webBranding.companyName}
                        </h2>
                        <p className="text-gray-600 mb-6">
                          This is how your branded interface will look to users.
                        </p>
                        
                        <div className="space-y-3">
                          <button 
                            className={`
                              px-4 py-2 text-white font-medium rounded-md
                              ${webBranding.buttonStyle === 'rounded' ? 'rounded-md' : 
                                webBranding.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-none'}
                            `}
                            style={{backgroundColor: webBranding.primaryColor}}
                          >
                            Primary Action
                          </button>
                          
                          <button 
                            className={`
                              px-4 py-2 border font-medium rounded-md
                              ${webBranding.buttonStyle === 'rounded' ? 'rounded-md' : 
                                webBranding.buttonStyle === 'pill' ? 'rounded-full' : 'rounded-none'}
                            `}
                            style={{borderColor: webBranding.secondaryColor, color: webBranding.secondaryColor}}
                          >
                            Secondary Action
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Status Message */}
              {saveStatus !== 'idle' && (
                <div className={`p-4 rounded-lg border ${
                  saveStatus === 'saving' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  saveStatus === 'saved' ? 'bg-success-50 border-success-200 text-success-700' :
                  'bg-error-50 border-error-200 text-error-700'
                }`}>
                  <div className="flex items-center">
                    {saveStatus === 'saving' && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    {saveStatus === 'saved' && <CheckCircle className="h-4 w-4 mr-2" />}
                    {saveStatus === 'error' && <AlertTriangle className="h-4 w-4 mr-2" />}
                    <span className="text-sm font-medium">{saveMessage}</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={saveStatus === 'saving'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={saveWebBrandingSettings}
                  disabled={saveStatus === 'saving'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Web Branding'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Branding Tab */}
      {activeTab === 'pdf' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              PDF Export Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Company Name"
                  value={pdfSettings.companyName}
                  onChange={(e) => updatePDFSettings({ companyName: e.target.value })}
                  helperText="Name displayed in PDF headers and footers"
                />
                
                <FormInput
                  label="Logo URL"
                  value={pdfSettings.logoUrl}
                  onChange={(e) => updatePDFSettings({ logoUrl: e.target.value })}
                  helperText="URL to your company logo (recommended size: 200x60px)"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={pdfSettings.primaryColor}
                      onChange={(e) => updatePDFSettings({ primaryColor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pdfSettings.primaryColor}
                      onChange={(e) => updatePDFSettings({ primaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={pdfSettings.secondaryColor}
                      onChange={(e) => updatePDFSettings({ secondaryColor: e.target.value })}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={pdfSettings.secondaryColor}
                      onChange={(e) => updatePDFSettings({ secondaryColor: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <FormInput
                label="Footer Text"
                value={pdfSettings.footerText}
                onChange={(e) => updatePDFSettings({ footerText: e.target.value })}
                helperText="Text displayed at the bottom of PDF pages"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includeTimestamp"
                    checked={pdfSettings.includeTimestamp}
                    onChange={(e) => updatePDFSettings({ includeTimestamp: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="includeTimestamp" className="text-sm font-medium text-gray-700">
                    Include Timestamp
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="includePageNumbers"
                    checked={pdfSettings.includePageNumbers}
                    onChange={(e) => updatePDFSettings({ includePageNumbers: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="includePageNumbers" className="text-sm font-medium text-gray-700">
                    Include Page Numbers
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Template
                </label>
                <select
                  value={pdfSettings.defaultTemplate}
                  onChange={(e) => updatePDFSettings({ defaultTemplate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 cursor-pointer"
                >
                  <option value="standard">Standard</option>
                  <option value="minimal">Minimal</option>
                  <option value="detailed">Detailed</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={saveStatus === 'saving'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={savePDFBrandingSettings}
                  disabled={saveStatus === 'saving'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Save PDF Branding'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Branding Tab */}
      {activeTab === 'email' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="h-5 w-5 mr-2" />
              Email Template Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormInput
                  label="Sender Name"
                  value={emailBranding.senderName}
                  onChange={(e) => handleEmailBrandingChange('senderName', e.target.value)}
                  helperText="Name displayed as the sender in emails"
                />
                
                <FormInput
                  label="Sender Email"
                  value={emailBranding.senderEmail}
                  onChange={(e) => handleEmailBrandingChange('senderEmail', e.target.value)}
                  helperText="Email address used as the sender"
                />
              </div>

              <FormInput
                label="Email Header"
                value={emailBranding.emailHeader}
                onChange={(e) => handleEmailBrandingChange('emailHeader', e.target.value)}
                helperText="Header text displayed in email templates"
              />

              <FormInput
                label="Email Footer"
                value={emailBranding.emailFooter}
                onChange={(e) => handleEmailBrandingChange('emailFooter', e.target.value)}
                helperText="Footer text displayed in email templates"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={emailBranding.primaryColor}
                      onChange={(e) => handleEmailBrandingChange('primaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailBranding.primaryColor}
                      onChange={(e) => handleEmailBrandingChange('primaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={emailBranding.secondaryColor}
                      onChange={(e) => handleEmailBrandingChange('secondaryColor', e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={emailBranding.secondaryColor}
                      onChange={(e) => handleEmailBrandingChange('secondaryColor', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Email Preview */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Preview</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-white p-6">
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h2 className="text-xl font-bold" style={{color: emailBranding.primaryColor}}>
                        {emailBranding.emailHeader}
                      </h2>
                    </div>
                    
                    <div className="prose max-w-none">
                      <p className="text-gray-600 mb-4">
                        This is a sample email showing how your branded emails will appear to recipients.
                      </p>
                      
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h3 className="font-medium mb-2" style={{color: emailBranding.primaryColor}}>
                          Sample Content
                        </h3>
                        <p className="text-sm text-gray-600">
                          Your email content will be displayed here with your chosen branding colors and styling.
                        </p>
                      </div>
                      
                      <button 
                        className="px-6 py-2 text-white font-medium rounded-md"
                        style={{backgroundColor: emailBranding.primaryColor}}
                      >
                        Call to Action
                      </button>
                    </div>
                    
                    <div className="border-t border-gray-200 mt-6 pt-4 text-center text-sm text-gray-500">
                      {emailBranding.emailFooter}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={resetToDefaults}
                  disabled={saveStatus === 'saving'}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button
                  onClick={saveEmailBrandingSettings}
                  disabled={saveStatus === 'saving'}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Email Branding'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OrganizationBranding;