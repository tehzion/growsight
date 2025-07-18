import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';
import AccessControl from '../lib/accessControl';
import SecureLogger from '../lib/secureLogger';
import { useProfileStore } from './profileStore';
import { emailService, UserCreationData } from '../services/emailService';
import { useAssessmentResultsStore } from './assessmentResultsStore';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { config } from '../config/environment';
import { emailNotificationService } from '../services/emailNotificationService';


interface UserState {
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchUsers: (organizationId?: string, currentUser?: User | null) => Promise<void>;
  createUser: (data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    organizationId: string;
    departmentId?: string;
    organizationName?: string;
    departmentName?: string;
  }, currentUser?: User) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      isLoading: false,
      error: null,
      
      fetchUsers: async (organizationId?: string, currentUser?: User | null | undefined) => {
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
            AccessControl.sanitizeUserData(user, currentUser || null)
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

          // Check for duplicate email in Supabase
          const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', data.email.toLowerCase().trim())
            .eq('is_active', true)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingUser) {
            throw new Error('A user with this email already exists');
          }

          // Generate temporary password
          const tempPassword = 'Temp' + Math.random().toString(36).substring(2, 10) + '!';

          // Create user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: data.email.toLowerCase().trim(),
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              first_name: data.firstName.trim(),
              last_name: data.lastName.trim(),
              role: data.role,
              organization_id: data.organizationId,
              requires_password_change: true
            }
          });

          if (authError) {
            if (authError.message.includes('User already registered')) {
              throw new Error('A user with this email already exists');
            }
            throw new Error(`Failed to create user account: ${authError.message}`);
          }

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          // Create user profile in database
          const { data: profileData, error: profileError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: data.email.toLowerCase().trim(),
              first_name: data.firstName.trim(),
              last_name: data.lastName.trim(),
              role: data.role,
              organization_id: data.organizationId,
              department_id: data.departmentId,
              requires_password_change: true,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (profileError) {
            // If profile creation fails, delete the auth user
            await supabase.auth.admin.deleteUser(authData.user.id);
            throw profileError;
          }

          const newUser: User = {
            id: profileData.id,
            email: profileData.email,
            firstName: profileData.first_name,
            lastName: profileData.last_name,
            role: profileData.role,
            organizationId: profileData.organization_id,
            departmentId: profileData.department_id,
            createdAt: profileData.created_at,
            updatedAt: profileData.updated_at,
            requiresPasswordChange: profileData.requires_password_change || true
          };

          // Send email notification to the new user with temporary password
          try {
            const userCreationData: UserCreationData = {
              userId: newUser.id,
              email: newUser.email,
              firstName: newUser.firstName,
              lastName: newUser.lastName,
              role: newUser.role,
              organizationId: newUser.organizationId,
              organizationName: data.organizationName || 'Your Organization',
              staffId: `STF-${Date.now()}`,
              departmentId: newUser.departmentId,
              departmentName: data.departmentName,
              assignedBy: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'System Administrator',
              temporaryPassword: tempPassword
            };

            if (newUser.role === 'org_admin') {
              await emailNotificationService.sendOrgAdminAccountCreatedNotification({
                recipientEmail: newUser.email,
                recipientName: `${newUser.firstName} ${newUser.lastName}`,
                organizationId: newUser.organizationId,
                loginUrl: `${config.app.url}/login`,
                temporaryPassword: tempPassword
              });
            } else {
              await emailService.sendUserCreationNotification(userCreationData);
            }
            
            SecureLogger.info(`User creation email sent successfully for ${newUser.email}`);
          } catch (emailError) {
            SecureLogger.warn('Failed to send user creation email', emailError);
            // Don't fail user creation if email fails
          }
          
          set((state: any) => ({ 
            users: [...state.users, newUser],
            isLoading: false,
            error: null
          }));

          // Log successful user creation
          SecureLogger.info(`User created successfully: ${newUser.email} (${newUser.role})`);

        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },
      
      updateUser: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          // Validate input if email is being updated
          if (data.email && data.email.trim()) {
            const { users: persistedUsers } = get();
            const allUsers = [...persistedUsers];
            
            if (allUsers.some(user => user.id !== id && user.email.toLowerCase() === data.email!.toLowerCase())) {
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

