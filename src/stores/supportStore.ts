import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { supportService } from '../services/supportService';
import SecureLogger from '../lib/secureLogger';

export interface SupportTicket {
  id: string;
  staffMemberId: string;
  organizationId: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'technical' | 'assessment' | 'user_management' | 'billing' | 'general' | 'other';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  satisfactionRating?: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  messageText: string;
  createdAt: string;
  attachments?: TicketAttachment[];
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  messageId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority: SupportTicket['priority'];
  category: SupportTicket['category'];
}

export type TicketStatus = SupportTicket['status'];

interface SupportState {
  tickets: SupportTicket[];
  currentTicket: SupportTicket | null;
  messages: Record<string, TicketMessage[]>;
  ticketResponses: any[];
  ticketAttachments: TicketAttachment[];
  contactOptions: any[];
  isLoading: boolean;
  error: string | null;
  
  fetchTickets: (userId: string, role: string, organizationId?: string) => Promise<void>;
  fetchMessages: (ticketId: string) => Promise<void>;
  createTicket: (userId: string, data: CreateTicketData) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignTicket: (ticketId: string, userId: string) => Promise<void>;
  sendMessage: (ticketId: string, messageText: string) => Promise<string | undefined>;
  addAttachment: (ticketId: string, messageId: string, file: File) => Promise<void>;
  rateTicket: (ticketId: string, rating: number) => Promise<void>;
  clearError: () => void;
}

