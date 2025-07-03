import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import AccessControl from '../lib/accessControl';
import SecureLogger from '../lib/secureLogger';
import { useProfileStore } from './profileStore';
import { emailService, UserCreationData } from '../services/emailService';
import { useAssessmentResultsStore } from './assessmentResultsStore';

interface UserProfile {
  phone?: string;
  department?: string;
  jobTitle?: string;
  location?: string;
  bio?: string;
  avatar?: string;
  timezone?: string;
  dateFormat?: string;
  notifications?: {
    emailAssignments: boolean;
    emailReminders: boolean;
    emailResults: boolean;
  };
}

interface UserState {
  users: User[];
  userProfiles: Record<string, UserProfile>;
  isLoading: boolean;
  error: string | null;
  fetchUsers: (organizationId?: string) => Promise<void>;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>, currentUser?: User) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  updateUserProfile: (userId: string, profile: Partial<UserProfile>) => Promise<void>;
  getUserProfile: (userId: string) => UserProfile | null;
}

// Enhanced mock data - ONLY super_admin and org_admin roles
const defaultMockUsers: User[] = [
  {
    id: '1',
    email: 'admin@acme.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'super_admin',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    email: 'orgadmin@acme.com',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'org_admin',
    organizationId: 'demo-org-1',
    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '7',
    email: 'orgadmin@techstart.com',
    firstName: 'Alex',
    lastName: 'Rodriguez',
    role: 'org_admin',
    organizationId: 'demo-org-2',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Default user profiles
const defaultUserProfiles: Record<string, UserProfile> = {
  '1': {
    phone: '+1 (555) 123-4567',
    department: 'Administration',
    jobTitle: 'System Administrator',
    location: 'San Francisco, CA',
    bio: 'Experienced system administrator with expertise in enterprise software management.',
    timezone: 'UTC-8',
    dateFormat: 'MM/DD/YYYY',
    notifications: {
      emailAssignments: true,
      emailReminders: true,
      emailResults: true,
    }
  },
  '2': {
    phone: '+1 (555) 234-5678',
    department: 'Human Resources',
    jobTitle: 'HR Director',
    location: 'New York, NY',
    bio: 'HR professional focused on employee development and organizational growth.',
    timezone: 'UTC-5',
    dateFormat: 'MM/DD/YYYY',
    notifications: {
      emailAssignments: true,
      emailReminders: true,
      emailResults: false,
    }
  },
  '7': {
    phone: '+1 (555) 345-6789',
    department: 'Technology',
    jobTitle: 'Tech Lead',
    location: 'Austin, TX',
    bio: 'Technology leader passionate about innovation and team development.',
    timezone: 'UTC-6',
    dateFormat: 'MM/DD/YYYY',
    notifications: {
      emailAssignments: true,
      emailReminders: false,
      emailResults: true,
    }
  }
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      userProfiles: {},
      isLoading: false,
      error: null,
      
      fetchUsers: async (organizationId?: string, currentUser?: User | null) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { users: persistedUsers, userProfiles: persistedProfiles } = get();
          
          // Merge default users with any custom ones created
          const customUsers = persistedUsers.filter(user => 
            !defaultMockUsers.some(defaultUser => defaultUser.id === user.id)
          );
          
          const allUsers = [...defaultMockUsers, ...customUsers];
          
          // Apply organization filtering with access control
          let filteredUsers = allUsers;
          
          if (organizationId) {
            // Validate access to the requested organization
            if (currentUser && !AccessControl.validateOrganizationAccess(currentUser, organizationId, 'fetchUsers')) {
              throw new Error('Access denied to organization data');
            }
            filteredUsers = allUsers.filter(user => user.organizationId === organizationId);
          } else if (currentUser) {
            // If no specific org requested, filter by user's access level
            filteredUsers = AccessControl.filterByOrganization(allUsers, currentUser, 'fetchUsers');
          }

          // Sanitize user data based on requesting user's permissions
          const sanitizedUsers = filteredUsers.map(user => 
            AccessControl.sanitizeUserData(user, currentUser)
          ).filter(user => Object.keys(user).length > 0) as User[];

          // Merge default profiles with persisted ones
          const allProfiles = { ...defaultUserProfiles, ...persistedProfiles };
            
          set({ 
            users: sanitizedUsers, 
            userProfiles: allProfiles,
            isLoading: false, 
            error: null 
          });
        } catch (error) {
          SecureLogger.error('Failed to fetch users', error);
          set({ error: 'Failed to fetch users', isLoading: false });
        }
      },
      
      createUser: async (data, currentUser?: User) => {
        set({ isLoading: true, error: null });
        try {
          // Validate input
          if (!data.email || !data.firstName || !data.lastName || !data.role || !data.organizationId) {
            throw new Error('All fields are required');
          }

          // Check for duplicate email
          const { users: persistedUsers } = get();
          const allUsers = [...defaultMockUsers, ...persistedUsers];
          
          if (allUsers.some(user => user.email.toLowerCase() === data.email.toLowerCase())) {
            throw new Error('A user with this email already exists');
          }

          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Generate organization and staff IDs using assessment results store functions
          const { generateOrganizationId, generateStaffId } = useAssessmentResultsStore.getState();
          
          // Generate organization ID if not provided
          let organizationId = data.organizationId;
          if (!organizationId && data.organizationName) {
            organizationId = generateOrganizationId(data.organizationName);
          }
          
          // Generate staff ID
          const fullName = `${data.firstName} ${data.lastName}`;
          const staffId = generateStaffId(data.organizationName || 'Organization', fullName);
          
          const newUser: User = {
            ...data,
            id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            email: data.email.toLowerCase().trim(),
            firstName: data.firstName.trim(),
            lastName: data.lastName.trim(),
            organizationId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Create default profile for new user
          const defaultProfile: UserProfile = {
            notifications: {
              emailAssignments: true,
              emailReminders: true,
              emailResults: true,
            },
            timezone: 'UTC-8',
            dateFormat: 'MM/DD/YYYY',
          };

          // Automatically create staff assignment for the new user
          try {
            const { assignStaff } = useProfileStore.getState();
            await assignStaff(
              newUser.id,
              newUser.organizationId,
              undefined, // supervisor will be assigned later
              newUser.departmentId,
              'system' // created by system
            );
            
            SecureLogger.info('Staff assignment created for new user', { 
              userId: newUser.id, 
              organizationId: newUser.organizationId,
              departmentId: newUser.departmentId,
              staffId
            });
          } catch (assignmentError) {
            SecureLogger.warn('Failed to create staff assignment for new user', assignmentError);
            // Don't fail user creation if staff assignment fails
          }

          // Send email notification to the new user
          try {
            const userCreationData: UserCreationData = {
              userId: newUser.id,
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              role: newUser.role,
              organizationId: newUser.organizationId,
              organizationName: data.organizationName || 'Your Organization',
              staffId,
              departmentId: newUser.departmentId,
              departmentName: data.departmentName,
              assignedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Administrator'
            };

            await emailService.sendUserCreationNotification(userCreationData);
            
            SecureLogger.info('User creation email sent successfully', {
              userId: newUser.id,
              email: newUser.email,
              organizationId: newUser.organizationId,
              staffId
            });
          } catch (emailError) {
            SecureLogger.warn('Failed to send user creation email', emailError);
            // Don't fail user creation if email fails
          }
          
          set(state => ({ 
            users: [...state.users, newUser],
            userProfiles: { ...state.userProfiles, [newUser.id]: defaultProfile },
            isLoading: false,
            error: null
          }));

          // Log successful user creation with IDs
          SecureLogger.info('User created successfully', {
            userId: newUser.id,
            email: newUser.email,
            organizationId: newUser.organizationId,
            staffId,
            role: newUser.role,
            createdBy: currentUser?.id || 'system'
          });

        } catch (error) {
          set({ error: (error as Error).message || 'Failed to create user', isLoading: false });
        }
      },
      
      updateUser: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          // Validate input if email is being updated
          if (data.email) {
            const { users: persistedUsers } = get();
            const allUsers = [...defaultMockUsers, ...persistedUsers];
            
            if (allUsers.some(user => user.id !== id && user.email.toLowerCase() === data.email.toLowerCase())) {
              throw new Error('A user with this email already exists');
            }
          }

          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const updatedUsers = state.users.map(user =>
              user.id === id ? { 
                ...user, 
                ...data, 
                email: data.email ? data.email.toLowerCase().trim() : user.email,
                firstName: data.firstName ? data.firstName.trim() : user.firstName,
                lastName: data.lastName ? data.lastName.trim() : user.lastName,
                updatedAt: new Date().toISOString() 
              } : user
            );
              
            return { 
              users: updatedUsers, 
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to update user', isLoading: false });
        }
      },
      
      deleteUser: async (id) => {
        set({ isLoading: true, error: null });
        try {
          // Prevent deletion of system users
          const isSystemUser = defaultMockUsers.some(user => user.id === id);
          if (isSystemUser) {
            throw new Error('System users cannot be deleted');
          }

          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const filteredUsers = state.users.filter(user => user.id !== id);
            const { [id]: removedProfile, ...remainingProfiles } = state.userProfiles;
              
            return { 
              users: filteredUsers,
              userProfiles: remainingProfiles,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to delete user', isLoading: false });
        }
      },

      updateUserProfile: async (userId: string, profile: Partial<UserProfile>) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => ({
            userProfiles: {
              ...state.userProfiles,
              [userId]: {
                ...state.userProfiles[userId],
                ...profile
              }
            },
            isLoading: false,
            error: null
          }));
        } catch (error) {
          set({ error: 'Failed to update profile', isLoading: false });
        }
      },

      getUserProfile: (userId: string) => {
        const { userProfiles } = get();
        return userProfiles[userId] || null;
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        // Only persist custom users and profiles, not the default ones
        users: state.users.filter(user => 
          !defaultMockUsers.some(defaultUser => defaultUser.id === user.id)
        ),
        userProfiles: Object.fromEntries(
          Object.entries(state.userProfiles).filter(([userId]) => 
            !defaultUserProfiles.hasOwnProperty(userId)
          )
        ),
      }),
    }
  )
);