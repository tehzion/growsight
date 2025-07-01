import { create } from 'zustand';
import { config } from '../config/environment';

interface PDFExportState {
  isExporting: boolean;
  exportProgress: number;
  error: string | null;
  pdfSettings: {
    logoUrl: string;
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    footerText: string;
    includeTimestamp: boolean;
    includePageNumbers: boolean;
    defaultTemplate: string;
  };
  exportAnalytics: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  exportResults: (format: 'pdf' | 'csv', userId?: string, anonymized?: boolean) => Promise<string>;
  exportAssessments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  exportAssignments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<string>;
  updatePDFSettings: (settings: Partial<PDFExportState['pdfSettings']>) => void;
  clearError: () => void;
}

export const usePDFExportStore = create<PDFExportState>((set, get) => ({
  isExporting: false,
  exportProgress: 0,
  error: null,
  pdfSettings: {
    logoUrl: config.app.name === 'Growsight' ? 
      'https://example.com/logo.png' : 
      'https://your-custom-logo-url.com/logo.png',
    companyName: config.app.name || 'Growsight',
    primaryColor: '#2563EB',
    secondaryColor: '#7E22CE',
    footerText: `© ${new Date().getFullYear()} ${config.app.name || 'Growsight'}. All rights reserved.`,
    includeTimestamp: true,
    includePageNumbers: true,
    defaultTemplate: 'standard',
  },

  clearError: () => set({ error: null }),

  updatePDFSettings: (settings) => {
    set(state => ({
      pdfSettings: {
        ...state.pdfSettings,
        ...settings
      }
    }));
  },

  exportAnalytics: async (format: 'pdf' | 'csv', organizationId?: string) => {
    set({ isExporting: true, exportProgress: 0, error: null });
    
    try {
      // Simulate export process with progress
      const steps = [10, 25, 40, 60, 75, 90, 100];
      
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        set({ exportProgress: progress });
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const orgSuffix = organizationId ? `-org-${organizationId.slice(-4)}` : '-system';
      const filename = `analytics-report${orgSuffix}-${timestamp}.${format}`;
      
      // Apply PDF branding settings for PDF exports
      if (format === 'pdf') {
        const { pdfSettings } = get();
        console.log('Applying PDF branding settings:', pdfSettings);
        // In a real implementation, these settings would be passed to the PDF generation service
      }
      
      // Simulate successful export
      set({ isExporting: false, exportProgress: 100, error: null });
      return filename;
    } catch (error) {
      console.error('Analytics export error:', error);
      const errorMessage = (error as Error).message || 'Failed to export analytics';
      set({ error: errorMessage, isExporting: false, exportProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  exportResults: async (format: 'pdf' | 'csv', userId?: string, anonymized: boolean = false) => {
    set({ isExporting: true, exportProgress: 0, error: null });
    
    try {
      const steps = [15, 30, 45, 60, 75, 90, 100];
      
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        set({ exportProgress: progress });
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const userSuffix = userId ? `-user-${userId.slice(-4)}` : '-all';
      const anonymizedSuffix = anonymized ? '-anonymized' : '';
      const filename = `assessment-results${userSuffix}${anonymizedSuffix}-${timestamp}.${format}`;
      
      // Apply PDF branding settings for PDF exports
      if (format === 'pdf') {
        const { pdfSettings } = get();
        console.log('Applying PDF branding settings:', pdfSettings);
        // In a real implementation, these settings would be passed to the PDF generation service
      }
      
      set({ isExporting: false, exportProgress: 100, error: null });
      return filename;
    } catch (error) {
      console.error('Results export error:', error);
      const errorMessage = (error as Error).message || 'Failed to export results';
      set({ error: errorMessage, isExporting: false, exportProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  exportAssessments: async (format: 'pdf' | 'csv', organizationId?: string) => {
    set({ isExporting: true, exportProgress: 0, error: null });
    
    try {
      const steps = [10, 20, 35, 50, 65, 80, 95, 100];
      
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 250));
        set({ exportProgress: progress });
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const orgSuffix = organizationId ? `-org-${organizationId.slice(-4)}` : '-all';
      const filename = `assessments-report${orgSuffix}-${timestamp}.${format}`;
      
      // Apply PDF branding settings for PDF exports
      if (format === 'pdf') {
        const { pdfSettings } = get();
        console.log('Applying PDF branding settings:', pdfSettings);
        // In a real implementation, these settings would be passed to the PDF generation service
      }
      
      set({ isExporting: false, exportProgress: 100, error: null });
      return filename;
    } catch (error) {
      console.error('Assessments export error:', error);
      const errorMessage = (error as Error).message || 'Failed to export assessments';
      set({ error: errorMessage, isExporting: false, exportProgress: 0 });
      throw new Error(errorMessage);
    }
  },

  exportAssignments: async (format: 'pdf' | 'csv', organizationId?: string) => {
    set({ isExporting: true, exportProgress: 0, error: null });
    
    try {
      const steps = [10, 30, 50, 70, 85, 100];
      
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 300));
        set({ exportProgress: progress });
      }
      
      const timestamp = new Date().toISOString().split('T')[0];
      const orgSuffix = organizationId ? `-org-${organizationId.slice(-4)}` : '-all';
      const filename = `assignments-report${orgSuffix}-${timestamp}.${format}`;
      
      // Apply PDF branding settings for PDF exports
      if (format === 'pdf') {
        const { pdfSettings } = get();
        console.log('Applying PDF branding settings:', pdfSettings);
        // In a real implementation, these settings would be passed to the PDF generation service
      }
      
      set({ isExporting: false, exportProgress: 100, error: null });
      return filename;
    } catch (error) {
      console.error('Assignments export error:', error);
      const errorMessage = (error as Error).message || 'Failed to export assignments';
      set({ error: errorMessage, isExporting: false, exportProgress: 0 });
      throw new Error(errorMessage);
    }
  }
}));