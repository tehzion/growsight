import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { isDemoMode } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import AccessControl from '../lib/accessControl';

interface UserProfile {
  userId: string;
  phone?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  dateFormat?: string;
  skills?: string[];
  interests?: string[];
  certifications?: string[];
  yearsOfExperience?: string;
  education?: string;
  preferredLanguage?: string;
  departmentId?: string;
  organizationId?: string;
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
  profile: UserProfile | null;
  profileTags: ProfileTag[];
  behaviors: UserBehavior[];
  staffAssignments: StaffAssignment[];
  isFirstLogin: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Profile management
  fetchProfile: (userId: string, currentUserId?: string) => Promise<void>;
  updateProfile: (data: Partial<Omit<UserProfile, 'userId'>>, currentUserId?: string) => Promise<void>;
  
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
  setFirstLoginComplete: () => void;
  clearError: () => void;
}

// Default profile for demo mode
const defaultProfile: UserProfile = {
  userId: 'demo-user',
  phone: '+1 (555) 123-4567',
  jobTitle: 'Software Engineer',
  location: 'San Francisco, CA',
  bio: 'Experienced software engineer with a passion for building user-friendly applications.',
  skills: ['JavaScript', 'React', 'TypeScript', 'Node.js'],
  interests: ['Web Development', 'UI/UX Design', 'Open Source'],
  certifications: ['AWS Certified Developer', 'Scrum Master'],
  yearsOfExperience: '5-10',
  education: 'bachelor',
  preferredLanguage: 'en',
  organizationId: 'demo-org-1',
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

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      profileTags: [],
      behaviors: [],
      staffAssignments: [],
      isFirstLogin: true,
      isLoading: false,
      error: null,
      
      fetchProfile: async (userId: string, currentUserId?: string) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode) {
            // In demo mode, return default profile
            await new Promise(resolve => setTimeout(resolve, 300));
            set({ 
              profile: { ...defaultProfile, userId },
              isLoading: false 
            });
          } else {
            // Validate access
            if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, userId, 'fetchProfile', true)) {
              throw new Error('Access denied to user profile');
            }

            const { data, error } = await supabase
              .from('users')
              .select(`
                id, email, first_name, last_name, organization_id, department_id,
                phone, job_title, location, bio, avatar_url, timezone, date_format,
                skills, interests, certifications, years_of_experience, 
                education, preferred_language
              `)
              .eq('id', userId)
              .single();

            if (error) throw handleSupabaseError(error);

            const profile: UserProfile = {
              userId: data.id,
              phone: data.phone,
              jobTitle: data.job_title,
              location: data.location,
              bio: data.bio,
              avatarUrl: data.avatar_url,
              timezone: data.timezone,
              dateFormat: data.date_format,
              skills: data.skills || [],
              interests: data.interests || [],
              certifications: data.certifications || [],
              yearsOfExperience: data.years_of_experience,
              education: data.education,
              preferredLanguage: data.preferred_language,
              departmentId: data.department_id,
              organizationId: data.organization_id,
            };

            set({ profile, isLoading: false });
          }
        } catch (error) {
          SecureLogger.error('Failed to fetch profile', error);
          set({ 
            error: (error as Error).message || 'Failed to fetch profile', 
            isLoading: false 
          });
        }
      },
      
      updateProfile: async (data, currentUserId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const { profile } = get();
          
          if (!profile) {
            throw new Error('No profile loaded');
          }
          
          if (isDemoMode) {
            // In demo mode, just update the local state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set(state => ({
              profile: {
                ...state.profile!,
                ...data
              },
              isLoading: false
            }));
          } else {
            // Validate access
            if (currentUserId && !AccessControl.validateUserAccess({ id: currentUserId } as any, profile.userId, 'updateProfile', false)) {
              throw new Error('Access denied to update profile');
            }

            const { error } = await supabase
              .from('users')
              .update({
                phone: data.phone,
                job_title: data.jobTitle,
                location: data.location,
                bio: data.bio,
                avatar_url: data.avatarUrl,
                timezone: data.timezone,
                date_format: data.dateFormat,
                skills: data.skills,
                interests: data.interests,
                certifications: data.certifications,
                years_of_experience: data.yearsOfExperience,
                education: data.education,
                preferred_language: data.preferredLanguage,
                updated_at: new Date().toISOString()
              })
              .eq('id', profile.userId);

            if (error) throw handleSupabaseError(error);

            set(state => ({
              profile: {
                ...state.profile!,
                ...data
              },
              isLoading: false
            }));
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

      setFirstLoginComplete: () => {
        set({ isFirstLogin: false });
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
        isFirstLogin: state.isFirstLogin
      }),
    }
  )
);