export const useSupportStore = create<SupportState>()(
  persist(
    (set, get) => ({
      tickets: [],
      currentTicket: null,
      messages: {},
      ticketResponses: [],
      ticketAttachments: [],
      contactOptions: [],
      isLoading: false,
      error: null,
      
      fetchTickets: async (userId: string, role: string, organizationId?: string) => {
        set({ isLoading: true, error: null });
        try {
          let query = supabase
            .from('support_tickets')
            .select(`
              *,
              assigned_to:users!assigned_to_id(id, first_name, last_name, email),
              staff_member:users!staff_member_id(id, first_name, last_name, email)
            `)
            .eq('is_active', true);

          // Filter based on user role and organization
          if (organizationId) {
            query = query.eq('organization_id', organizationId);
          }

          // Role-based filtering
          if (role === 'employee' || role === 'subscriber') {
            // Users can only see their own tickets
            query = query.eq('staff_member_id', userId);
          } else if (role === 'org_admin') {
            // Org admins can see all tickets in their organization
            query = query.eq('organization_id', organizationId);
          }
          // Super admins can see all tickets (no additional filter)

          const { data: tickets, error } = await query.order('created_at', { ascending: false });

          if (error) throw error;

          set({ 
            tickets: tickets || [], 
            isLoading: false 
          });
        } catch (error) {
          console.error('Failed to fetch tickets:', error);
          set({ 
            error: (error as Error).message || 'Failed to fetch tickets', 
            isLoading: false 
          });
        }
      },
      
      fetchMessages: async (ticketId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data: messages, error } = await supabase
            .from('ticket_messages')
            .select(`
              *,
              sender:users!sender_id(id, first_name, last_name, email, avatar_url)
            `)
            .eq('ticket_id', ticketId)
            .eq('is_active', true)
            .order('created_at', { ascending: true });

          if (error) throw error;

          set(state => ({ 
            messages: {
              ...state.messages,
              [ticketId]: messages || []
            }, 
            isLoading: false 
          }));
        } catch (error) {
          console.error('Failed to fetch messages:', error);
          set({ 
            error: (error as Error).message || 'Failed to fetch messages', 
            isLoading: false 
          });
        }
      },
      
      createTicket: async (userId: string, data: CreateTicketData) => {
        set({ isLoading: true, error: null });
        try {
          // Get user's organization
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', userId)
            .single();

          if (userError) throw userError;

          const serviceTicket = await supportService.createTicket(userId, {
            ...data,
            contactType: 'org_admin' as const
          });

          // Map service ticket to store ticket format
          const storeTicket: SupportTicket = {
            id: serviceTicket.id,
            staffMemberId: serviceTicket.userId,
            organizationId: serviceTicket.organizationId,
            subject: serviceTicket.subject,
            description: serviceTicket.description,
            priority: serviceTicket.priority,
            category: serviceTicket.category,
            status: serviceTicket.status,
            assignedToId: serviceTicket.assignedToId,
            createdAt: serviceTicket.createdAt,
            updatedAt: serviceTicket.updatedAt,
            resolvedAt: serviceTicket.resolvedAt,
            closedAt: serviceTicket.closedAt
          };

          set(state => ({
            tickets: [storeTicket, ...state.tickets],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create ticket',
            isLoading: false 
          });
        }
      },
      
      updateTicketStatus: async (ticketId: string, status: TicketStatus) => {
        set({ isLoading: true, error: null });
        try {
          const updateData: any = {
            status,
            updated_at: new Date().toISOString()
          };

          if (status === 'resolved') {
            updateData.resolved_at = new Date().toISOString();
          } else if (status === 'closed') {
            updateData.closed_at = new Date().toISOString();
          }

          const { error } = await supabase
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId);

          if (error) throw error;

          // Update local state
          set(state => ({ 
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId 
                ? { ...ticket, ...updateData }
                : ticket
            ), 
            isLoading: false 
          }));
        } catch (error) {
          console.error('Failed to update ticket status:', error);
          set({ 
            error: (error as Error).message || 'Failed to update ticket status', 
            isLoading: false 
          });
        }
      },
      
      assignTicket: async (ticketId: string, userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('support_tickets')
            .update({
              assigned_to_id: userId || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', ticketId);

          if (error) throw error;

          // Update local state
          set(state => ({ 
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId 
                ? { 
                    ...ticket, 
                    assignedToId: userId || undefined, 
                    updatedAt: new Date().toISOString() 
                  } 
                : ticket
            ), 
            isLoading: false 
          }));
        } catch (error) {
          console.error('Failed to assign ticket:', error);
          set({ 
            error: (error as Error).message || 'Failed to assign ticket', 
            isLoading: false 
          });
        }
      },
      
      sendMessage: async (ticketId: string, messageText: string) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data: message, error } = await supabase
            .from('ticket_messages')
            .insert({
              ticket_id: ticketId,
              sender_id: user.id,
              message_text: messageText,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select(`
              *,
              sender:users!sender_id(id, first_name, last_name, email, avatar_url)
            `)
            .single();

          if (error) throw error;

          // Update local state
          set(state => {
            const currentMessages = state.messages[ticketId] || [];
            return {
              messages: {
                ...state.messages,
                [ticketId]: [...currentMessages, message]
              },
              isLoading: false
            };
          });

          // Update ticket's updatedAt timestamp
          await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', ticketId);

          set(state => ({
            tickets: state.tickets.map(ticket =>
              ticket.id === ticketId
                ? { ...ticket, updatedAt: new Date().toISOString() }
                : ticket
            )
          }));

          return message.id;
        } catch (error) {
          console.error('Failed to send message:', error);
          set({ 
            error: (error as Error).message || 'Failed to send message', 
            isLoading: false 
          });
          return undefined;
        }
      },
      
      addAttachment: async (ticketId: string, messageId: string, file: File) => {
        set({ isLoading: true, error: null });
        try {
          // Upload file to Supabase Storage
          const fileName = `${ticketId}/${messageId}/${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ticket-attachments')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('ticket-attachments')
            .getPublicUrl(fileName);

          // Create attachment record
          const { data: attachment, error: attachmentError } = await supabase
            .from('ticket_attachments')
            .insert({
              ticket_id: ticketId,
              message_id: messageId,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_size: file.size,
              mime_type: file.type,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (attachmentError) throw attachmentError;

          set({ isLoading: false });
          return attachment;
        } catch (error) {
          console.error('Failed to add attachment:', error);
          set({ 
            error: (error as Error).message || 'Failed to add attachment', 
            isLoading: false 
          });
        }
      },

      rateTicket: async (ticketId: string, rating: number) => {
        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('support_tickets')
            .update({
              satisfaction_rating: rating,
              updated_at: new Date().toISOString()
            })
            .eq('id', ticketId);

          if (error) throw error;

          // Update local state
          set(state => ({ 
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId 
                ? { ...ticket, satisfactionRating: rating, updatedAt: new Date().toISOString() }
                : ticket
            ), 
            isLoading: false 
          }));
        } catch (error) {
          console.error('Failed to rate ticket:', error);
          set({ 
            error: (error as Error).message || 'Failed to rate ticket', 
            isLoading: false 
          });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'support-storage',
      partialize: (state) => ({
        tickets: state.tickets,
        messages: state.messages,
        currentTicket: state.currentTicket
      })
    }
  )
);