import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface WebBrandingSettings {
  id?: string;
  organization_id?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  logo_url?: string;
  favicon_url?: string;
  company_name: string;
  font_family: string;
  button_style: string;
  dark_mode_enabled: boolean;
  custom_css?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailBrandingSettings {
  id?: string;
  organization_id?: string;
  email_header_color: string;
  email_footer_text?: string;
  email_logo_url?: string;
  sender_name?: string;
  reply_to_email?: string;
  email_signature?: string;
  template_style: string;
  custom_html_header?: string;
  custom_html_footer?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PdfBrandingSettings {
  id?: string;
  organization_id?: string;
  header_logo_url?: string;
  header_text?: string;
  footer_text?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  include_watermark: boolean;
  watermark_text?: string;
  page_layout: string;
  include_timestamp: boolean;
  include_page_numbers: boolean;
  custom_css?: string;
  created_at?: string;
  updated_at?: string;
}

interface BrandingStore {
  // State
  webBranding: WebBrandingSettings | null;
  emailBranding: EmailBrandingSettings | null;
  pdfBranding: PdfBrandingSettings | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadBranding: (organizationId: string) => Promise<void>;
  saveWebBranding: (organizationId: string, settings: Partial<WebBrandingSettings>) => Promise<void>;
  saveEmailBranding: (organizationId: string, settings: Partial<EmailBrandingSettings>) => Promise<void>;
  savePdfBranding: (organizationId: string, settings: Partial<PdfBrandingSettings>) => Promise<void>;
  applyBranding: (webBranding: WebBrandingSettings) => void;
  resetBranding: () => void;
  clearError: () => void;
}

const defaultWebBranding: WebBrandingSettings = {
  primary_color: '#2563EB',
  secondary_color: '#7E22CE',
  accent_color: '#14B8A6',
  company_name: 'GrowSight',
  font_family: 'Inter',
  button_style: 'rounded',
  dark_mode_enabled: false,
};

const defaultEmailBranding: EmailBrandingSettings = {
  email_header_color: '#2563EB',
  template_style: 'modern',
};

const defaultPdfBranding: PdfBrandingSettings = {
  primary_color: '#2563EB',
  secondary_color: '#7E22CE',
  font_family: 'Helvetica',
  include_watermark: false,
  page_layout: 'portrait',
  include_timestamp: true,
  include_page_numbers: true,
};

export const useBrandingStore = create<BrandingStore>((set, get) => ({
  // Initial state
  webBranding: null,
  emailBranding: null,
  pdfBranding: null,
  isLoading: false,
  error: null,

  // Load branding settings for an organization
  loadBranding: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Load web branding
      const { data: webData, error: webError } = await supabase
        .from('web_branding_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      // Load email branding
      const { data: emailData, error: emailError } = await supabase
        .from('email_branding_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      // Load PDF branding
      const { data: pdfData, error: pdfError } = await supabase
        .from('pdf_branding_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .single();

      // Set the loaded data or defaults
      const webBranding = webData || { ...defaultWebBranding, organization_id: organizationId };
      const emailBranding = emailData || { ...defaultEmailBranding, organization_id: organizationId };
      const pdfBranding = pdfData || { ...defaultPdfBranding, organization_id: organizationId };

      set({
        webBranding,
        emailBranding,
        pdfBranding,
        isLoading: false,
        error: null,
      });

      // Apply the branding to the UI
      get().applyBranding(webBranding);

    } catch (error) {
      console.error('Error loading branding:', error);
      set({
        error: 'Failed to load branding settings',
        isLoading: false,
      });
    }
  },

  // Save web branding settings
  saveWebBranding: async (organizationId: string, settings: Partial<WebBrandingSettings>) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentSettings = get().webBranding;
      const updatedSettings = { ...currentSettings, ...settings, organization_id: organizationId };

      const { data, error } = await supabase
        .from('web_branding_settings')
        .upsert(updatedSettings, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;

      set({
        webBranding: data,
        isLoading: false,
        error: null,
      });

      // Apply the new branding
      get().applyBranding(data);

    } catch (error) {
      console.error('Error saving web branding:', error);
      set({
        error: 'Failed to save web branding settings',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save email branding settings
  saveEmailBranding: async (organizationId: string, settings: Partial<EmailBrandingSettings>) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentSettings = get().emailBranding;
      const updatedSettings = { ...currentSettings, ...settings, organization_id: organizationId };

      const { data, error } = await supabase
        .from('email_branding_settings')
        .upsert(updatedSettings, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;

      set({
        emailBranding: data,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error saving email branding:', error);
      set({
        error: 'Failed to save email branding settings',
        isLoading: false,
      });
      throw error;
    }
  },

  // Save PDF branding settings
  savePdfBranding: async (organizationId: string, settings: Partial<PdfBrandingSettings>) => {
    set({ isLoading: true, error: null });
    
    try {
      const currentSettings = get().pdfBranding;
      const updatedSettings = { ...currentSettings, ...settings, organization_id: organizationId };

      const { data, error } = await supabase
        .from('pdf_branding_settings')
        .upsert(updatedSettings, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) throw error;

      set({
        pdfBranding: data,
        isLoading: false,
        error: null,
      });

    } catch (error) {
      console.error('Error saving PDF branding:', error);
      set({
        error: 'Failed to save PDF branding settings',
        isLoading: false,
      });
      throw error;
    }
  },

  // Apply branding to the UI by injecting CSS variables
  applyBranding: (webBranding: WebBrandingSettings) => {
    if (!webBranding) return;

    const root = document.documentElement;
    
    // Apply color variables
    root.style.setProperty('--brand-primary', webBranding.primary_color);
    root.style.setProperty('--brand-secondary', webBranding.secondary_color);
    root.style.setProperty('--brand-accent', webBranding.accent_color);
    
    // Apply font family
    root.style.setProperty('--brand-font-family', webBranding.font_family);
    
    // Apply button style class
    root.style.setProperty('--brand-button-style', webBranding.button_style);
    
    // Apply custom CSS if provided
    if (webBranding.custom_css) {
      let customStyleElement = document.getElementById('custom-branding-css');
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'custom-branding-css';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = webBranding.custom_css;
    }
  },

  // Reset branding to defaults
  resetBranding: () => {
    set({
      webBranding: null,
      emailBranding: null,
      pdfBranding: null,
      error: null,
    });

    // Remove custom CSS
    const customStyleElement = document.getElementById('custom-branding-css');
    if (customStyleElement) {
      customStyleElement.remove();
    }

    // Reset CSS variables to defaults
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', defaultWebBranding.primary_color);
    root.style.setProperty('--brand-secondary', defaultWebBranding.secondary_color);
    root.style.setProperty('--brand-accent', defaultWebBranding.accent_color);
    root.style.setProperty('--brand-font-family', defaultWebBranding.font_family);
    root.style.setProperty('--brand-button-style', defaultWebBranding.button_style);
  },

  // Clear error state
  clearError: () => set({ error: null }),
}));