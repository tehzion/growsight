import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Loader2, Upload, Eye, EyeOff, Palette, Type, Mail, FileText } from 'lucide-react';

interface WebBrandingSettings {
  id?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  company_name: string;
  email_footer?: string;
  font_family: string;
  button_style: string;
  dark_mode: boolean;
}

interface EmailBrandingSettings {
  id?: string;
  sender_name: string;
  sender_email: string;
  email_header?: string;
  email_footer?: string;
  primary_color: string;
  secondary_color: string;
  logo_url?: string;
}

interface PdfBrandingSettings {
  id?: string;
  logo_url?: string;
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  footer_text?: string;
  include_timestamp: boolean;
  include_page_numbers: boolean;
  default_template: string;
  font_family: string;
  button_style: string;
}

interface BrandingFormErrors {
  web?: Partial<WebBrandingSettings>;
  email?: Partial<EmailBrandingSettings>;
  pdf?: Partial<PdfBrandingSettings>;
}

export default function OrganizationBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('web');

  // Form states
  const [webSettings, setWebSettings] = useState<WebBrandingSettings>({
    primary_color: '#2563EB',
    secondary_color: '#7E22CE',
    accent_color: '#14B8A6',
    company_name: '',
    font_family: 'Inter',
    button_style: 'rounded',
    dark_mode: false,
  });

  const [emailSettings, setEmailSettings] = useState<EmailBrandingSettings>({
    sender_name: '',
    sender_email: '',
    primary_color: '#2563EB',
    secondary_color: '#7E22CE',
  });

  const [pdfSettings, setPdfSettings] = useState<PdfBrandingSettings>({
    company_name: '',
    primary_color: '#2563EB',
    secondary_color: '#7E22CE',
    accent_color: '#14B8A6',
    include_timestamp: true,
    include_page_numbers: true,
    default_template: 'modern',
    font_family: 'Inter',
    button_style: 'rounded',
  });

  const [errors, setErrors] = useState<BrandingFormErrors>({});
  const [previewMode, setPreviewMode] = useState(false);

  // Load existing branding settings
  useEffect(() => {
    loadBrandingSettings();
  }, [user?.organization_id]);

  const loadBrandingSettings = async () => {
    if (!user?.organization_id) return;

    try {
      setLoading(true);

      // Load web branding settings
      const { data: webData, error: webError } = await supabase
        .from('web_branding_settings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .single();

      if (webError && webError.code !== 'PGRST116') {
        console.error('Error loading web branding:', webError);
      } else if (webData) {
        setWebSettings(prev => ({ ...prev, ...webData }));
      }

      // Load email branding settings
      const { data: emailData, error: emailError } = await supabase
        .from('email_branding_settings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .single();

      if (emailError && emailError.code !== 'PGRST116') {
        console.error('Error loading email branding:', emailError);
      } else if (emailData) {
        setEmailSettings(prev => ({ ...prev, ...emailData }));
      }

      // Load PDF branding settings
      const { data: pdfData, error: pdfError } = await supabase
        .from('pdf_branding_settings')
        .select('*')
        .eq('organization_id', user.organization_id)
        .single();

      if (pdfError && pdfError.code !== 'PGRST116') {
        console.error('Error loading PDF branding:', pdfError);
      } else if (pdfData) {
        setPdfSettings(prev => ({ ...prev, ...pdfData }));
      }

    } catch (error) {
      console.error('Error loading branding settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load branding settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateWebSettings = (): boolean => {
    const newErrors: Partial<WebBrandingSettings> = {};

    if (!webSettings.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!webSettings.primary_color || !isValidColor(webSettings.primary_color)) {
      newErrors.primary_color = 'Valid primary color is required';
    }

    if (!webSettings.secondary_color || !isValidColor(webSettings.secondary_color)) {
      newErrors.secondary_color = 'Valid secondary color is required';
    }

    if (!webSettings.accent_color || !isValidColor(webSettings.accent_color)) {
      newErrors.accent_color = 'Valid accent color is required';
    }

    if (webSettings.logo_url && !isValidUrl(webSettings.logo_url)) {
      newErrors.logo_url = 'Valid logo URL is required';
    }

    if (webSettings.favicon_url && !isValidUrl(webSettings.favicon_url)) {
      newErrors.favicon_url = 'Valid favicon URL is required';
    }

    setErrors(prev => ({ ...prev, web: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateEmailSettings = (): boolean => {
    const newErrors: Partial<EmailBrandingSettings> = {};

    if (!emailSettings.sender_name.trim()) {
      newErrors.sender_name = 'Sender name is required';
    }

    if (!emailSettings.sender_email.trim()) {
      newErrors.sender_email = 'Sender email is required';
    } else if (!isValidEmail(emailSettings.sender_email)) {
      newErrors.sender_email = 'Valid email address is required';
    }

    if (!emailSettings.primary_color || !isValidColor(emailSettings.primary_color)) {
      newErrors.primary_color = 'Valid primary color is required';
    }

    if (!emailSettings.secondary_color || !isValidColor(emailSettings.secondary_color)) {
      newErrors.secondary_color = 'Valid secondary color is required';
    }

    if (emailSettings.logo_url && !isValidUrl(emailSettings.logo_url)) {
      newErrors.logo_url = 'Valid logo URL is required';
    }

    setErrors(prev => ({ ...prev, email: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validatePdfSettings = (): boolean => {
    const newErrors: Partial<PdfBrandingSettings> = {};

    if (!pdfSettings.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    if (!pdfSettings.primary_color || !isValidColor(pdfSettings.primary_color)) {
      newErrors.primary_color = 'Valid primary color is required';
    }

    if (!pdfSettings.secondary_color || !isValidColor(pdfSettings.secondary_color)) {
      newErrors.secondary_color = 'Valid secondary color is required';
    }

    if (!pdfSettings.accent_color || !isValidColor(pdfSettings.accent_color)) {
      newErrors.accent_color = 'Valid accent color is required';
    }

    if (pdfSettings.logo_url && !isValidUrl(pdfSettings.logo_url)) {
      newErrors.logo_url = 'Valid logo URL is required';
    }

    setErrors(prev => ({ ...prev, pdf: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  // Utility validation functions
  const isValidColor = (color: string): boolean => {
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    return colorRegex.test(color);
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Save functions
  const saveWebBranding = async () => {
    if (!user?.organization_id) return;

    if (!validateWebSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('web_branding_settings')
        .upsert({
          organization_id: user.organization_id,
          ...webSettings,
          created_by_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Web branding settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving web branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save web branding settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveEmailBranding = async () => {
    if (!user?.organization_id) return;

    if (!validateEmailSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('email_branding_settings')
        .upsert({
          organization_id: user.organization_id,
          ...emailSettings,
          created_by_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Email branding settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving email branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save email branding settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const savePdfBranding = async () => {
    if (!user?.organization_id) return;

    if (!validatePdfSettings()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('pdf_branding_settings')
        .upsert({
          organization_id: user.organization_id,
          ...pdfSettings,
          created_by_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'PDF branding settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving PDF branding:', error);
      toast({
        title: 'Error',
        description: 'Failed to save PDF branding settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveAllBranding = async () => {
    if (!user?.organization_id) return;

    // Validate all forms
    const webValid = validateWebSettings();
    const emailValid = validateEmailSettings();
    const pdfValid = validatePdfSettings();

    if (!webValid || !emailValid || !pdfValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix all errors before saving',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      // Save all branding settings in parallel
      const [webResult, emailResult, pdfResult] = await Promise.allSettled([
        supabase
          .from('web_branding_settings')
          .upsert({
            organization_id: user.organization_id,
            ...webSettings,
            created_by_id: user.id,
          }),
        supabase
          .from('email_branding_settings')
          .upsert({
            organization_id: user.organization_id,
            ...emailSettings,
            created_by_id: user.id,
          }),
        supabase
          .from('pdf_branding_settings')
          .upsert({
            organization_id: user.organization_id,
            ...pdfSettings,
            created_by_id: user.id,
          }),
      ]);

      // Check for errors
      const errors = [];
      if (webResult.status === 'rejected' || webResult.value.error) {
        errors.push('Web branding');
      }
      if (emailResult.status === 'rejected' || emailResult.value.error) {
        errors.push('Email branding');
      }
      if (pdfResult.status === 'rejected' || pdfResult.value.error) {
        errors.push('PDF branding');
      }

      if (errors.length > 0) {
        throw new Error(`Failed to save: ${errors.join(', ')}`);
      }

      toast({
        title: 'Success',
        description: 'All branding settings saved successfully',
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save some branding settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview email template
  const previewEmailTemplate = () => {
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailSettings.sender_name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { background-color: ${emailSettings.primary_color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background-color: ${emailSettings.secondary_color}; color: white; padding: 20px; text-align: center; }
          .logo { max-width: 200px; height: auto; }
        </style>
      </head>
      <body>
        <div class="header">
          ${emailSettings.logo_url ? `<img src="${emailSettings.logo_url}" alt="Logo" class="logo">` : ''}
          <h1>${emailSettings.email_header || 'Welcome to Our Platform'}</h1>
        </div>
        <div class="content">
          <h2>Sample Email Content</h2>
          <p>This is a preview of how your branded emails will look. The colors, logo, and styling will be applied to all emails sent from your organization.</p>
          <p>You can customize the header text, footer text, and colors to match your brand identity.</p>
        </div>
        <div class="footer">
          <p>${emailSettings.email_footer || '© 2024 Your Organization. All rights reserved.'}</p>
        </div>
      </body>
      </html>
    `;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(template);
      newWindow.document.close();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading branding settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Branding</h1>
          <p className="text-muted-foreground">
            Customize your organization's branding for web interface, PDF reports, and email templates.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {previewMode ? 'Hide Preview' : 'Show Preview'}
          </Button>
          <Button
            onClick={saveAllBranding}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save All Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="web" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Web Interface
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF Reports
          </TabsTrigger>
        </TabsList>

        {/* Web Interface Branding */}
        <TabsContent value="web" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Web Interface Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="web-company-name">Company Name *</Label>
                    <Input
                      id="web-company-name"
                      value={webSettings.company_name}
                      onChange={(e) => setWebSettings(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                      className={errors.web?.company_name ? 'border-red-500' : ''}
                    />
                    {errors.web?.company_name && (
                      <p className="text-sm text-red-500">{errors.web.company_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="web-logo-url">Logo URL</Label>
                    <Input
                      id="web-logo-url"
                      value={webSettings.logo_url || ''}
                      onChange={(e) => setWebSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://example.com/logo.png"
                      className={errors.web?.logo_url ? 'border-red-500' : ''}
                    />
                    {errors.web?.logo_url && (
                      <p className="text-sm text-red-500">{errors.web.logo_url}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="web-favicon-url">Favicon URL</Label>
                    <Input
                      id="web-favicon-url"
                      value={webSettings.favicon_url || ''}
                      onChange={(e) => setWebSettings(prev => ({ ...prev, favicon_url: e.target.value }))}
                      placeholder="https://example.com/favicon.ico"
                      className={errors.web?.favicon_url ? 'border-red-500' : ''}
                    />
                    {errors.web?.favicon_url && (
                      <p className="text-sm text-red-500">{errors.web.favicon_url}</p>
                    )}
                  </div>
                </div>

                {/* Color Scheme */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Color Scheme</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="web-primary-color">Primary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="web-primary-color"
                        value={webSettings.primary_color}
                        onChange={(e) => setWebSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#2563EB"
                        className={errors.web?.primary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: webSettings.primary_color }}
                      />
                    </div>
                    {errors.web?.primary_color && (
                      <p className="text-sm text-red-500">{errors.web.primary_color}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="web-secondary-color">Secondary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="web-secondary-color"
                        value={webSettings.secondary_color}
                        onChange={(e) => setWebSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#7E22CE"
                        className={errors.web?.secondary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: webSettings.secondary_color }}
                      />
                    </div>
                    {errors.web?.secondary_color && (
                      <p className="text-sm text-red-500">{errors.web.secondary_color}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="web-accent-color">Accent Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="web-accent-color"
                        value={webSettings.accent_color}
                        onChange={(e) => setWebSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                        placeholder="#14B8A6"
                        className={errors.web?.accent_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: webSettings.accent_color }}
                      />
                    </div>
                    {errors.web?.accent_color && (
                      <p className="text-sm text-red-500">{errors.web.accent_color}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Typography & Style */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="web-font-family">Font Family</Label>
                  <Select
                    value={webSettings.font_family}
                    onValueChange={(value) => setWebSettings(prev => ({ ...prev, font_family: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="web-button-style">Button Style</Label>
                  <Select
                    value={webSettings.button_style}
                    onValueChange={(value) => setWebSettings(prev => ({ ...prev, button_style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="sharp">Sharp</SelectItem>
                      <SelectItem value="pill">Pill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="web-dark-mode">Dark Mode</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="web-dark-mode"
                      checked={webSettings.dark_mode}
                      onCheckedChange={(checked) => setWebSettings(prev => ({ ...prev, dark_mode: checked }))}
                    />
                    <Label htmlFor="web-dark-mode">Enable dark mode</Label>
                  </div>
                </div>
              </div>

              {/* Email Footer */}
              <div className="space-y-2">
                <Label htmlFor="web-email-footer">Email Footer Text</Label>
                <Textarea
                  id="web-email-footer"
                  value={webSettings.email_footer || ''}
                  onChange={(e) => setWebSettings(prev => ({ ...prev, email_footer: e.target.value }))}
                  placeholder="© 2024 Your Company. All rights reserved."
                  rows={3}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={saveWebBranding} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Web Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Branding */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Template Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sender Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sender Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-sender-name">Sender Name *</Label>
                    <Input
                      id="email-sender-name"
                      value={emailSettings.sender_name}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_name: e.target.value }))}
                      placeholder="Your Company Name"
                      className={errors.email?.sender_name ? 'border-red-500' : ''}
                    />
                    {errors.email?.sender_name && (
                      <p className="text-sm text-red-500">{errors.email.sender_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-sender-email">Sender Email *</Label>
                    <Input
                      id="email-sender-email"
                      type="email"
                      value={emailSettings.sender_email}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_email: e.target.value }))}
                      placeholder="noreply@yourcompany.com"
                      className={errors.email?.sender_email ? 'border-red-500' : ''}
                    />
                    {errors.email?.sender_email && (
                      <p className="text-sm text-red-500">{errors.email.sender_email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-logo-url">Email Logo URL</Label>
                    <Input
                      id="email-logo-url"
                      value={emailSettings.logo_url || ''}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://example.com/email-logo.png"
                      className={errors.email?.logo_url ? 'border-red-500' : ''}
                    />
                    {errors.email?.logo_url && (
                      <p className="text-sm text-red-500">{errors.email.logo_url}</p>
                    )}
                  </div>
                </div>

                {/* Email Colors */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Email Colors</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email-primary-color">Primary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-primary-color"
                        value={emailSettings.primary_color}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#2563EB"
                        className={errors.email?.primary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: emailSettings.primary_color }}
                      />
                    </div>
                    {errors.email?.primary_color && (
                      <p className="text-sm text-red-500">{errors.email.primary_color}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-secondary-color">Secondary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-secondary-color"
                        value={emailSettings.secondary_color}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#7E22CE"
                        className={errors.email?.secondary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: emailSettings.secondary_color }}
                      />
                    </div>
                    {errors.email?.secondary_color && (
                      <p className="text-sm text-red-500">{errors.email.secondary_color}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Email Content */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Email Content</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="email-header">Email Header Text</Label>
                  <Input
                    id="email-header"
                    value={emailSettings.email_header || ''}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, email_header: e.target.value }))}
                    placeholder="Welcome to Your Company"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-footer">Email Footer Text</Label>
                  <Textarea
                    id="email-footer"
                    value={emailSettings.email_footer || ''}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, email_footer: e.target.value }))}
                    placeholder="© 2024 Your Company. All rights reserved."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={previewEmailTemplate}>
                  Preview Email Template
                </Button>
                <Button onClick={saveEmailBranding} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Email Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PDF Reports Branding */}
        <TabsContent value="pdf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF Report Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Company Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pdf-company-name">Company Name *</Label>
                    <Input
                      id="pdf-company-name"
                      value={pdfSettings.company_name}
                      onChange={(e) => setPdfSettings(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                      className={errors.pdf?.company_name ? 'border-red-500' : ''}
                    />
                    {errors.pdf?.company_name && (
                      <p className="text-sm text-red-500">{errors.pdf.company_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-logo-url">PDF Logo URL</Label>
                    <Input
                      id="pdf-logo-url"
                      value={pdfSettings.logo_url || ''}
                      onChange={(e) => setPdfSettings(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="https://example.com/pdf-logo.png"
                      className={errors.pdf?.logo_url ? 'border-red-500' : ''}
                    />
                    {errors.pdf?.logo_url && (
                      <p className="text-sm text-red-500">{errors.pdf.logo_url}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-footer-text">Footer Text</Label>
                    <Textarea
                      id="pdf-footer-text"
                      value={pdfSettings.footer_text || ''}
                      onChange={(e) => setPdfSettings(prev => ({ ...prev, footer_text: e.target.value }))}
                      placeholder="© 2024 Your Company. All rights reserved."
                      rows={3}
                    />
                  </div>
                </div>

                {/* PDF Colors */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">PDF Colors</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pdf-primary-color">Primary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="pdf-primary-color"
                        value={pdfSettings.primary_color}
                        onChange={(e) => setPdfSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                        placeholder="#2563EB"
                        className={errors.pdf?.primary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: pdfSettings.primary_color }}
                      />
                    </div>
                    {errors.pdf?.primary_color && (
                      <p className="text-sm text-red-500">{errors.pdf.primary_color}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-secondary-color">Secondary Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="pdf-secondary-color"
                        value={pdfSettings.secondary_color}
                        onChange={(e) => setPdfSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                        placeholder="#7E22CE"
                        className={errors.pdf?.secondary_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: pdfSettings.secondary_color }}
                      />
                    </div>
                    {errors.pdf?.secondary_color && (
                      <p className="text-sm text-red-500">{errors.pdf.secondary_color}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pdf-accent-color">Accent Color *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="pdf-accent-color"
                        value={pdfSettings.accent_color}
                        onChange={(e) => setPdfSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                        placeholder="#14B8A6"
                        className={errors.pdf?.accent_color ? 'border-red-500' : ''}
                      />
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: pdfSettings.accent_color }}
                      />
                    </div>
                    {errors.pdf?.accent_color && (
                      <p className="text-sm text-red-500">{errors.pdf.accent_color}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* PDF Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="pdf-font-family">Font Family</Label>
                  <Select
                    value={pdfSettings.font_family}
                    onValueChange={(value) => setPdfSettings(prev => ({ ...prev, font_family: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Poppins">Poppins</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdf-button-style">Button Style</Label>
                  <Select
                    value={pdfSettings.button_style}
                    onValueChange={(value) => setPdfSettings(prev => ({ ...prev, button_style: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rounded">Rounded</SelectItem>
                      <SelectItem value="sharp">Sharp</SelectItem>
                      <SelectItem value="pill">Pill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pdf-default-template">Default Template</Label>
                  <Select
                    value={pdfSettings.default_template}
                    onValueChange={(value) => setPdfSettings(prev => ({ ...prev, default_template: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modern">Modern</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="minimal">Minimal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* PDF Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">PDF Options</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pdf-include-timestamp"
                      checked={pdfSettings.include_timestamp}
                      onCheckedChange={(checked) => setPdfSettings(prev => ({ ...prev, include_timestamp: checked }))}
                    />
                    <Label htmlFor="pdf-include-timestamp">Include timestamp in reports</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pdf-include-page-numbers"
                      checked={pdfSettings.include_page_numbers}
                      onCheckedChange={(checked) => setPdfSettings(prev => ({ ...prev, include_page_numbers: checked }))}
                    />
                    <Label htmlFor="pdf-include-page-numbers">Include page numbers</Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={savePdfBranding} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save PDF Branding
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 