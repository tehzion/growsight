import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import AccessControl from '../lib/accessControl';
import SecureLogger from '../lib/secureLogger';
import { useProfileStore } from './profileStore';
import { emailService, UserCreationData } from '../services/emailService';
import { useAssessmentResultsStore } from './assessmentResultsStore';



export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      isLoading: false,
      error: null,
      
      fetchUsers: async (organizationId?: string, currentUser?: User | null) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { users: persistedUsers } = get();
          
          const allUsers = [...persistedUsers];
          
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

          set({ 
            users: sanitizedUsers, 
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
          const allUsers = [...persistedUsers];
          
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
            updatedAt: new Date().toISOString(),
            requiresPasswordChange: true
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

            if (newUser.role === 'org_admin') {
              await emailNotificationService.sendOrgAdminAccountCreatedNotification({
                recipientEmail: newUser.email,
                recipientName: `${newUser.firstName} ${newUser.lastName}`,
                organizationId: newUser.organizationId,
                loginUrl: `${config.app.url}/login`
              });
            } else {
              await emailService.sendUserCreationNotification(userCreationData);
            }
            
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
            const allUsers = [...persistedUsers];
            
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
          await new Promise(resolve => setTimeout(resolve, 300));
          
          set(state => {
            const filteredUsers = state.users.filter(user => user.id !== id);
              
            return { 
              users: filteredUsers,
              isLoading: false,
              error: null
            };
          });
        } catch (error) {
          set({ error: (error as Error).message || 'Failed to delete user', isLoading: false });
        }
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        users: state.users,
      }),
    }
  )
);