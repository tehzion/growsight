import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import SecureLogger from './secureLogger';

// Use environment variables for production configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

try {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'X-Client-Info': 'growsight'
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  });

  // Test connection on initialization
  supabase.auth.getSession().catch((error: any) => {
    SecureLogger.warn('Supabase connection test failed', { type: 'connection-error' });
    supabase = null;
  });
} catch (error) {
  SecureLogger.warn('Supabase client creation failed', { type: 'client-error' });
  supabase = null;
}

// Export the client (will be null in demo mode)
export { supabase };

// Helper to handle Supabase errors with enhanced error messages
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  // Authentication errors
  if (error?.code === 'invalid_credentials') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  
  if (error?.code === 'email_not_confirmed') {
    return 'Please check your email and click the confirmation link before signing in.';
  }
  
  if (error?.code === 'too_many_requests') {
    return 'Too many requests. Please wait a few minutes before trying again.';
  }
  
  // Database errors
  if (error?.code === '23505') {
    return 'This record already exists. Please use different values.';
  }
  
  if (error?.code === '42501') {
    return 'You do not have permission to perform this action.';
  }
  
  if (error?.code === '23503') {
    return 'This operation would violate data integrity constraints.';
  }
  
  if (error?.code === 'PGRST116') {
    return 'The requested record was not found.';
  }
  
  // Network errors
  if (error?.message?.includes('Failed to fetch')) {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  
  if (error?.message?.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  // Generic fallback
  return error?.message || 'An unexpected error occurred. Please try again.';
};

// Connection health check utility
export const checkSupabaseConnection = async (): Promise<boolean> => {
  if (!supabase) return false;
  
  try {
    const { data, error } = await supabase.from('organizations').select('count').limit(1);
    return !error;
  } catch (error) {
    SecureLogger.warn('Supabase health check failed', { type: 'health-check' });
    return false;
  }
};

// Retry utility for failed requests
export const retrySupabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};