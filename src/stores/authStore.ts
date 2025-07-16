import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { emailService } from '../services/emailService';
import { config } from '../config/environment';
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
                updatedAt: profile.updated_at,
                requiresPasswordChange: profile.requires_password_change || false
              };

              set({ user, isLoading: false });

              // Redirect to password reset if required
              if (user.requiresPasswordChange) {
                throw new Error('PASSWORD_RESET_REQUIRED');
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
                updatedAt: profile.updated_at,
                requiresPasswordChange: profile.requires_password_change || false
              };

              set({ user, isLoading: false });

              // Redirect to password reset if required
              if (user.requiresPasswordChange) {
                throw new Error('PASSWORD_RESET_REQUIRED');
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
          if (supabase) {
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
          set({ isLoading: false });
        } catch (error) {
          console.error('Password reset error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },
      
      setNewPassword: async (token: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
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

            // Update requiresPasswordChange flag in user profile
            if (get().user) {
              const { error: updateError } = await supabase
                .from('users')
                .update({ requires_password_change: false })
                .eq('id', get().user.id);
              
              if (updateError) {
                SecureLogger.error('Failed to update requires_password_change flag', updateError);
              }
              set(state => ({ user: state.user ? { ...state.user, requiresPasswordChange: false } : null }));
            }

            // Update requiresPasswordChange flag in user profile
            if (get().user) {
              const { error: updateError } = await supabase
                .from('users')
                .update({ requires_password_change: false })
                .eq('id', get().user.id);
              
              if (updateError) {
                SecureLogger.error('Failed to update requires_password_change flag', updateError);
              }
              set(state => ({ user: state.user ? { ...state.user, requiresPasswordChange: false } : null }));
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
          set({ isLoading: false });
        } catch (error) {
          console.error('Update password error:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      refreshSession: async () => {
        if (supabase) {
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
          const { organizations } = useOrganizationStore.getState();
          const organization = organizations.find(org => org.id === user.organizationId);
          return organization?.orgAdminPermissions?.includes(permission as any) || false;
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
if (supabase) {
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