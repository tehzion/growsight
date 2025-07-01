import { create } from 'zustand';
import { DashboardAnalytics } from '../types';

interface DashboardState {
  analytics: DashboardAnalytics | null;
  organizationAnalytics: DashboardAnalytics[];
  isLoading: boolean;
  error: string | null;
  fetchAnalytics: (organizationId?: string) => Promise<void>;
  fetchAllOrganizationAnalytics: () => Promise<void>;
  clearAnalytics: () => void;
  clearError: () => void;
}

// Enhanced mock analytics data with more realistic numbers and trends
const mockAnalyticsData: DashboardAnalytics[] = [
  {
    organizationId: 'demo-org-1',
    organizationName: 'Acme Corporation',
    totalEmployees: 12,
    totalReviewers: 8,
    totalAssessments: 15,
    completedAssessments: 28,
    pendingAssessments: 8,
    inProgressAssessments: 6,
    averageRating: 4.2,
    totalResponses: 156,
    completionRate: 78.5,
    averageCompletionTime: 4.2,
    participationRate: 92.3,
    competencyAnalytics: [
      {
        competencyId: 'comp-1',
        competencyName: 'Leadership',
        averageRating: 4.7,
        assessmentCount: 12
      },
      {
        competencyId: 'comp-2',
        competencyName: 'Communication',
        averageRating: 5.2,
        assessmentCount: 15
      },
      {
        competencyId: 'comp-3',
        competencyName: 'Problem Solving',
        averageRating: 4.5,
        assessmentCount: 10
      }
    ]
  },
  {
    organizationId: 'demo-org-2',
    organizationName: 'TechStart Solutions',
    totalEmployees: 8,
    totalReviewers: 5,
    totalAssessments: 12,
    completedAssessments: 18,
    pendingAssessments: 6,
    inProgressAssessments: 4,
    averageRating: 4.5,
    totalResponses: 89,
    completionRate: 81.2,
    averageCompletionTime: 3.8,
    participationRate: 95.1,
    competencyAnalytics: [
      {
        competencyId: 'comp-6',
        competencyName: 'Innovation',
        averageRating: 5.1,
        assessmentCount: 8
      },
      {
        competencyId: 'comp-7',
        competencyName: 'Customer Focus',
        averageRating: 4.8,
        assessmentCount: 7
      }
    ]
  },
  {
    organizationId: 'demo-org-3',
    organizationName: 'Global Enterprises',
    totalEmployees: 15,
    totalReviewers: 10,
    totalAssessments: 20,
    completedAssessments: 35,
    pendingAssessments: 12,
    inProgressAssessments: 8,
    averageRating: 3.9,
    totalResponses: 203,
    completionRate: 74.3,
    averageCompletionTime: 5.1,
    participationRate: 88.7,
    competencyAnalytics: [
      {
        competencyId: 'comp-8',
        competencyName: 'Strategic Thinking',
        averageRating: 4.2,
        assessmentCount: 14
      }
    ]
  }
];

export const useDashboardStore = create<DashboardState>((set, get) => ({
  analytics: null,
  organizationAnalytics: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchAnalytics: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Simulate realistic API call with proper error handling
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (organizationId) {
        // Fetch specific organization analytics
        const orgAnalytics = mockAnalyticsData.find(a => a.organizationId === organizationId);
        if (orgAnalytics) {
          set({ analytics: orgAnalytics, isLoading: false });
        } else {
          // Create default analytics for organization with realistic data
          const defaultAnalytics: DashboardAnalytics = {
            organizationId,
            organizationName: 'Your Organization',
            totalEmployees: 0,
            totalReviewers: 0,
            totalAssessments: 2, // Preset assessments available
            completedAssessments: 0,
            pendingAssessments: 0,
            inProgressAssessments: 0,
            averageRating: 0,
            totalResponses: 0,
            completionRate: 0,
            averageCompletionTime: 0,
            participationRate: 0,
            competencyAnalytics: []
          };
          set({ analytics: defaultAnalytics, isLoading: false });
        }
      } else {
        // Aggregate data for super admin with enhanced metrics
        const aggregated: DashboardAnalytics = {
          organizationId: 'all',
          organizationName: 'All Organizations',
          totalEmployees: mockAnalyticsData.reduce((sum, org) => sum + org.totalEmployees, 0),
          totalReviewers: mockAnalyticsData.reduce((sum, org) => sum + org.totalReviewers, 0),
          totalAssessments: mockAnalyticsData.reduce((sum, org) => sum + org.totalAssessments, 0),
          completedAssessments: mockAnalyticsData.reduce((sum, org) => sum + org.completedAssessments, 0),
          pendingAssessments: mockAnalyticsData.reduce((sum, org) => sum + org.pendingAssessments, 0),
          inProgressAssessments: mockAnalyticsData.reduce((sum, org) => sum + org.inProgressAssessments, 0),
          averageRating: mockAnalyticsData.reduce((sum, org, _, arr) => sum + org.averageRating / arr.length, 0),
          totalResponses: mockAnalyticsData.reduce((sum, org) => sum + org.totalResponses, 0),
          completionRate: mockAnalyticsData.reduce((sum, org, _, arr) => sum + (org.completionRate || 0) / arr.length, 0),
          averageCompletionTime: mockAnalyticsData.reduce((sum, org, _, arr) => sum + (org.averageCompletionTime || 0) / arr.length, 0),
          participationRate: mockAnalyticsData.reduce((sum, org, _, arr) => sum + (org.participationRate || 0) / arr.length, 0),
          // Aggregate competency analytics
          competencyAnalytics: mockAnalyticsData.flatMap(org => org.competencyAnalytics || [])
            .reduce((acc, curr) => {
              const existing = acc.find(c => c.competencyId === curr.competencyId);
              if (existing) {
                existing.averageRating = (existing.averageRating * existing.assessmentCount + curr.averageRating * curr.assessmentCount) / 
                                        (existing.assessmentCount + curr.assessmentCount);
                existing.assessmentCount += curr.assessmentCount;
              } else {
                acc.push({...curr});
              }
              return acc;
            }, [] as DashboardAnalytics['competencyAnalytics'] || [])
            .sort((a, b) => b.averageRating - a.averageRating)
        };
        
        set({ analytics: aggregated, isLoading: false });
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      set({ error: (error as Error).message || 'Failed to load analytics', isLoading: false });
    }
  },

  fetchAllOrganizationAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      set({ organizationAnalytics: mockAnalyticsData, isLoading: false });
    } catch (error) {
      console.error('Organization analytics fetch error:', error);
      set({ error: (error as Error).message || 'Failed to load organization analytics', isLoading: false });
    }
  },

  clearAnalytics: () => {
    set({ analytics: null, organizationAnalytics: [], error: null });
  }
}));