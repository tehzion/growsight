import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import SecureLogger from '../lib/secureLogger';
import AccessControl from '../lib/accessControl';
import { useAuthStore } from './authStore';

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
  bio?: string;
  avatar_url?: string;
  date_of_birth?: string;
  hire_date?: string;
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  skills?: string[];
  certifications?: string[];
  education?: {
    degree: string;
    institution: string;
    year: string;
  }[];
  work_experience?: {
    company: string;
    position: string;
    start_date: string;
    end_date?: string;
    description: string;
  }[];
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
  created_at: string;
  updated_at: string;
}

interface ProfileTag {
  id: string;
  userId: string;
  tagName: string;
  tagCategory: string;
  tagValue: Record<string, unknown>;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface UserBehavior {
  id: string;
  userId: string;
  behaviorType: string;
  behaviorData: Record<string, unknown>;
  context?: string;
  recordedById?: string;
  recordedAt: string;
  organizationId: string;
}

interface StaffAssignment {
  id: string;
  staffId: string;
  supervisorId?: string;
  departmentId?: string;
  organizationId: string;
  assignmentType: string;
  startDate: string;
  endDate?: string;
  assignmentData: Record<string, unknown>;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileState {
  profile: Profile | null;
  profileTags: ProfileTag[];
  behaviors: UserBehavior[];
  staffAssignments: StaffAssignment[];
  isLoading: boolean;
  error: string | null;
  
  // Profile management
  fetchProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  
  // Tag management
  fetchProfileTags: (userId: string, currentUserId?: string) => Promise<void>;
  addProfileTag: (userId: string, tagName: string, tagCategory?: string, tagValue?: Record<string, unknown>, currentUserId?: string) => Promise<void>;
  updateProfileTag: (tagId: string, tagName?: string, tagValue?: Record<string, unknown>, currentUserId?: string) => Promise<void>;
  removeProfileTag: (tagId: string, currentUserId?: string) => Promise<void>;
  
  // Behavior tracking
  fetchUserBehaviors: (userId: string, currentUserId?: string) => Promise<void>;
  trackBehavior: (userId: string, behaviorType: string, behaviorData: Record<string, unknown>, context?: string, currentUserId?: string) => Promise<void>;
  
  // Staff assignment management
  fetchStaffAssignments: (staffId: string, currentUserId?: string) => Promise<void>;
  createStaffAssignment: (assignment: Omit<StaffAssignment, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string) => Promise<void>;
  updateStaffAssignment: (assignmentId: string, data: Partial<StaffAssignment>, currentUserId?: string) => Promise<void>;
  
  // Utility functions
  resetProfile: () => void;
  clearError: () => void;
}

// Default profile for demo mode


const REQUIRED_FIELDS = [
  'first_name',
  'last_name',
  'email',
  'position',
  'department',
  'phone',
  'date_of_birth',
  'hire_date',
  'emergency_contact',
  'bio',
  'avatar_url'
];

const OPTIONAL_FIELDS = [
  'skills',
  'certifications',
  'education',
  'work_experience',
  'preferences'
];

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      profileTags: [],
      behaviors: [],
      staffAssignments: [],
      isLoading: false,
      error: null,
      
      fetchProfile: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
            // Validate access
            if (!AccessControl.validateUserAccess({ id: userId } as any, userId, 'fetchProfile', true)) {
              throw new Error('Access denied to user profile');
            }

            const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', userId)
              .single();

            if (error) throw handleSupabaseError(error);

