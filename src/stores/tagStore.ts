import { create } from 'zustand';
import { Tag, UserTag, OrganizationTag, TagInsight } from '../types';

interface TagState {
  tags: Tag[];
  userTags: UserTag[];
  organizationTags: OrganizationTag[];
  insights: TagInsight[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTags: (organizationId?: string) => Promise<void>;
  fetchUserTags: (userId: string) => Promise<void>;
  fetchOrganizationTags: (organizationId: string) => Promise<void>;
  createTag: (tag: Omit<Tag, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Tag>;
  assignUserTag: (userTag: Omit<UserTag, 'id' | 'assignedAt'>) => Promise<UserTag>;
  assignOrganizationTag: (orgTag: Omit<OrganizationTag, 'id' | 'assignedAt'>) => Promise<OrganizationTag>;
  removeUserTag: (userTagId: string) => Promise<void>;
  removeOrganizationTag: (orgTagId: string) => Promise<void>;
  generateInsights: (userId?: string, organizationId?: string) => Promise<TagInsight[]>;
  analyzeUserForTags: (userId: string, assessmentData?: any) => Promise<UserTag[]>;
  analyzeOrganizationForTags: (organizationId: string, metricsData?: any) => Promise<OrganizationTag[]>;
  clearError: () => void;
}

const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  userTags: [],
  organizationTags: [],
  insights: [],
  isLoading: false,
  error: null,

  fetchTags: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/tags${organizationId ? `?organizationId=${organizationId}` : ''}`);
      const tags = await response.json();
      set({ tags, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchUserTags: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/users/${userId}/tags`);
      const userTags = await response.json();
      set({ userTags, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchOrganizationTags: async (organizationId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch(`/api/organizations/${organizationId}/tags`);
      const organizationTags = await response.json();
      set({ organizationTags, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTag: async (tagData) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData),
      });
      const newTag = await response.json();
      set(state => ({ 
        tags: [...state.tags, newTag], 
        isLoading: false 
      }));
      return newTag;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  assignUserTag: async (userTagData) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userTagData),
      });
      const newUserTag = await response.json();
      set(state => ({ 
        userTags: [...state.userTags, newUserTag], 
        isLoading: false 
      }));
      return newUserTag;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  assignOrganizationTag: async (orgTagData) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const response = await fetch('/api/organization-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgTagData),
      });
      const newOrgTag = await response.json();
      set(state => ({ 
        organizationTags: [...state.organizationTags, newOrgTag], 
        isLoading: false 
      }));
      return newOrgTag;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  removeUserTag: async (userTagId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      await fetch(`/api/user-tags/${userTagId}`, { method: 'DELETE' });
      set(state => ({ 
        userTags: state.userTags.filter(tag => tag.id !== userTagId), 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  removeOrganizationTag: async (orgTagId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      await fetch(`/api/organization-tags/${orgTagId}`, { method: 'DELETE' });
      set(state => ({ 
        organizationTags: state.organizationTags.filter(tag => tag.id !== orgTagId), 
        isLoading: false 
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  generateInsights: async (userId?: string, organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      // Mock API call - replace with actual API
      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (organizationId) params.append('organizationId', organizationId);
      
      const response = await fetch(`/api/insights?${params}`);
      const insights = await response.json();
      set({ insights, isLoading: false });
      return insights;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  analyzeUserForTags: async (userId: string, assessmentData?: any) => {
    set({ isLoading: true, error: null });
    try {
      // AI-powered tag analysis based on assessment data
      const suggestedTags: UserTag[] = [];
      
      if (assessmentData) {
        // Analyze assessment results for strengths
        const strengths = assessmentData.filter((q: any) => q.avgReviewerRating >= 5.5);
        if (strengths.length > 0) {
          suggestedTags.push({
            id: `temp-${Date.now()}-1`,
            userId,
            tagId: 'strength-high-performer',
            assignedById: 'system',
            assignedAt: new Date().toISOString(),
            confidence: 85,
            source: 'ai_analysis',
            metadata: {
              assessmentId: assessmentData.assessmentId,
              rating: strengths[0].avgReviewerRating,
              context: 'High performance in assessment',
              evidence: strengths.map((s: any) => s.text)
            }
          });
        }

        // Analyze for development areas
        const developmentAreas = assessmentData.filter((q: any) => q.avgReviewerRating <= 3.5);
        if (developmentAreas.length > 0) {
          suggestedTags.push({
            id: `temp-${Date.now()}-2`,
            userId,
            tagId: 'development-needs-improvement',
            assignedById: 'system',
            assignedAt: new Date().toISOString(),
            confidence: 75,
            source: 'ai_analysis',
            metadata: {
              assessmentId: assessmentData.assessmentId,
              rating: developmentAreas[0].avgReviewerRating,
              context: 'Areas needing development',
              evidence: developmentAreas.map((d: any) => d.text)
            }
          });
        }
      }

      set({ isLoading: false });
      return suggestedTags;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  analyzeOrganizationForTags: async (organizationId: string, metricsData?: any) => {
    set({ isLoading: true, error: null });
    try {
      // AI-powered organization tag analysis
      const suggestedTags: OrganizationTag[] = [];
      
      if (metricsData) {
        // Analyze completion rates
        if (metricsData.completionRate >= 90) {
          suggestedTags.push({
            id: `temp-${Date.now()}-1`,
            organizationId,
            tagId: 'performance-high-engagement',
            assignedById: 'system',
            assignedAt: new Date().toISOString(),
            confidence: 90,
            source: 'ai_analysis',
            metadata: {
              metricValue: metricsData.completionRate,
              benchmark: 75,
              trend: 'improving',
              context: 'High assessment completion rate',
              evidence: [`${metricsData.completionRate}% completion rate`]
            }
          });
        }

        // Analyze average ratings
        if (metricsData.averageRating >= 5.5) {
          suggestedTags.push({
            id: `temp-${Date.now()}-2`,
            organizationId,
            tagId: 'performance-excellent-quality',
            assignedById: 'system',
            assignedAt: new Date().toISOString(),
            confidence: 85,
            source: 'ai_analysis',
            metadata: {
              metricValue: metricsData.averageRating,
              benchmark: 4.5,
              trend: 'stable',
              context: 'High quality performance',
              evidence: [`${metricsData.averageRating}/7 average rating`]
            }
          });
        }
      }

      set({ isLoading: false });
      return suggestedTags;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },

  clearError: () => set({ error: null }),
}));

export default useTagStore; 