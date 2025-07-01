import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import { config, isDemoMode } from '../config/environment';
import { User, LoginCredentials } from '../types';
import SecureLogger from '../lib/secureLogger';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  sendOTP: (email: string, organizationId: string) => Promise<void>;
  verifyOTP: (email: string, otp: string, organizationId: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setNewPassword: (token: string, password: string) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
  hasPermission: (permission: string) => boolean;
  // Add abort controller to cancel requests
  _abortController: AbortController | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,
      _abortController: null,
      
      clearError: () => set({ error: null }),
      
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode) {
            // Demo mode login
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const demoCredentials = [
              { 
                email: 'admin@acme.com', 
                password: 'password123', 
                organizationId: 'demo-org-1',
                user: {
                  id: '1',
                  email: 'admin@acme.com',
                  firstName: 'Sarah',
                  lastName: 'Johnson',
                  role: 'super_admin' as const,
                  organizationId: 'demo-org-1',
                  createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
              },
              { 
                email: 'orgadmin@acme.com', 
                password: 'password123', 
                organizationId: 'demo-org-1',
                user: {
                  id: '2',
                  email: 'orgadmin@acme.com',
                  firstName: 'Michael',
                  lastName: 'Chen',
                  role: 'org_admin' as const,
                  organizationId: 'demo-org-1',
                  departmentId: 'dept-1',
                  createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
              },
              { 
                email: 'orgadmin@techstart.com', 
                password: 'password123', 
                organizationId: 'demo-org-2',
                user: {
                  id: '7',
                  email: 'orgadmin@techstart.com',
                  firstName: 'Alex',
                  lastName: 'Rodriguez',
                  role: 'org_admin' as const,
                  organizationId: 'demo-org-2',
                  createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
              },
              { 
                email: 'orgadmin@global.com', 
                password: 'password123', 
                organizationId: 'demo-org-3',
                user: {
                  id: '8',
                  email: 'orgadmin@global.com',
                  firstName: 'Emma',
                  lastName: 'Davis',
                  role: 'org_admin' as const,
                  organizationId: 'demo-org-3',
                  createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
              },
              { 
                email: 'subscriber@acme.com', 
                password: 'password123', 
                organizationId: 'demo-org-1',
                user: {
                  id: '9',
                  email: 'subscriber@acme.com',
                  firstName: 'Robert',
                  lastName: 'Taylor',
                  role: 'subscriber' as const,
                  organizationId: 'demo-org-1',
                  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                }
              }
            ];
            
            // Check if organization ID matches
            const validCredential = demoCredentials.find(
              cred => cred.email === credentials.email && 
                     cred.password === credentials.password &&
                     cred.organizationId === credentials.organizationId
            );
            
            if (validCredential) {
              set({ user: validCredential.user, isLoading: false });
            } else {
              throw new Error('Invalid organization ID, email, or password. Try one of these demo accounts:\n\n• admin@acme.com / password123 / demo-org-1 (Super Admin)\n• orgadmin@acme.com / password123 / demo-org-1 (Organization Admin - Acme)\n• orgadmin@techstart.com / password123 / demo-org-2 (Organization Admin - TechStart)\n• orgadmin@global.com / password123 / demo-org-3 (Organization Admin - Global)\n• subscriber@acme.com / password123 / demo-org-1 (Subscriber - Acme)');
            }
          } else {
            // Production Supabase login with enhanced error handling
            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            // Verify organization ID first
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('id')
              .eq('id', credentials.organizationId)
              .single();

            if (orgError || !orgData) {
              throw new Error('Invalid organization ID. Please check and try again.');
            }

            const { data, error } = await supabase.auth.signInWithPassword({
              email: credentials.email.trim().toLowerCase(),
              password: credentials.password,
            });

            if (error) {
              // Enhanced error messages for production
              if (error.message.includes('Invalid login credentials')) {
                throw new Error('Invalid email or password. Please check your credentials and try again.');
              } else if (error.message.includes('Email not confirmed')) {
                throw new Error('Please check your email and click the confirmation link before signing in.');
              } else if (error.message.includes('Too many requests')) {
                throw new Error('Too many login attempts. Please wait a few minutes before trying again.');
              } else {
                throw new Error(`Login failed: ${error.message}`);
              }
            }

            if (data.user) {
              // Cancel any previous request
              const currentController = get()._abortController;
              if (currentController) {
                currentController.abort();
              }
              
              // Create new abort controller for this request
              const abortController = new AbortController();
              set({ _abortController: abortController });

              // Fetch user profile from database with race condition protection
              let retries = 3;
              let profile = null;
              
              while (retries > 0 && !profile && !abortController.signal.aborted) {
                try {
                  const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .abortSignal(abortController.signal)
                    .single();

                  if (profileError) {
                    if (profileError.code === 'PGRST116') {
                      throw new Error('User profile not found. Please contact your administrator.');
                    }
                    throw profileError;
                  }

                  profile = profileData;
                } catch (err: any) {
                  if (err.name === 'AbortError') {
                    // Request was cancelled, exit gracefully
                    return;
                  }
                  retries--;
                  if (retries === 0) throw err;
                  
                  // Use AbortController with timeout instead of raw setTimeout
                  await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(resolve, 1000);
                    abortController.signal.addEventListener('abort', () => {
                      clearTimeout(timeoutId);
                      reject(new Error('AbortError'));
                    });
                  });
                }
              }
              
              // Clear abort controller after successful completion
              set({ _abortController: null });

              if (!profile) {
                throw new Error('Unable to load user profile. Please try again.');
              }

              // Verify that the user belongs to the specified organization
              if (profile.organization_id !== credentials.organizationId) {
                throw new Error('You do not have access to this organization. Please check your organization ID and try again.');
              }

              const user: User = {
                id: profile.id,
                email: profile.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                role: profile.role,
                organizationId: profile.organization_id,
                departmentId: profile.department_id,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at
              };

              set({ user, isLoading: false });
            }
          }
        } catch (error) {
          console.error('Login error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      sendOTP: async (email: string, organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const cleanEmail = email.trim().toLowerCase();
          
          if (isDemoMode) {
            // Demo mode OTP
            await new Promise(resolve => setTimeout(resolve, 1000));
            SecureLogger.demo('OTP sent for organization', 'otp-send');
          } else {
            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            // Verify organization ID first
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('id')
              .eq('id', organizationId)
              .single();

            if (orgError || !orgData) {
              throw new Error('Invalid organization ID. Please check and try again.');
            }

            // Verify user belongs to the organization
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, organization_id')
              .eq('email', cleanEmail)
              .eq('organization_id', organizationId)
              .single();

            if (userError || !userData) {
              throw new Error('No account found with this email in the specified organization.');
            }

            const { error } = await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                emailRedirectTo: `${config.app.url}/auth/callback`,
                shouldCreateUser: false, // Only allow existing users
              },
            });
            
            if (error) {
              if (error.message.includes('User not found')) {
                throw new Error('No account found with this email address. Please contact your administrator.');
              } else if (error.message.includes('Email rate limit exceeded')) {
                throw new Error('Too many OTP requests. Please wait before requesting another code.');
              } else {
                throw new Error(`Failed to send OTP: ${error.message}`);
              }
            }
          }
          set({ isLoading: false });
        } catch (error) {
          console.error('OTP send error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      verifyOTP: async (email: string, otp: string, organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const cleanEmail = email.trim().toLowerCase();
          const cleanOTP = otp.trim();
          
          if (isDemoMode) {
            // Demo mode OTP verification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // For demo, accept any 6-digit code
            if (cleanOTP.length === 6 && /^\d+$/.test(cleanOTP)) {
              // Find demo user by email and organization
              const demoUsers = [
                {
                  email: 'admin@acme.com',
                  organizationId: 'demo-org-1',
                  user: {
                    id: '1',
                    email: 'admin@acme.com',
                    firstName: 'Sarah',
                    lastName: 'Johnson',
                    role: 'super_admin' as const,
                    organizationId: 'demo-org-1',
                    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                  }
                },
                {
                  email: 'orgadmin@acme.com',
                  organizationId: 'demo-org-1',
                  user: {
                    id: '2',
                    email: 'orgadmin@acme.com',
                    firstName: 'Michael',
                    lastName: 'Chen',
                    role: 'org_admin' as const,
                    organizationId: 'demo-org-1',
                    departmentId: 'dept-1',
                    createdAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                  }
                },
                {
                  email: 'subscriber@acme.com',
                  organizationId: 'demo-org-1',
                  user: {
                    id: '9',
                    email: 'subscriber@acme.com',
                    firstName: 'Robert',
                    lastName: 'Taylor',
                    role: 'subscriber' as const,
                    organizationId: 'demo-org-1',
                    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
                  }
                }
              ];
              
              const demoUser = demoUsers.find(u => u.email === cleanEmail && u.organizationId === organizationId);
              if (demoUser) {
                set({ user: demoUser.user, isLoading: false });
              } else {
                throw new Error('User not found in the specified organization');
              }
            } else {
              throw new Error('Invalid OTP format. Please enter a 6-digit code.');
            }
          } else {
            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            // Verify organization ID first
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .select('id')
              .eq('id', organizationId)
              .single();

            if (orgError || !orgData) {
              throw new Error('Invalid organization ID. Please check and try again.');
            }

            const { data, error } = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token: cleanOTP,
              type: 'email',
            });

            if (error) {
              if (error.message.includes('Token has expired')) {
                throw new Error('OTP has expired. Please request a new code.');
              } else if (error.message.includes('Invalid token')) {
                throw new Error('Invalid OTP. Please check the code and try again.');
              } else {
                throw new Error(`OTP verification failed: ${error.message}`);
              }
            }

            if (data.user) {
              // Fetch user profile with retry logic
              let retries = 3;
              let profile = null;
              
              while (retries > 0 && !profile) {
                try {
                  const { data: profileData, error: profileError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                  if (profileError) throw profileError;
                  profile = profileData;
                } catch (err) {
                  retries--;
                  if (retries === 0) throw err;
                  await new Promise(resolve => setTimeout(resolve, 1000));
                }
              }

              if (!profile) {
                throw new Error('Unable to load user profile. Please try again.');
              }

              // Verify that the user belongs to the specified organization
              if (profile.organization_id !== organizationId) {
                throw new Error('You do not have access to this organization. Please check your organization ID and try again.');
              }

              const user: User = {
                id: profile.id,
                email: profile.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                role: profile.role,
                organizationId: profile.organization_id,
                departmentId: profile.department_id,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at
              };

              set({ user, isLoading: false });
            }
          }
        } catch (error) {
          console.error('OTP verification error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      logout: async () => {
        set({ isLoading: true, error: null });
        try {
          if (!isDemoMode && supabase) {
            const { error } = await supabase.auth.signOut();
            if (error) {
              SecureLogger.warn('Logout error occurred', { type: 'logout' });
              // Don't throw error for logout, just log it
            }
          }
          set({ user: null, error: null, isLoading: false });
        } catch (error) {
          console.error('Logout error:', error);
          // Force logout even if there's an error
          set({ user: null, error: null, isLoading: false });
        }
      },
      
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const cleanEmail = email.trim().toLowerCase();
          
          if (isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            SecureLogger.demo('Password reset email would be sent', 'password-reset');
          } else {
            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
              redirectTo: `${config.app.url}/reset-password`,
            });
            
            if (error) {
              if (error.message.includes('User not found')) {
                throw new Error('No account found with this email address.');
              } else if (error.message.includes('Email rate limit exceeded')) {
                throw new Error('Too many reset requests. Please wait before requesting another reset.');
              } else {
                throw new Error(`Password reset failed: ${error.message}`);
              }
            }
          }
          set({ isLoading: false });
        } catch (error) {
          console.error('Password reset error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      setNewPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            SecureLogger.demo('Password would be updated', 'password-update');
          } else {
            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            const { error } = await supabase.auth.updateUser({ password });
            if (error) {
              if (error.message.includes('Password should be at least')) {
                throw new Error('Password must be at least 8 characters long.');
              } else {
                throw new Error(`Password update failed: ${error.message}`);
              }
            }
          }
          set({ isLoading: false });
        } catch (error) {
          console.error('Set password error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      updatePassword: async (currentPassword: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          if (isDemoMode) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            SecureLogger.demo('Password would be updated', 'password-change');
          } else {
            const { user } = get();
            if (!user) throw new Error('No user logged in');

            if (!supabase) {
              throw new Error('Database connection not available. Please check your configuration.');
            }

            // Re-authenticate with current password
            const { error: authError } = await supabase.auth.signInWithPassword({
              email: user.email,
              password: currentPassword,
            });

            if (authError) {
              if (authError.message.includes('Invalid login credentials')) {
                throw new Error('Current password is incorrect.');
              } else {
                throw new Error(`Authentication failed: ${authError.message}`);
              }
            }

            // Update to new password
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) {
              if (error.message.includes('Password should be at least')) {
                throw new Error('New password must be at least 8 characters long.');
              } else {
                throw new Error(`Password update failed: ${error.message}`);
              }
            }
          }
          set({ isLoading: false });
        } catch (error) {
          console.error('Update password error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      refreshSession: async () => {
        if (!isDemoMode && supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              // Refresh user data from database
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profile) {
                const user: User = {
                  id: profile.id,
                  email: profile.email,
                  firstName: profile.first_name,
                  lastName: profile.last_name,
                  role: profile.role,
                  organizationId: profile.organization_id,
                  departmentId: profile.department_id,
                  createdAt: profile.created_at,
                  updatedAt: profile.updated_at
                };
                set({ user });
              }
            }
          } catch (error) {
            console.error('Session refresh error:', error);
            // Don't throw error for session refresh
          }
        }
      },

      hasPermission: (permission: string) => {
        const { user } = get();
        
        // No user, no permissions
        if (!user) return false;
        
        // Super admin has all permissions
        if (user.role === 'super_admin') return true;
        
        // For org admins, check specific permissions
        if (user.role === 'org_admin') {
          // In demo mode, simulate permission checks
          if (isDemoMode) {
            // Default permissions for demo org admins
            const defaultPermissions = [
              'manage_users',
              'assign_assessments',
              'manage_relationships'
            ];
            
            // Special case for Acme Corp (demo-org-1) - they have all permissions
            if (user.organizationId === 'demo-org-1') {
              return true;
            }
            
            return defaultPermissions.includes(permission);
          }
          
          // In production, this would check against the database
          // For now, we'll return true for basic permissions
          return ['manage_users', 'assign_assessments', 'manage_relationships'].includes(permission);
        }
        
        // Subscribers have limited permissions
        if (user.role === 'subscriber') {
          // Subscribers can only view, not modify
          return permission.startsWith('view_');
        }
        
        // Employees and reviewers have very limited permissions
        return false;
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
      }),
    }
  )
);

// Auto-refresh session on app start with error handling
if (!isDemoMode && supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    try {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logout();
      } else if (event === 'SIGNED_IN' && session?.user) {
        useAuthStore.getState().refreshSession();
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        useAuthStore.getState().refreshSession();
      }
    } catch (error) {
      console.error('Auth state change error:', error);
    }
  });
}