            set({
              profile: data,
              isLoading: false
            });
        } catch (error) {
          SecureLogger.error('Failed to fetch profile', error);
          set({ 
            error: (error as Error).message || 'Failed to fetch profile', 
            isLoading: false 
          });
        }
      },
      
      updateProfile: async (updates: Partial<Profile>) => {
        set({ isLoading: true, error: null });
        try {
          const currentProfile = get().profile;
          if (!currentProfile) {
            throw new Error('No profile to update');
          }
          
            // Validate access
            if (!AccessControl.validateUserAccess({ id: currentProfile.user_id } as any, currentProfile.user_id, 'updateProfile', false)) {
              throw new Error('Access denied to update profile');
            }

            const updatedProfile = { ...currentProfile, ...updates, updated_at: new Date().toISOString() };
            
                          const { data, error } = await supabase
                .from('profiles')
                .upsert(updatedProfile)
                .select()
              .single();

            if (error) throw handleSupabaseError(error);

            set({
              profile: data,
              isLoading: false
            });
        } catch (error) {
          SecureLogger.error('Failed to update profile', error);
          set({ 
            error: (error as Error).message || 'Failed to update profile', 
            isLoading: false 
          });
        }
      },
      
      fetchProfileTags: async (userId: string, currentUserId?: string) => {
        try {
            if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, userId, 'fetchProfileTags', true)) {
              throw new Error('Access denied to profile tags');
            }

            const { data, error } = await supabase
              .from('profile_tags')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (error) throw handleSupabaseError(error);

            const tags: ProfileTag[] = data.map((tag: any) => ({
              id: tag.id,
              userId: tag.user_id,
              tagName: tag.tag_name,
              tagCategory: tag.tag_category,
              tagValue: tag.tag_value || {},
              createdById: tag.created_by_id,
              createdAt: tag.created_at,
              updatedAt: tag.updated_at,
            }));

            set({ profileTags: tags });
        } catch (error) {
          SecureLogger.error('Failed to fetch profile tags', error);
          set({ error: (error as Error).message || 'Failed to fetch profile tags' });
        }
      },

      addProfileTag: async (userId: string, tagName: string, tagCategory = 'behavior', tagValue = {}, currentUserId?: string) => {
        try {
            const { data, error } = await supabase
              .rpc('add_profile_tag', {
                p_user_id: userId,
                p_tag_name: tagName,
                p_tag_category: tagCategory,
                p_tag_value: tagValue,
                p_created_by_id: currentUserId
              });

            if (error) throw handleSupabaseError(error);

            // Refresh tags
            get().fetchProfileTags(userId, currentUserId);
        } catch (error) {
          SecureLogger.error('Failed to add profile tag', error);
          set({ error: (error as Error).message || 'Failed to add profile tag' });
        }
      },

      updateProfileTag: async (tagId: string, tagName?: string, tagValue?: Record<string, unknown>, currentUserId?: string) => {
        try {
            const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (tagName) updateData.tag_name = tagName;
            if (tagValue) updateData.tag_value = tagValue;

            const { error } = await supabase
              .from('profile_tags')
              .update(updateData)
              .eq('id', tagId);

            if (error) throw handleSupabaseError(error);

            // Update local state
            set(state => ({
              profileTags: state.profileTags.map(tag => 
                tag.id === tagId 
                  ? { ...tag, tagName: tagName || tag.tagName, tagValue: tagValue || tag.tagValue, updatedAt: new Date().toISOString() }
                  : tag
              )
            }));
        } catch (error) {
          SecureLogger.error('Failed to update profile tag', error);
          set({ error: (error as Error).message || 'Failed to update profile tag' });
        }
      },

      removeProfileTag: async (tagId: string, currentUserId?: string) => {
        try {
            const { error } = await supabase
              .from('profile_tags')
              .delete()
              .eq('id', tagId);

            if (error) throw handleSupabaseError(error);

            set(state => ({
              profileTags: state.profileTags.filter(tag => tag.id !== tagId)
            }));
        } catch (error) {
          SecureLogger.error('Failed to remove profile tag', error);
          set({ error: (error as Error).message || 'Failed to remove profile tag' });
        }
      },
      
      fetchUserBehaviors: async (userId: string, currentUserId?: string) => {
        try {
          
            if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, userId, 'fetchUserBehaviors', true)) {
              throw new Error('Access denied to user behaviors');
            }

            const { data, error } = await supabase
              .from('user_behaviors')
              .select('*')
              .eq('user_id', userId)
              .order('recorded_at', { ascending: false })
              .limit(50);

            if (error) throw handleSupabaseError(error);

            const behaviors: UserBehavior[] = data.map((behavior: any) => ({
              id: behavior.id,
              userId: behavior.user_id,
              behaviorType: behavior.behavior_type,
              behaviorData: behavior.behavior_data || {},
              context: behavior.context,
              recordedById: behavior.recorded_by_id,
              recordedAt: behavior.recorded_at,
              organizationId: behavior.organization_id,
            }));

            set({ behaviors });
          } catch (error) {
          SecureLogger.error('Failed to fetch user behaviors', error);
          set({ error: (error as Error).message || 'Failed to fetch user behaviors' });
        }
      },

      trackBehavior: async (userId: string, behaviorType: string, behaviorData: Record<string, unknown>, context?: string, currentUserId?: string) => {
        try {
          
            const { data, error } = await supabase
              .rpc('track_user_behavior', {
                p_user_id: userId,
                p_behavior_type: behaviorType,
                p_behavior_data: behaviorData,
                p_context: context,
                p_recorded_by_id: currentUserId
              });

            if (error) throw handleSupabaseError(error);

            // Refresh behaviors
            get().fetchUserBehaviors(userId, currentUserId);
        } catch (error) {
          SecureLogger.error('Failed to track behavior', error);
          set({ error: (error as Error).message || 'Failed to track behavior' });
        }
      },

      fetchStaffAssignments: async (staffId: string, currentUserId?: string) => {
        try {
            const { data, error } = await supabase
              .from('staff_assignments')
              .select('*')
              .eq('staff_id', staffId)
              .order('created_at', { ascending: false });

            if (error) throw handleSupabaseError(error);

            const assignments: StaffAssignment[] = data.map((assignment: any) => ({
              id: assignment.id,
              staffId: assignment.staff_id,
              supervisorId: assignment.supervisor_id,
              departmentId: assignment.department_id,
              organizationId: assignment.organization_id,
              assignmentType: assignment.assignment_type,
              startDate: assignment.start_date,
              endDate: assignment.end_date,
              assignmentData: assignment.assignment_data || {},
              createdById: assignment.created_by_id,
              createdAt: assignment.created_at,
              updatedAt: assignment.updated_at,
            }));

            set({ staffAssignments: assignments });
        } catch (error) {
          SecureLogger.error('Failed to fetch staff assignments', error);
          set({ error: (error as Error).message || 'Failed to fetch staff assignments' });
        }
      },

      createStaffAssignment: async (assignment: Omit<StaffAssignment, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string) => {
        try {
            const { data, error } = await supabase
              .rpc('assign_staff_to_organization', {
                p_staff_id: assignment.staffId,
                p_organization_id: assignment.organizationId,
                p_supervisor_id: assignment.supervisorId,
                p_department_id: assignment.departmentId,
                p_assigned_by_id: currentUserId
              });

            if (error) throw handleSupabaseError(error);

            // Refresh assignments
            get().fetchStaffAssignments(assignment.staffId, currentUserId);
        } catch (error) {
          SecureLogger.error('Failed to create staff assignment', error);
          set({ error: (error as Error).message || 'Failed to create staff assignment' });
        }
      },

      updateStaffAssignment: async (assignmentId: string, data: Partial<StaffAssignment>, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            set(state => ({
              staffAssignments: state.staffAssignments.map(assignment => 
                assignment.id === assignmentId 
                  ? { ...assignment, ...data, updatedAt: new Date().toISOString() }
                  : assignment
              )
            }));
          } else {
            const updateData: Record<string, unknown> = {
              ...data,
              updated_at: new Date().toISOString()
            };

            const { error } = await supabase
              .from('staff_assignments')
              .update(updateData)
              .eq('id', assignmentId);

            if (error) throw handleSupabaseError(error);

            set(state => ({
              staffAssignments: state.staffAssignments.map(assignment => 
                assignment.id === assignmentId 
                  ? { ...assignment, ...data, updatedAt: new Date().toISOString() }
                  : assignment
              )
            }));
          }
        } catch (error) {
          SecureLogger.error('Failed to update staff assignment', error);
          set({ error: (error as Error).message || 'Failed to update staff assignment' });
        }
      },

      resetProfile: () => {
        set({
          profile: null,
          staffAssignments: [],
          profileTags: [],
          behaviors: []
        });
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({
        profile: state.profile,
        profileTags: state.profileTags,
        behaviors: state.behaviors,
        staffAssignments: state.staffAssignments,
        isLoading: state.isLoading,
        error: state.error
      }),
    }
  )
);

