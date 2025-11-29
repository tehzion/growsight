import { create } from 'zustand';
import { config } from '../config/environment';
import { PDFExporter, BrandingOptions } from '../utils/pdfExport';
import {
  exportAnalyticsToCSV,
  exportResultsToCSV,
  exportAssessmentsToCSV,
  exportAssignmentsToCSV
} from '../utils/csvExport';

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
  exportAnalytics: (format: 'pdf' | 'csv', organizationId?: string) => Promise<Blob>;
  exportResults: (format: 'pdf' | 'csv', userId?: string, anonymized?: boolean) => Promise<Blob>;
  exportAssessments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<Blob>;
  exportAssignments: (format: 'pdf' | 'csv', organizationId?: string) => Promise<Blob>;
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
      // Import stores dynamically to avoid circular dependencies
      const { useDashboardStore } = await import('../stores/dashboardStore');
      const { useBrandingStore } = await import('../stores/brandingStore');

      set({ exportProgress: 20 });

      // Get analytics data
      const { analytics, organizationAnalytics } = useDashboardStore.getState();

      if (!analytics) {
        throw new Error('No analytics data available');
      }

      set({ exportProgress: 40 });

      if (format === 'csv') {
        // Generate CSV
        const blob = exportAnalyticsToCSV(analytics, organizationAnalytics, {
          includeNames: true,
          includeTimestamp: get().pdfSettings.includeTimestamp
        });

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      } else {
        // Generate PDF with branding
        const { pdfSettings } = get();
        const { pdfBranding } = useBrandingStore.getState();

        const brandingOptions: BrandingOptions = {
          logoUrl: pdfBranding?.header_logo_url || pdfSettings.logoUrl,
          companyName: pdfBranding?.header_text || pdfSettings.companyName,
          primaryColor: pdfBranding?.primary_color || pdfSettings.primaryColor,
          secondaryColor: pdfBranding?.secondary_color || pdfSettings.secondaryColor,
          footerText: pdfBranding?.footer_text || pdfSettings.footerText,
          includeTimestamp: pdfBranding?.include_timestamp ?? pdfSettings.includeTimestamp,
          includePageNumbers: pdfBranding?.include_page_numbers ?? pdfSettings.includePageNumbers,
        };

        set({ exportProgress: 60 });

        const exporter = new PDFExporter({
          title: 'Analytics Report',
          subtitle: organizationId ? `Organization ID: ${organizationId}` : 'System-wide Analytics',
          includeCharts: true,
          includeTables: true,
          branding: brandingOptions
        });

        // Prepare analytics data for PDF
        const analyticsData = {
          analytics: {
            totalAssessments: analytics.totalAssessments || 0,
            completedAssessments: analytics.completedAssessments || 0,
            averageScore: analytics.averageRating,
            completionRate: analytics.totalAssessments > 0
              ? (analytics.completedAssessments / analytics.totalAssessments) * 100
              : 0
          },
          allOrgResults: organizationAnalytics.map(org => ({
            organization_name: org.organizationName,
            total_assessments: org.totalAssessments,
            completed_assessments: org.completedAssessments,
            average_score: org.averageRating
          }))
        };

        set({ exportProgress: 80 });

        const blob = await exporter.exportAssessmentResults(analyticsData);

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      }
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
      const { useResultStore } = await import('../stores/resultStore');
      const { useBrandingStore } = await import('../stores/brandingStore');
      const { useAuthStore } = await import('../stores/authStore');

      set({ exportProgress: 20 });

      const { user } = useAuthStore.getState();
      const shouldAnonymize = anonymized || (user?.role === 'org_admin');

      // Fetch results data
      const resultStore = useResultStore.getState();
      let results: any[] = [];

      // This is a simplified version - in real implementation, 
      // we'd fetch actual results from the store
      set({ exportProgress: 50 });

      if (format === 'csv') {
        const blob = exportResultsToCSV(results, {
          includeNames: !shouldAnonymize,
          anonymizeData: shouldAnonymize,
          includeTimestamp: get().pdfSettings.includeTimestamp
        });

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      } else {
        const { pdfSettings } = get();
        const { pdfBranding } = useBrandingStore.getState();

        const brandingOptions: BrandingOptions = {
          logoUrl: pdfBranding?.header_logo_url || pdfSettings.logoUrl,
          companyName: pdfBranding?.header_text || pdfSettings.companyName,
          primaryColor: pdfBranding?.primary_color || pdfSettings.primaryColor,
          secondaryColor: pdfBranding?.secondary_color || pdfSettings.secondaryColor,
          footerText: pdfBranding?.footer_text || pdfSettings.footerText,
          includeTimestamp: pdfBranding?.include_timestamp ?? pdfSettings.includeTimestamp,
          includePageNumbers: pdfBranding?.include_page_numbers ?? pdfSettings.includePageNumbers,
        };

        set({ exportProgress: 70 });

        const exporter = new PDFExporter({
          title: 'Assessment Results',
          subtitle: shouldAnonymize ? '(Anonymized)' : userId ? `User ID: ${userId}` : 'All Results',
          includeCharts: true,
          includeTables: true,
          branding: brandingOptions
        });

        const blob = await exporter.exportAssessmentResults({ selfAssessments: [] });

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      }
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
      const { useAssessmentStore } = await import('../stores/assessmentStore');
      const { useBrandingStore } = await import('../stores/brandingStore');

      set({ exportProgress: 20 });

      const { assessments } = useAssessmentStore.getState();

      set({ exportProgress: 50 });

      if (format === 'csv') {
        const blob = exportAssessmentsToCSV(assessments, {
          includeTimestamp: get().pdfSettings.includeTimestamp
        });

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      } else {
        const { pdfSettings } = get();
        const { pdfBranding } = useBrandingStore.getState();

        const brandingOptions: BrandingOptions = {
          logoUrl: pdfBranding?.header_logo_url || pdfSettings.logoUrl,
          companyName: pdfBranding?.header_text || pdfSettings.companyName,
          primaryColor: pdfBranding?.primary_color || pdfSettings.primaryColor,
          secondaryColor: pdfBranding?.secondary_color || pdfSettings.secondaryColor,
          footerText: pdfBranding?.footer_text || pdfSettings.footerText,
          includeTimestamp: pdfBranding?.include_timestamp ?? pdfSettings.includeTimestamp,
          includePageNumbers: pdfBranding?.include_page_numbers ?? pdfSettings.includePageNumbers,
        };

        set({ exportProgress: 70 });

        const exporter = new PDFExporter({
          title: 'Assessments Report',
          subtitle: organizationId ? `Organization ID: ${organizationId}` : 'All Assessments',
          includeCharts: false,
          includeTables: true,
          branding: brandingOptions
        });

        const blob = await exporter.exportAssessmentResults({});

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      }
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
      const { useAssignmentStore } = await import('../stores/assignmentStore');
      const { useBrandingStore } = await import('../stores/brandingStore');

      set({ exportProgress: 20 });

      const { assignments } = useAssignmentStore.getState();

      set({ exportProgress: 50 });

      if (format === 'csv') {
        const blob = exportAssignmentsToCSV(assignments, {
          includeTimestamp: get().pdfSettings.includeTimestamp
        });

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      } else {
        const { pdfSettings } = get();
        const { pdfBranding } = useBrandingStore.getState();

        const brandingOptions: BrandingOptions = {
          logoUrl: pdfBranding?.header_logo_url || pdfSettings.logoUrl,
          companyName: pdfBranding?.header_text || pdfSettings.companyName,
          primaryColor: pdfBranding?.primary_color || pdfSettings.primaryColor,
          secondaryColor: pdfBranding?.secondary_color || pdfSettings.secondaryColor,
          footerText: pdfBranding?.footer_text || pdfSettings.footerText,
          includeTimestamp: pdfBranding?.include_timestamp ?? pdfSettings.includeTimestamp,
          includePageNumbers: pdfBranding?.include_page_numbers ?? pdfSettings.includePageNumbers,
        };

        set({ exportProgress: 70 });

        const exporter = new PDFExporter({
          title: 'Assignments Report',
          subtitle: organizationId ? `Organization ID: ${organizationId}` : 'All Assignments',
          includeCharts: false,
          includeTables: true,
          branding: brandingOptions
        });

        const blob = await exporter.exportAssessmentResults({});

        set({ isExporting: false, exportProgress: 100 });
        return blob;
      }
    } catch (error) {
      console.error('Assignments export error:', error);
      const errorMessage = (error as Error).message || 'Failed to export assignments';
      set({ error: errorMessage, isExporting: false, exportProgress: 0 });
      throw new Error(errorMessage);
    }
  }
}));