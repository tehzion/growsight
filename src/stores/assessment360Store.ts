import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

export interface LeadershipDimension {
  id: string;
  name: string;
  description: string;
  category: string;
  organizationId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment360Assignment {
  id: string;
  assessmentId: string;
  participantId: string;
  reviewerId: string;
  relationshipType: 'self' | 'peer' | 'subordinate' | 'supervisor' | 'other';
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  participant?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  reviewer?: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface Assessment360Response {
  id: string;
  assignmentId: string;
  questionId: string;
  dimensionId: string | null;
  rating: number | null;
  textResponse: string | null;
  confidenceLevel: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Assessment360Summary {
  id: string;
  assessmentId: string;
  participantId: string;
  dimensionId: string;
  selfRating: number | null;
  selfRatingCount: number;
  peerRating: number | null;
  peerRatingCount: number;
  subordinateRating: number | null;
  subordinateRatingCount: number;
  supervisorRating: number | null;
  supervisorRatingCount: number;
  overallOthersRating: number | null;
  overallOthersCount: number;
  departmentAverage: number | null;
  organizationAverage: number | null;
  gapAnalysis: number | null;
  lastCalculatedAt: string;
  dimension?: {
    name: string;
    category: string;
  };
}

export interface Assessment360Overview {
  assessmentId: string;
  assessmentTitle: string;
  participantId: string;
  participantFirstName: string;
  participantLastName: string;
  participantEmail: string;
  participantRole: string;
  organizationName: string;
  totalAssignments: number;
  completedAssignments: number;
  completionRate: number;
  selfAssessments: number;
  peerAssessments: number;
  subordinateAssessments: number;
  supervisorAssessments: number;
}

interface Assessment360State {
  // Loading states
  isLoading: boolean;
  error: string | null;
  
  // Data
  dimensions: LeadershipDimension[];
  assignments: Assessment360Assignment[];
  responses: Assessment360Response[];
  summaries: Assessment360Summary[];
  overviews: Assessment360Overview[];
  
  // Current assessment
  currentAssessmentId: string | null;
  currentParticipantId: string | null;
  
  // Actions
  fetchDimensions: (organizationId?: string) => Promise<void>;
  createDimension: (dimension: Omit<LeadershipDimension, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateDimension: (id: string, updates: Partial<LeadershipDimension>) => Promise<void>;
  deleteDimension: (id: string) => Promise<void>;
  
  fetchAssignments: (assessmentId: string, participantId?: string) => Promise<void>;
  createAssignment: (assignment: Omit<Assessment360Assignment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateAssignment: (id: string, updates: Partial<Assessment360Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  
  fetchResponses: (assignmentId: string) => Promise<void>;
  saveResponse: (response: Omit<Assessment360Response, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateResponse: (id: string, updates: Partial<Assessment360Response>) => Promise<void>;
  
  fetchSummaries: (assessmentId: string, participantId: string) => Promise<void>;
  calculateSummary: (assessmentId: string, participantId: string) => Promise<void>;
  
  fetchOverviews: (assessmentId?: string) => Promise<void>;
  
  get360Results: (assessmentId: string, participantId: string) => Promise<Assessment360Summary[]>;
  
  // Utility functions
  getSelfRating: (dimensionId: string) => number | null;
  getOthersRating: (dimensionId: string) => number | null;
  getDepartmentAverage: (dimensionId: string) => number | null;
  getOrganizationAverage: (dimensionId: string) => number | null;
  getGapAnalysis: (dimensionId: string) => number | null;
  
  clearError: () => void;
  setCurrentAssessment: (assessmentId: string, participantId?: string) => void;
}

export const useAssessment360Store = create<Assessment360State>((set, get) => ({
  // Initial state
  isLoading: false,
  error: null,
  dimensions: [],
  assignments: [],
  responses: [],
  summaries: [],
  overviews: [],
  currentAssessmentId: null,
  currentParticipantId: null,

  // Fetch leadership dimensions
  fetchDimensions: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('leadership_dimensions')
        .select('*')
        .eq('is_active', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else if (user.role !== 'super_admin') {
        query = query.eq('organization_id', user.organizationId);
      }

      const { data, error } = await query.order('category', { ascending: true });

      if (error) throw error;

      set({ dimensions: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Create leadership dimension
  createDimension: async (dimension) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('leadership_dimensions')
        .insert({
          name: dimension.name,
          description: dimension.description,
          category: dimension.category,
          organization_id: dimension.organizationId,
          created_by_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        dimensions: [...state.dimensions, data]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update leadership dimension
  updateDimension: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('leadership_dimensions')
        .update({
          name: updates.name,
          description: updates.description,
          category: updates.category,
          is_active: updates.isActive
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        dimensions: state.dimensions.map(d => d.id === id ? data : d)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete leadership dimension
  deleteDimension: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('leadership_dimensions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        dimensions: state.dimensions.filter(d => d.id !== id)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch 360 assignments
  fetchAssignments: async (assessmentId, participantId) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('assessment_360_assignments')
        .select(`
          *,
          participant:users!assessment_360_assignments_participant_id_fkey(
            first_name,
            last_name,
            email,
            role
          ),
          reviewer:users!assessment_360_assignments_reviewer_id_fkey(
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('assessment_id', assessmentId);

      if (participantId) {
        query = query.eq('participant_id', participantId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ assignments: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Create 360 assignment
  createAssignment: async (assignment) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('create_360_assessment_assignment', {
          p_assessment_id: assignment.assessmentId,
          p_participant_id: assignment.participantId,
          p_reviewer_id: assignment.reviewerId,
          p_relationship_type: assignment.relationshipType,
          p_assigned_by_id: user.id
        });

      if (error) throw error;

      // Refresh assignments
      await get().fetchAssignments(assignment.assessmentId);
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update 360 assignment
  updateAssignment: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_360_assignments')
        .update({
          is_completed: updates.isCompleted,
          started_at: updates.startedAt,
          completed_at: updates.completedAt
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        assignments: state.assignments.map(a => a.id === id ? data : a)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Delete 360 assignment
  deleteAssignment: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessment_360_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        assignments: state.assignments.filter(a => a.id !== id)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch 360 responses
  fetchResponses: async (assignmentId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_360_responses')
        .select('*')
        .eq('assignment_id', assignmentId);

      if (error) throw error;

      set({ responses: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Save 360 response
  saveResponse: async (response) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_360_responses')
        .insert({
          assignment_id: response.assignmentId,
          question_id: response.questionId,
          dimension_id: response.dimensionId,
          rating: response.rating,
          text_response: response.textResponse,
          confidence_level: response.confidenceLevel
        })
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        responses: [...state.responses, data]
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Update 360 response
  updateResponse: async (id, updates) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_360_responses')
        .update({
          rating: updates.rating,
          text_response: updates.textResponse,
          confidence_level: updates.confidenceLevel
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        responses: state.responses.map(r => r.id === id ? data : r)
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch 360 summaries
  fetchSummaries: async (assessmentId, participantId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_360_summaries')
        .select(`
          *,
          dimension:leadership_dimensions(
            name,
            category
          )
        `)
        .eq('assessment_id', assessmentId)
        .eq('participant_id', participantId)
        .order('dimension_id');

      if (error) throw error;

      set({ summaries: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Calculate 360 summary
  calculateSummary: async (assessmentId, participantId) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .rpc('calculate_360_assessment_summary', {
          p_assessment_id: assessmentId,
          p_participant_id: participantId
        });

      if (error) throw error;

      // Refresh summaries
      await get().fetchSummaries(assessmentId, participantId);
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Fetch 360 overviews
  fetchOverviews: async (assessmentId) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('assessment_360_overview')
        .select('*');

      if (assessmentId) {
        query = query.eq('assessment_id', assessmentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      set({ overviews: data || [] });
    } catch (error) {
      set({ error: (error as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Get 360 results
  get360Results: async (assessmentId, participantId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .rpc('get_360_assessment_results', {
          p_assessment_id: assessmentId,
          p_participant_id: participantId
        });

      if (error) throw error;

      return data || [];
    } catch (error) {
      set({ error: (error as Error).message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  // Utility functions
  getSelfRating: (dimensionId) => {
    const { summaries } = get();
    const summary = summaries.find(s => s.dimensionId === dimensionId);
    return summary?.selfRating || null;
  },

  getOthersRating: (dimensionId) => {
    const { summaries } = get();
    const summary = summaries.find(s => s.dimensionId === dimensionId);
    return summary?.overallOthersRating || null;
  },

  getDepartmentAverage: (dimensionId) => {
    const { summaries } = get();
    const summary = summaries.find(s => s.dimensionId === dimensionId);
    return summary?.departmentAverage || null;
  },

  getOrganizationAverage: (dimensionId) => {
    const { summaries } = get();
    const summary = summaries.find(s => s.dimensionId === dimensionId);
    return summary?.organizationAverage || null;
  },

  getGapAnalysis: (dimensionId) => {
    const { summaries } = get();
    const summary = summaries.find(s => s.dimensionId === dimensionId);
    return summary?.gapAnalysis || null;
  },

  clearError: () => set({ error: null }),
  setCurrentAssessment: (assessmentId, participantId) => set({ 
    currentAssessmentId: assessmentId, 
    currentParticipantId: participantId 
  })
})); 