// Helper functions for profile validation
export const validateProfileField = (field: string, value: any): boolean => {
  switch (field) {
    case 'first_name':
    case 'last_name':
      return typeof value === 'string' && value.trim().length >= 2;
    
    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    
    case 'phone':
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
    
    case 'date_of_birth':
    case 'hire_date':
      return value && !isNaN(Date.parse(value));
    
    case 'emergency_contact':
      if (typeof value !== 'object') return false;
      return value.name && value.relationship && value.phone;
    
    case 'skills':
    case 'certifications':
      return Array.isArray(value) && value.length > 0;
    
    case 'education':
    case 'work_experience':
      return Array.isArray(value) && value.every(item => 
        item.degree || item.institution || item.year || 
        item.company || item.position || item.start_date
      );
    
    default:
      return value !== null && value !== undefined && value !== '';
  }
};

export const getProfileCompletionStatus = (percentage: number): {
  status: 'incomplete' | 'partial' | 'complete';
  message: string;
  color: string;
} => {
  if (percentage >= 80) {
    return {
      status: 'complete',
      message: 'Profile is complete',
      color: 'text-green-600'
    };
  } else if (percentage >= 50) {
    return {
      status: 'partial',
      message: 'Profile is partially complete',
      color: 'text-yellow-600'
    };
  } else {
    return {
      status: 'incomplete',
      message: 'Profile needs completion',
      color: 'text-red-600'
    };
  }
};