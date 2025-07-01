import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { isDemoMode } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import AccessControl from '../lib/accessControl';

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
  is_first_login: boolean;
  profile_completed: boolean;
  completion_percentage: number;
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
  isFirstLogin: boolean;
  isLoading: boolean;
  error: string | null;
  profileCompleted: boolean;
  completionPercentage: number;
  
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
  assignStaff: (staffId: string, organizationId: string, supervisorId?: string, departmentId?: string, currentUserId?: string) => Promise<void>;
  updateStaffAssignment: (assignmentId: string, data: Partial<StaffAssignment>, currentUserId?: string) => Promise<void>;
  
  // Utility functions
  markFirstLoginComplete: () => Promise<void>;
  calculateCompletionPercentage: () => number;
  resetProfile: () => void;
  clearError: () => void;
}

// Default profile for demo mode
const defaultProfile: Profile = {
  id: 'demo-user',
  user_id: 'demo-user',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  position: 'Software Engineer',
  department: 'Engineering',
  bio: 'Experienced software engineer with a passion for building user-friendly applications.',
  avatar_url: 'https://example.com/john-doe.jpg',
  date_of_birth: '1990-05-15',
  hire_date: '2015-06-01',
  emergency_contact: {
    name: 'Jane Doe',
    relationship: 'Spouse',
    phone: '+1 (555) 555-5555'
  },
  skills: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
  certifications: ['AWS Certified Developer', 'Scrum Master'],
  education: [
    { degree: 'Bachelor of Science', institution: 'University of Tech', year: '2010' },
    { degree: 'Master of Science', institution: 'University of Design', year: '2012' }
  ],
  work_experience: [
    { company: 'Tech Solutions', position: 'Software Engineer', start_date: '2015-06-01', end_date: '2018-05-31', description: 'Developed and maintained web applications' },
    { company: 'Design Co', position: 'UI/UX Designer', start_date: '2018-06-01', description: 'Designed user interfaces and prototypes' }
  ],
  preferences: {
    theme: 'system',
    language: 'en',
    notifications: {
      email: true,
      push: true,
      sms: false
    }
  },
  is_first_login: true,
  profile_completed: false,
  completion_percentage: 0,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

// Default tags for demo mode
const defaultProfileTags: ProfileTag[] = [
  {
    id: 'tag-1',
    userId: 'demo-user',
    tagName: 'javascript',
    tagCategory: 'skill',
    tagValue: { level: 'advanced', yearsExperience: 5 },
    createdById: 'demo-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tag-2',
    userId: 'demo-user',
    tagName: 'leadership',
    tagCategory: 'behavior',
    tagValue: { style: 'collaborative', strength: 'team-building' },
    createdById: 'demo-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tag-3',
    userId: 'demo-user',
    tagName: 'communication',
    tagCategory: 'behavior',
    tagValue: { rating: 4.5, feedback: 'excellent presenter' },
    createdById: 'demo-admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

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
      isFirstLogin: false,
      isLoading: false,
      error: null,
      profileCompleted: false,
      completionPercentage: 0,
      
      fetchProfile: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode) {
            // In demo mode, return default profile
            await new Promise(resolve => setTimeout(resolve, 300));
            set({ 
              profile: { ...defaultProfile, user_id: userId },
              isFirstLogin: true,
              profileCompleted: false,
              completionPercentage: 0,
              isLoading: false 
            });
          } else {
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

            const completionPercentage = get().calculateCompletionPercentage();
            const isFirstLogin = data.is_first_login || false;
            const profileCompleted = data.profile_completed || false;

            set({
              profile: data,
              isFirstLogin,
              profileCompleted,
              completionPercentage,
              isLoading: false
            });
          }
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
          
          if (isDemoMode) {
            // In demo mode, just update the local state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set(state => ({
              profile: {
                ...state.profile!,
                ...updates
              },
              isLoading: false
            }));
          } else {
            // Validate access
            if (!AccessControl.validateUserAccess({ id: currentProfile.user_id } as any, currentProfile.user_id, 'updateProfile', false)) {
              throw new Error('Access denied to update profile');
            }

            const updatedProfile = { ...currentProfile, ...updates, updated_at: new Date().toISOString() };
            
            // Calculate completion percentage
            const completionPercentage = get().calculateCompletionPercentage();
            const profileCompleted = completionPercentage >= 80; // 80% threshold

            const finalUpdates = {
              ...updates,
              completion_percentage: completionPercentage,
              profile_completed: profileCompleted,
              updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
              .from('profiles')
              .upsert({
                user_id: currentProfile.user_id,
                ...finalUpdates
              })
              .select()
              .single();

            if (error) throw handleSupabaseError(error);

            set({
              profile: data,
              profileCompleted,
              completionPercentage,
              isLoading: false
            });
          }
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
          if (isDemoMode) {
            set({ profileTags: defaultProfileTags });
          } else {
            if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, userId, 'fetchProfileTags', true)) {
              throw new Error('Access denied to profile tags');
            }

            const { data, error } = await supabase
              .from('profile_tags')
              .select('*')
              .eq('user_id', userId)
              .order('created_at', { ascending: false });

            if (error) throw handleSupabaseError(error);

            const tags: ProfileTag[] = data.map(tag => ({
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
          }
        } catch (error) {
          SecureLogger.error('Failed to fetch profile tags', error);
          set({ error: (error as Error).message || 'Failed to fetch profile tags' });
        }
      },

      addProfileTag: async (userId: string, tagName: string, tagCategory = 'behavior', tagValue = {}, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            const newTag: ProfileTag = {
              id: `tag-${Date.now()}`,
              userId,
              tagName,
              tagCategory,
              tagValue,
              createdById: currentUserId || 'demo-user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            set(state => ({
              profileTags: [...state.profileTags, newTag]
            }));
          } else {
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
          }
        } catch (error) {
          SecureLogger.error('Failed to add profile tag', error);
          set({ error: (error as Error).message || 'Failed to add profile tag' });
        }
      },

      updateProfileTag: async (tagId: string, tagName?: string, tagValue?: Record<string, unknown>, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            set(state => ({
              profileTags: state.profileTags.map(tag => 
                tag.id === tagId 
                  ? { ...tag, tagName: tagName || tag.tagName, tagValue: tagValue || tag.tagValue, updatedAt: new Date().toISOString() }
                  : tag
              )
            }));
          } else {
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
          }
        } catch (error) {
          SecureLogger.error('Failed to update profile tag', error);
          set({ error: (error as Error).message || 'Failed to update profile tag' });
        }
      },

      removeProfileTag: async (tagId: string, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            set(state => ({
              profileTags: state.profileTags.filter(tag => tag.id !== tagId)
            }));
          } else {
            const { error } = await supabase
              .from('profile_tags')
              .delete()
              .eq('id', tagId);

            if (error) throw handleSupabaseError(error);

            set(state => ({
              profileTags: state.profileTags.filter(tag => tag.id !== tagId)
            }));
          }
        } catch (error) {
          SecureLogger.error('Failed to remove profile tag', error);
          set({ error: (error as Error).message || 'Failed to remove profile tag' });
        }
      },
      
      fetchUserBehaviors: async (userId: string, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            // Mock behavior data for demo
            const mockBehaviors: UserBehavior[] = [
              {
                id: 'behavior-1',
                userId,
                behaviorType: 'assessment_completion',
                behaviorData: { assessmentId: 'preset-assessment-1', completionTime: 25, score: 85 },
                context: 'Leadership Excellence Assessment',
                recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                organizationId: 'demo-org-1'
              },
              {
                id: 'behavior-2',
                userId,
                behaviorType: 'skill_demonstration',
                behaviorData: { skill: 'communication', rating: 4.5, feedback: 'excellent presentation skills' },
                context: 'Team meeting presentation',
                recordedById: 'supervisor-1',
                recordedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                organizationId: 'demo-org-1'
              }
            ];
            set({ behaviors: mockBehaviors });
          } else {
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

            const behaviors: UserBehavior[] = data.map(behavior => ({
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
          }
        } catch (error) {
          SecureLogger.error('Failed to fetch user behaviors', error);
          set({ error: (error as Error).message || 'Failed to fetch user behaviors' });
        }
      },

      trackBehavior: async (userId: string, behaviorType: string, behaviorData: Record<string, unknown>, context?: string, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            const newBehavior: UserBehavior = {
              id: `behavior-${Date.now()}`,
              userId,
              behaviorType,
              behaviorData,
              context,
              recordedById: currentUserId,
              recordedAt: new Date().toISOString(),
              organizationId: 'demo-org-1'
            };
            
            set(state => ({
              behaviors: [newBehavior, ...state.behaviors]
            }));
          } else {
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
          }
        } catch (error) {
          SecureLogger.error('Failed to track behavior', error);
          set({ error: (error as Error).message || 'Failed to track behavior' });
        }
      },

      fetchStaffAssignments: async (staffId: string, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            // Mock assignment data
            const mockAssignments: StaffAssignment[] = [
              {
                id: 'assignment-1',
                staffId,
                supervisorId: 'supervisor-1',
                departmentId: 'dept-1',
                organizationId: 'demo-org-1',
                assignmentType: 'permanent',
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                assignmentData: { role: 'Senior Developer', team: 'Frontend' },
                createdById: 'admin-1',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
              }
            ];
            set({ staffAssignments: mockAssignments });
          } else {
            const { data, error } = await supabase
              .from('staff_assignments')
              .select('*')
              .eq('staff_id', staffId)
              .order('created_at', { ascending: false });

            if (error) throw handleSupabaseError(error);

            const assignments: StaffAssignment[] = data.map(assignment => ({
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
          }
        } catch (error) {
          SecureLogger.error('Failed to fetch staff assignments', error);
          set({ error: (error as Error).message || 'Failed to fetch staff assignments' });
        }
      },

      assignStaff: async (staffId: string, organizationId: string, supervisorId?: string, departmentId?: string, currentUserId?: string) => {
        try {
          if (isDemoMode) {
            const newAssignment: StaffAssignment = {
              id: `assignment-${Date.now()}`,
              staffId,
              supervisorId,
              departmentId,
              organizationId,
              assignmentType: 'permanent',
              startDate: new Date().toISOString(),
              assignmentData: {},
              createdById: currentUserId || 'admin',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            set(state => ({
              staffAssignments: [newAssignment, ...state.staffAssignments]
            }));
          } else {
            const { data, error } = await supabase
              .rpc('assign_staff_to_organization', {
                p_staff_id: staffId,
                p_organization_id: organizationId,
                p_supervisor_id: supervisorId,
                p_department_id: departmentId,
                p_assigned_by_id: currentUserId
              });

            if (error) throw handleSupabaseError(error);

            // Refresh assignments
            get().fetchStaffAssignments(staffId, currentUserId);
          }
        } catch (error) {
          SecureLogger.error('Failed to assign staff', error);
          set({ error: (error as Error).message || 'Failed to assign staff' });
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

      markFirstLoginComplete: async () => {
        try {
          const currentProfile = get().profile;
          if (!currentProfile) {
            throw new Error('No profile to update');
          }

          await get().updateProfile({
            is_first_login: false
          });

          set({ isFirstLogin: false });
        } catch (error) {
          console.error('Error marking first login complete:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to mark first login complete'
          });
        }
      },

      calculateCompletionPercentage: () => {
        const profile = get().profile;
        if (!profile) return 0;

        let completedFields = 0;
        let totalFields = REQUIRED_FIELDS.length + OPTIONAL_FIELDS.length;

        // Check required fields
        REQUIRED_FIELDS.forEach(field => {
          const value = profile[field as keyof Profile];
          if (value !== null && value !== undefined && value !== '') {
            if (typeof value === 'object') {
              // For complex objects like emergency_contact
              if (field === 'emergency_contact') {
                const contact = value as any;
                if (contact.name && contact.relationship && contact.phone) {
                  completedFields++;
                }
              }
            } else if (Array.isArray(value)) {
              // For arrays like skills, certifications
              if (value.length > 0) {
                completedFields++;
              }
            } else {
              completedFields++;
            }
          }
        });

        // Check optional fields (weighted less)
        OPTIONAL_FIELDS.forEach(field => {
          const value = profile[field as keyof Profile];
          if (value !== null && value !== undefined && value !== '') {
            if (Array.isArray(value)) {
              if (value.length > 0) {
                completedFields += 0.5; // Half weight for optional fields
              }
            } else if (typeof value === 'object') {
              // For complex objects like preferences
              if (Object.keys(value).length > 0) {
                completedFields += 0.5;
              }
            } else {
              completedFields += 0.5;
            }
          }
        });

        // Calculate percentage (required fields are worth more)
        const requiredWeight = REQUIRED_FIELDS.length * 1.5; // 1.5x weight for required fields
        const optionalWeight = OPTIONAL_FIELDS.length * 0.5; // 0.5x weight for optional fields
        const totalWeight = requiredWeight + optionalWeight;

        const percentage = Math.round((completedFields / totalWeight) * 100);
        return Math.min(percentage, 100); // Cap at 100%
      },

             resetProfile: () => {
         set({
           profile: null,
           isFirstLogin: false,
           profileCompleted: false,
           completionPercentage: 0
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
        isFirstLogin: state.isFirstLogin,
        profileCompleted: state.profileCompleted,
        completionPercentage: state.completionPercentage
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