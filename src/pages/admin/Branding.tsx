import React, { useState, useEffect } from 'react';
import { Palette, Save, CheckCircle, AlertTriangle, Image, Upload, FileText, Eye, EyeOff, RefreshCw, Building2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import FormInput from '../../components/ui/FormInput';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { usePDFExportStore } from '../../stores/pdfExportStore';
import PDFBrandingSettings from '../../components/ui/PDFBrandingSettings';

const Branding: React.FC = () => {
  const { user } = useAuthStore();
  const { organizations, currentOrganization, fetchOrganizations } = useOrganizationStore();
  const { pdfSettings, updatePDFSettings } = usePDFExportStore();
  
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrganization?.id || '');
  
  const [activeTab, setActiveTab] = useState<'pdf' | 'web'>('pdf');
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  
  const [webBranding, setWebBranding] = useState({
    logoUrl: '',
    favicon: '',
    primaryColor: '#2563EB',
    secondaryColor: '#7E22CE',
    accentColor: '#14B8A6',
    companyName: currentOrganization?.name || '360° Feedback Platform',
    emailFooter: `© ${new Date().getFullYear()} ${currentOrganization?.name || '360° Feedback Platform'}. All rights reserved.`,
    fontFamily: 'Inter',
    buttonStyle: 'rounded',
    darkMode: false
  });

  const isSuperAdmin = user?.role === 'super_admin';
  const selectedOrg = organizations.find(org => org.id === selectedOrgId);

  useEffect(() => {
    // Fetch organizations for super admin
    if (isSuperAdmin) {
      fetchOrganizations();
    }
  }, [isSuperAdmin, fetchOrganizations]);

  useEffect(() => {
    // Initialize web branding with PDF settings for consistency
    setWebBranding(prev => ({
      ...prev,
      logoUrl: pdfSettings.logoUrl || '',
      primaryColor: pdfSettings.primaryColor,
      secondaryColor: pdfSettings.secondaryColor,
      companyName: selectedOrg?.name || pdfSettings.companyName
    }));
  }, [pdfSettings, selectedOrg]);

  // Redirect if not super admin
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-warning-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Only super administrators can access branding settings.</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (activeTab === 'pdf') {
        // PDF branding is handled by the PDFBrandingSettings component
        // But we can also update web branding for consistency
        setWebBranding(prev => ({
          ...prev,
          logoUrl: pdfSettings.logoUrl || '',
          primaryColor: pdfSettings.primaryColor,
          secondaryColor: pdfSettings.secondaryColor,
          companyName: pdfSettings.companyName
        }));
      } else {
        // Save web branding settings
        console.log('Saving web branding settings:', webBranding);
        // In a real implementation, this would save to database
        
        // Update PDF settings for consistency
        updatePDFSettings({
          logoUrl: webBranding.logoUrl,
          companyName: webBranding.companyName,
          primaryColor: webBranding.primaryColor,
          secondaryColor: webBranding.secondaryColor
        });
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Failed to save branding settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWebBrandingChange = (field: keyof typeof webBranding, value: string | boolean) => {
    setWebBranding(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Branding Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Customize PDF and web branding for organizations
            </p>
          </div>
        </div>
        
        {/* Organization Selector for Super Admin */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Organization
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select an organization...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedOrgId && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (activeTab === 'pdf') {
                    // Reset PDF settings to defaults
                    updatePDFSettings({
                      logoUrl: '',
                      companyName: selectedOrg?.name || '360° Feedback Platform',
                      primaryColor: '#2563EB',
                      secondaryColor: '#7E22CE',
                      footerText: `© ${new Date().getFullYear()} ${selectedOrg?.name || '360° Feedback Platform'}. All rights reserved.`,
                      includeTimestamp: true,
                      includePageNumbers: true,
                      defaultTemplate: 'standard'
                    });
                  } else {
                    // Reset web branding to defaults
                    setWebBranding({
                      logoUrl: '',
                      favicon: '',
                      primaryColor: '#2563EB',
                      secondaryColor: '#7E22CE',
                      accentColor: '#14B8A6',
                      companyName: selectedOrg?.name || '360° Feedback Platform',
                      emailFooter: `© ${new Date().getFullYear()} ${selectedOrg?.name || '360° Feedback Platform'}. All rights reserved.`,
                      fontFamily: 'Inter',
                      buttonStyle: 'rounded',
                      darkMode: false
                    });
                  }
                }}
                leftIcon={<RefreshCw className="h-4 w-4" />}
              >
                Reset to Defaults
              </Button>
              <Button
                onClick={handleSave}
                isLoading={isLoading}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Changes
              </Button>
            </div>
          </div>

      {/* Status Messages */}
      {saveStatus === 'saved' && (
        <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Branding settings saved successfully!
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          Failed to save branding settings. Please try again.
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pdf')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'pdf'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-1" />
            PDF Branding
          </button>
          <button
            onClick={() => setActiveTab('web')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'web'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Palette className="h-4 w-4 mr-1" />
            Web Branding
          </button>
        </nav>
      </div>

      {/* PDF Branding Tab */}
      {activeTab === 'pdf' && (
        <PDFBrandingSettings onSave={handleSave} />
      )}

      {/* Web Branding Tab */}
      {activeTab === 'web' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="h-5 w-5 mr-2" />
              Web Interface Branding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={webBranding.companyName}
                    onChange={(e) => handleWebBrandingChange('companyName', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Name displayed in the application header and emails
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={webBranding.logoUrl}
                      onChange={(e) => handleWebBrandingChange('logoUrl', e.target.value)}
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="https://example.com/logo.png"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 shadow-sm text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    URL to your company logo (recommended size: 200x60px)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
                      style={{ backgroundColor: webBranding.primaryColor }}
                      onClick={() => setShowColorPicker(showColorPicker === 'primary' ? null : 'primary')}
                    ></div>
                    <input
                      type="text"
                      value={webBranding.primaryColor}
                      onChange={(e) => handleWebBrandingChange('primaryColor', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  {showColorPicker === 'primary' && (
                    <div className="absolute z-10 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                      <div className="grid grid-cols-6 gap-2">
                        {['#2563EB', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#14B8A6', '#6366F1', '#8B5CF6', '#A855F7', '#000000', '#4B5563'].map(color => (
                          <div
                            key={color}
                            className="h-6 w-6 rounded-full cursor-pointer border border-gray-300"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              handleWebBrandingChange('primaryColor', color);
                              setShowColorPicker(null);
                            }}
                          ></div>
                        ))}
                      </div>
                      <input
                        type="color"
                        value={webBranding.primaryColor}
                        onChange={(e) => handleWebBrandingChange('primaryColor', e.target.value)}
                        className="mt-2 w-full h-8"
                      />
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Main brand color for buttons, links, and highlights
                  </p>
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
                      style={{ backgroundColor: webBranding.secondaryColor }}
                      onClick={() => setShowColorPicker(showColorPicker === 'secondary' ? null : 'secondary')}
                    ></div>
                    <input
                      type="text"
                      value={webBranding.secondaryColor}
                      onChange={(e) => handleWebBrandingChange('secondaryColor', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  {showColorPicker === 'secondary' && (
                    <div className="absolute z-10 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                      <div className="grid grid-cols-6 gap-2">
                        {['#2563EB', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#14B8A6', '#6366F1', '#8B5CF6', '#A855F7', '#000000', '#4B5563'].map(color => (
                          <div
                            key={color}
                            className="h-6 w-6 rounded-full cursor-pointer border border-gray-300"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              handleWebBrandingChange('secondaryColor', color);
                              setShowColorPicker(null);
                            }}
                          ></div>
                        ))}
                      </div>
                      <input
                        type="color"
                        value={webBranding.secondaryColor}
                        onChange={(e) => handleWebBrandingChange('secondaryColor', e.target.value)}
                        className="mt-2 w-full h-8"
                      />
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Used for secondary elements and accents
                  </p>
                </div>
                
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="h-10 w-10 border border-gray-300 rounded cursor-pointer"
                      style={{ backgroundColor: webBranding.accentColor }}
                      onClick={() => setShowColorPicker(showColorPicker === 'accent' ? null : 'accent')}
                    ></div>
                    <input
                      type="text"
                      value={webBranding.accentColor}
                      onChange={(e) => handleWebBrandingChange('accentColor', e.target.value)}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                  {showColorPicker === 'accent' && (
                    <div className="absolute z-10 mt-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                      <div className="grid grid-cols-6 gap-2">
                        {['#2563EB', '#7C3AED', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#14B8A6', '#6366F1', '#8B5CF6', '#A855F7', '#000000', '#4B5563'].map(color => (
                          <div
                            key={color}
                            className="h-6 w-6 rounded-full cursor-pointer border border-gray-300"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              handleWebBrandingChange('accentColor', color);
                              setShowColorPicker(null);
                            }}
                          ></div>
                        ))}
                      </div>
                      <input
                        type="color"
                        value={webBranding.accentColor}
                        onChange={(e) => handleWebBrandingChange('accentColor', e.target.value)}
                        className="mt-2 w-full h-8"
                      />
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Used for tertiary elements and special highlights
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Footer Text
                  </label>
                  <input
                    type="text"
                    value={webBranding.emailFooter}
                    onChange={(e) => handleWebBrandingChange('emailFooter', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Text displayed in the footer of all email communications
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Favicon URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={webBranding.favicon}
                      onChange={(e) => handleWebBrandingChange('favicon', e.target.value)}
                      className="flex-1 rounded-l-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      placeholder="https://example.com/favicon.ico"
                    />
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 shadow-sm text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <Image className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    URL to your favicon (recommended size: 32x32px)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={webBranding.fontFamily}
                    onChange={(e) => handleWebBrandingChange('fontFamily', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="Inter">Inter (Default)</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Open Sans">Open Sans</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Poppins">Poppins</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Primary font used throughout the application
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Style
                  </label>
                  <select
                    value={webBranding.buttonStyle}
                    onChange={(e) => handleWebBrandingChange('buttonStyle', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="rounded">Rounded (Default)</option>
                    <option value="pill">Pill Shaped</option>
                    <option value="square">Square</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Style applied to buttons throughout the application
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={webBranding.darkMode}
                    onChange={(e) => handleWebBrandingChange('darkMode', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">Enable Dark Mode Option</span>
                </label>
                <p className="mt-1 text-xs text-gray-500 ml-6">
                  Allow users to switch between light and dark mode
                </p>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Branding Preview</h3>
                  <div className="flex space-x-2 bg-gray-100 p-1 rounded-lg">
                    <button
                      className={`px-3 py-1 text-xs rounded-md ${previewMode === 'desktop' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                      onClick={() => setPreviewMode('desktop')}
                    >
                      Desktop
                    </button>
                    <button
                      className={`px-3 py-1 text-xs rounded-md ${previewMode === 'tablet' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                      onClick={() => setPreviewMode('tablet')}
                    >
                      Tablet
                    </button>
                    <button
                      className={`px-3 py-1 text-xs rounded-md ${previewMode === 'mobile' ? 'bg-white shadow-sm' : 'text-gray-600'}`}
                      onClick={() => setPreviewMode('mobile')}
                    >
                      Mobile
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
                    <div className="p-6 bg-gray-50" style={{fontFamily: webBranding.fontFamily}}>
                      <div className="max-w-md mx-auto">
                        <h2 className="text-xl font-bold mb-4" style={{color: webBranding.primaryColor}}>
                          Sample Dashboard
                        </h2>
                        
                        <div className="space-y-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-2" style={{color: webBranding.secondaryColor}}>
                              Assessment Progress
                            </h3>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                              <div className="h-2.5 rounded-full" style={{width: '70%', backgroundColor: webBranding.primaryColor}}></div>
                            </div>
                            <div className="text-sm text-gray-600">
                              7 of 10 assessments completed
                            </div>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            <h3 className="font-medium mb-2" style={{color: webBranding.secondaryColor}}>
                              Recent Activity
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: webBranding.accentColor}}></div>
                                <span>New assessment assigned</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: webBranding.accentColor}}></div>
                                <span>Feedback submitted by John</span>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            className={`w-full py-2 px-4 text-white font-medium ${
                              webBranding.buttonStyle === 'rounded' ? 'rounded-md' :
                              webBranding.buttonStyle === 'pill' ? 'rounded-full' :
                              'rounded-none'
                            }`}
                            style={{backgroundColor: webBranding.primaryColor}}
                          >
                            Sample Button
                          </button>
                          
                          <div className="flex space-x-2">
                            <button 
                              className={`flex-1 py-2 px-4 text-white font-medium ${
                                webBranding.buttonStyle === 'rounded' ? 'rounded-md' :
                                webBranding.buttonStyle === 'pill' ? 'rounded-full' :
                                'rounded-none'
                              }`}
                              style={{backgroundColor: webBranding.secondaryColor}}
                            >
                              Secondary
                            </button>
                            <button 
                              className={`flex-1 py-2 px-4 text-white font-medium ${
                                webBranding.buttonStyle === 'rounded' ? 'rounded-md' :
                                webBranding.buttonStyle === 'pill' ? 'rounded-full' :
                                'rounded-none'
                              }`}
                              style={{backgroundColor: webBranding.accentColor}}
                            >
                              Accent
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-gray-100 p-4 text-center text-sm text-gray-500">
                      {webBranding.emailFooter}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization-specific notice for Super Admin */}
              <div className="bg-primary-50 p-4 rounded-lg border border-primary-200 mt-6">
                <div className="flex items-start">
                  <AlertTriangle className="h-5 w-5 text-primary-600 mt-0.5 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-primary-800">Organization Branding</h4>
                    <p className="text-sm text-primary-700 mt-1">
                      These branding settings will apply to <strong>{selectedOrg?.name}</strong> and all its users.
                    </p>
                    <p className="text-sm text-primary-700 mt-1">
                      Changes will affect both the web interface and PDF exports for this organization.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      )}

      {!selectedOrgId && (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Organization</h3>
          <p className="text-gray-600">Choose an organization to customize its PDF and web branding settings.</p>
        </div>
      )}
    </div>
  );
};

export default Branding;