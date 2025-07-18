import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { AccessRequest } from '../types';
import { emailNotificationService } from '../services/emailNotificationService';
import { config } from '../config/environment';

interface AccessRequestState {
  requests: AccessRequest[];
  isLoading: boolean;
  error: string | null;
  fetchRequests: () => Promise<void>;
  createRequest: (data: Omit<AccessRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string, reason?: string) => Promise<void>;
}

export const useAccessRequestStore = create<AccessRequestState>()(
  persist(
    (set, get) => ({
      requests: [],
      isLoading: false,
      error: null,

      fetchRequests: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('access_requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;

          const requests: AccessRequest[] = (data || []).map((item: any) => ({
            id: item.id,
            email: item.email,
            firstName: item.first_name,
            lastName: item.last_name,
            organizationName: item.organization_name,
            requestedRole: item.requested_role,
            message: item.message,
            status: item.status,
            rejectionReason: item.rejection_reason,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));

          set({ requests, isLoading: false, error: null });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      createRequest: async (data) => {
        set({ isLoading: true, error: null });
        try {
          // Check for existing request with same email
          const { data: existingRequest, error: checkError } = await supabase
            .from('access_requests')
            .select('id')
            .eq('email', data.email)
            .in('status', ['pending', 'approved'])
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            throw checkError;
          }

          if (existingRequest) {
            throw new Error('An access request with this email already exists');
          }

          const { data: newRequest, error } = await supabase
            .from('access_requests')
            .insert({
              email: data.email,
              first_name: data.firstName,
              last_name: data.lastName,
              organization_name: data.organizationName,
              requested_role: data.requestedRole,
              message: data.message,
              status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          const request: AccessRequest = {
            id: newRequest.id,
            email: newRequest.email,
            firstName: newRequest.first_name,
            lastName: newRequest.last_name,
            organizationName: newRequest.organization_name,
            requestedRole: newRequest.requested_role,
            message: newRequest.message,
            status: newRequest.status,
            rejectionReason: newRequest.rejection_reason,
            createdAt: newRequest.created_at,
            updatedAt: newRequest.updated_at,
          };

          set(state => ({ 
            requests: [request, ...state.requests],
            isLoading: false,
            error: null
          }));

          // Send notification to super admins
          if (config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              // Log the new access request for admin notification
              console.log('New access request created:', request);
              // TODO: Implement admin notification system
            } catch (emailError) {
              console.error('Failed to send access request notification:', emailError);
              // Don't fail the request creation if email fails
            }
          }
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      approveRequest: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Get the request to approve
          const { data: requestToApprove, error: fetchError } = await supabase
            .from('access_requests')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;

          if (!requestToApprove) {
            throw new Error('Request not found');
          }

          if (requestToApprove.status !== 'pending') {
            throw new Error('Request is not in pending status');
          }

          // Update request status
          const { data: updatedRequest, error } = await supabase
            .from('access_requests')
            .update({ 
              status: 'approved',
              approved_by_id: user.id,
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const request: AccessRequest = {
            id: updatedRequest.id,
            email: updatedRequest.email,
            firstName: updatedRequest.first_name,
            lastName: updatedRequest.last_name,
            organizationName: updatedRequest.organization_name,
            requestedRole: updatedRequest.requested_role,
            message: updatedRequest.message,
            status: updatedRequest.status,
            rejectionReason: updatedRequest.rejection_reason,
            createdAt: updatedRequest.created_at,
            updatedAt: updatedRequest.updated_at,
          };

          set(state => ({
            requests: state.requests.map(req =>
              req.id === id ? request : req
            ),
            isLoading: false,
            error: null
          }));

          // Send email notification to requester
          if (config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              await emailNotificationService.sendAccessRequestStatusNotification({
                recipientEmail: request.email,
                recipientName: `${request.firstName} ${request.lastName}`,
                status: 'approved',
                loginUrl: `${config.app.url}/login`
              });
            } catch (emailError) {
              console.error('Failed to send approval notification:', emailError);
              // Don't fail the approval if email fails
            }
          }

        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      rejectRequest: async (id: string, reason?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          // Get the request to reject
          const { data: requestToReject, error: fetchError } = await supabase
            .from('access_requests')
            .select('*')
            .eq('id', id)
            .single();

          if (fetchError) throw fetchError;

          if (!requestToReject) {
            throw new Error('Request not found');
          }

          if (requestToReject.status !== 'pending') {
            throw new Error('Request is not in pending status');
          }

          // Update request status
          const { data: updatedRequest, error } = await supabase
            .from('access_requests')
            .update({ 
              status: 'rejected',
              rejection_reason: reason || 'Your request did not meet our criteria.',
              rejected_by_id: user.id,
              rejected_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const request: AccessRequest = {
            id: updatedRequest.id,
            email: updatedRequest.email,
            firstName: updatedRequest.first_name,
            lastName: updatedRequest.last_name,
            organizationName: updatedRequest.organization_name,
            requestedRole: updatedRequest.requested_role,
            message: updatedRequest.message,
            status: updatedRequest.status,
            rejectionReason: updatedRequest.rejection_reason,
            createdAt: updatedRequest.created_at,
            updatedAt: updatedRequest.updated_at,
          };

          set(state => ({
            requests: state.requests.map(req =>
              req.id === id ? request : req
            ),
            isLoading: false,
            error: null
          }));

          // Send email notification to requester
          if (config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              await emailNotificationService.sendAccessRequestStatusNotification({
                recipientEmail: request.email,
                recipientName: `${request.firstName} ${request.lastName}`,
                status: 'rejected',
                rejectionReason: request.rejectionReason,
                loginUrl: `${config.app.url}/login`
              });
            } catch (emailError) {
              console.error('Failed to send rejection notification:', emailError);
              // Don't fail the rejection if email fails
            }
          }
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },
    }),
    {
      name: 'access-request-storage',
      partialize: (state) => ({
        requests: state.requests,
      }),
    }
  )
);