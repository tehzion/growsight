import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SupportTicket, TicketMessage, TicketAttachment, TicketStatus, PriorityLevel, TicketCategory } from '../types';
import { supportService, SupportTicketResponse, SupportTicketAttachment, ContactOption, CreateTicketData } from '../services/supportService';

export interface SupportState {
  tickets: SupportTicket[];
  messages: Record<string, TicketMessage[]>; // ticketId -> messages
  isLoading: boolean;
  error: string | null;
  fetchTickets: (userId: string, role: string) => Promise<void>;
  fetchMessages: (ticketId: string) => Promise<void>;
  createTicket: (data: {
    subject: string;
    description?: string;
    priority: PriorityLevel;
    category: TicketCategory;
    attachments?: File[];
  }) => Promise<void>;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  assignTicket: (ticketId: string, userId: string) => Promise<void>;
  sendMessage: (ticketId: string, messageText: string) => Promise<string | undefined>;
  addAttachment: (ticketId: string, messageId: string, file: File) => Promise<void>;
  submitSatisfactionRating: (ticketId: string, rating: number) => Promise<void>;
}

interface SupportStore {
  tickets: SupportTicket[];
  currentTicket: SupportTicket | null;
  ticketResponses: SupportTicketResponse[];
  ticketAttachments: SupportTicketAttachment[];
  contactOptions: ContactOption[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createTicket: (userId: string, data: CreateTicketData) => Promise<void>;
  fetchUserTickets: (userId: string) => Promise<void>;
  fetchOrganizationTickets: (organizationId: string) => Promise<void>;
  fetchTicket: (ticketId: string) => Promise<void>;
  updateTicket: (ticketId: string, updates: Partial<SupportTicket>) => Promise<void>;
  assignTicket: (ticketId: string, assignedToId: string) => Promise<void>;
  resolveTicket: (ticketId: string) => Promise<void>;
  closeTicket: (ticketId: string) => Promise<void>;
  
  // Response actions
  addResponse: (ticketId: string, userId: string, responseText: string, isInternal?: boolean) => Promise<void>;
  fetchTicketResponses: (ticketId: string) => Promise<void>;
  
  // Attachment actions
  uploadAttachment: (ticketId: string, file: File, responseId?: string) => Promise<void>;
  fetchTicketAttachments: (ticketId: string) => Promise<void>;
  
  // Contact options
  fetchContactOptions: (userId: string) => Promise<void>;
  
  // Utility functions
  getTicketById: (ticketId: string) => SupportTicket | null;
  getTicketsByStatus: (status: string) => SupportTicket[];
  getTicketsByPriority: (priority: string) => SupportTicket[];
  clearError: () => void;
  clearCurrentTicket: () => void;
}

// Mock data for demo
const mockTickets: SupportTicket[] = [
  {
    id: 'ticket-1',
    staffMemberId: '3', // John Doe
    organizationId: 'demo-org-1',
    subject: 'Need help with assessment creation',
    description: 'I\'m trying to create a custom assessment but getting an error when adding questions. Can someone help?',
    priority: 'normal',
    category: 'technical_support',
    status: 'open',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ticket-2',
    staffMemberId: '4', // Jane Smith
    organizationId: 'demo-org-1',
    subject: 'Request for training on competency framework',
    description: 'Our team would like to schedule a training session on how to effectively use the competency framework for assessments.',
    priority: 'low',
    category: 'training_request',
    status: 'in_progress',
    assignedToId: '2', // Michael Chen (Org Admin)
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ticket-3',
    staffMemberId: '5', // Mike Wilson
    organizationId: 'demo-org-1',
    subject: 'Urgent: Can\'t access my assessment results',
    description: 'I completed my assessment yesterday but can\'t see my results. This is urgent as I have a review meeting tomorrow.',
    priority: 'urgent',
    category: 'technical_support',
    status: 'resolved',
    assignedToId: '2', // Michael Chen (Org Admin)
    resolvedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    satisfactionRating: 5
  },
  // Org Admin tickets for Super Admin to see
  {
    id: 'ticket-4',
    staffMemberId: '2', // Michael Chen (Org Admin)
    organizationId: 'demo-org-1',
    subject: 'Need guidance on organization settings',
    description: 'I need help configuring the organization branding and settings for our company.',
    priority: 'normal',
    category: 'consultation',
    status: 'open',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'ticket-5',
    staffMemberId: '7', // Alex Rodriguez (Org Admin)
    organizationId: 'demo-org-2',
    subject: 'Request for advanced analytics features',
    description: 'We would like to discuss implementing advanced analytics features for our organization.',
    priority: 'normal',
    category: 'consultation',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Mock messages for demo
const mockMessages: Record<string, TicketMessage[]> = {
  'ticket-1': [],
  'ticket-2': [
    {
      id: 'msg-1',
      ticketId: 'ticket-2',
      senderId: '4', // Jane Smith
      messageText: 'Hi, our team would like to schedule a training session on the competency framework. We have about 10 people who need training. What days/times are available next week?',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2',
      ticketId: 'ticket-2',
      senderId: '2', // Michael Chen (Org Admin)
      messageText: 'Hello Jane, I\'d be happy to arrange that for you. We have availability on Tuesday and Thursday next week, between 10am-12pm or 2pm-4pm. Would any of those times work for your team?',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-3',
      ticketId: 'ticket-2',
      senderId: '4', // Jane Smith
      messageText: 'Thursday at 2pm would work perfectly for us. Could you also provide some pre-reading materials so the team can prepare?',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-4',
      ticketId: 'ticket-2',
      senderId: '2', // Michael Chen (Org Admin)
      messageText: `Great! I've scheduled the training for Thursday at 2pm. I'll send calendar invites shortly. And yes, I'll email some preparation materials by end of day today.`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
    }
  ],
  'ticket-3': [
    {
      id: 'msg-5',
      ticketId: 'ticket-3',
      senderId: '5', // Mike Wilson
      messageText: 'I completed my assessment yesterday but can\'t see my results. This is urgent as I have a review meeting tomorrow morning!',
      createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-6',
      ticketId: 'ticket-3',
      senderId: '2', // Michael Chen (Org Admin)
      messageText: 'Hi Mike, I\'ll look into this right away. Can you tell me which assessment you completed?',
      createdAt: new Date(Date.now() - 35 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-7',
      ticketId: 'ticket-3',
      senderId: '5', // Mike Wilson
      messageText: 'It was the Leadership Excellence Assessment. I can see that it shows as completed in my dashboard, but when I click on "View Results" it just shows a loading spinner.',
      createdAt: new Date(Date.now() - 34 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-8',
      ticketId: 'ticket-3',
      senderId: '2', // Michael Chen (Org Admin)
      messageText: `Thanks for the details. I've checked the system and it looks like there was a processing delay. I've manually triggered the results generation and they should be available now. Can you please refresh your page and try again?`,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-9',
      ticketId: 'ticket-3',
      senderId: '5', // Mike Wilson
      messageText: 'That worked! I can see my results now. Thank you so much for the quick help!',
      createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-10',
      ticketId: 'ticket-3',
      senderId: '2', // Michael Chen (Org Admin)
      messageText: `You're welcome! Glad we could resolve this in time for your meeting. I'll mark this ticket as resolved, but feel free to reopen it if you have any other issues.`,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    }
  ]
};

export const useSupportStore = create<SupportStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      currentTicket: null,
      ticketResponses: [],
      ticketAttachments: [],
      contactOptions: [],
      isLoading: false,
      error: null,
      
      fetchTickets: async (userId: string, role: string, organizationId?: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would fetch from the database
          // For demo, we'll use mock data
          const { tickets: currentTickets } = get();
          
          // If we already have tickets, use those, otherwise use mock data
          const allTickets = currentTickets.length > 0 ? currentTickets : mockTickets;
          
          // Filter tickets based on user role and organization
          let filteredTickets: SupportTicket[];
          
          if (role === 'super_admin') {
            // Super admins see tickets from org admins only (not staff tickets)
            filteredTickets = allTickets.filter(t => {
              // Only show tickets where the staff member is an org_admin
              const isOrgAdminTicket = t.staffMemberId === '2' || t.staffMemberId === '7'; // Org admin IDs
              return isOrgAdminTicket;
            });
          } else if (role === 'org_admin') {
            // Org admins see tickets from their organization (staff, department, etc.)
            const userOrgId = organizationId || 'demo-org-1';
            filteredTickets = allTickets.filter(t => 
              t.organizationId === userOrgId
            );
          } else {
            // Regular staff see only their own tickets
            filteredTickets = allTickets.filter(t => t.staffMemberId === userId);
          }
          
          set({ 
            tickets: filteredTickets, 
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
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // In a real implementation, this would fetch from the database
          // For demo, we'll use mock data
          const { messages: currentMessages } = get();
          
          // If we already have messages for this ticket, use those, otherwise use mock data
          const ticketMessages = currentMessages[ticketId] || mockMessages[ticketId] || [];
          
          set(state => ({ 
            messages: {
              ...state.messages,
              [ticketId]: ticketMessages
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
          const newTicket = await supportService.createTicket(userId, data);
          set(state => ({
            tickets: [newTicket, ...state.tickets],
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would update the ticket in the database
          // For demo, we'll update the ticket in state
          set(state => ({ 
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId 
                ? { 
                    ...ticket, 
                    status, 
                    updatedAt: new Date().toISOString(),
                    ...(status === 'resolved' ? { resolvedAt: new Date().toISOString() } : {}),
                    ...(status === 'closed' ? { closedAt: new Date().toISOString() } : {})
                  } 
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would update the ticket in the database
          // For demo, we'll update the ticket in state
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would create a message in the database
          // For demo, we'll create a mock message
          const newMessage: TicketMessage = {
            id: `msg-${Date.now()}`,
            ticketId,
            senderId: '3', // Assuming current user is John Doe
            messageText,
            createdAt: new Date().toISOString()
          };
          
          set(state => {
            const currentMessages = state.messages[ticketId] || [];
            return {
              messages: {
                ...state.messages,
                [ticketId]: [...currentMessages, newMessage]
              },
              isLoading: false
            };
          });
          
          // Also update the ticket's updatedAt timestamp
          set(state => ({
            tickets: state.tickets.map(ticket =>
              ticket.id === ticketId
                ? { ...ticket, updatedAt: new Date().toISOString() }
                : ticket
            )
          }));
          
          return newMessage.id;
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
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would upload the file to storage and create an attachment record
          // For demo, we'll just create a mock attachment
          const newAttachment: TicketAttachment = {
            id: `attachment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            ticketId,
            messageId,
            fileName: file.name,
            fileUrl: URL.createObjectURL(file), // In a real app, this would be a storage URL
            createdAt: new Date().toISOString()
          };
          
          // In a real implementation, we would update the message with the attachment
          // For demo, we'll just log it
          console.log('Attachment added:', newAttachment);
          
          set({ isLoading: false });
        } catch (error) {
          console.error('Failed to add attachment:', error);
          set({ 
            error: (error as Error).message || 'Failed to add attachment', 
            isLoading: false 
          });
        }
      },
      
      submitSatisfactionRating: async (ticketId: string, rating: number) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // In a real implementation, this would update the ticket in the database
          // For demo, we'll update the ticket in state
          set(state => ({ 
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId 
                ? { 
                    ...ticket, 
                    satisfactionRating: rating, 
                    updatedAt: new Date().toISOString() 
                  } 
                : ticket
            ), 
            isLoading: false 
          }));
        } catch (error) {
          console.error('Failed to submit rating:', error);
          set({ 
            error: (error as Error).message || 'Failed to submit rating', 
            isLoading: false 
          });
        }
      },
      
      fetchUserTickets: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const tickets = await supportService.getUserTickets(userId);
          set({ tickets, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch tickets',
            isLoading: false 
          });
        }
      },
      
      fetchOrganizationTickets: async (organizationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const tickets = await supportService.getOrganizationTickets(organizationId);
          set({ tickets, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch organization tickets',
            isLoading: false 
          });
        }
      },
      
      fetchTicket: async (ticketId: string) => {
        set({ isLoading: true, error: null });
        try {
          const ticket = await supportService.getTicket(ticketId);
          set({ currentTicket: ticket, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch ticket',
            isLoading: false 
          });
        }
      },
      
      updateTicket: async (ticketId: string, updates: Partial<SupportTicket>) => {
        set({ isLoading: true, error: null });
        try {
          const updatedTicket = await supportService.updateTicket(ticketId, updates);
          set(state => ({
            tickets: state.tickets.map(ticket => 
              ticket.id === ticketId ? updatedTicket : ticket
            ),
            currentTicket: state.currentTicket?.id === ticketId ? updatedTicket : state.currentTicket,
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update ticket',
            isLoading: false 
          });
        }
      },
      
      resolveTicket: async (ticketId: string) => {
        await get().updateTicket(ticketId, { status: 'resolved' });
      },
      
      closeTicket: async (ticketId: string) => {
        await get().updateTicket(ticketId, { status: 'closed' });
      },
      
      addResponse: async (ticketId: string, userId: string, responseText: string, isInternal: boolean = false) => {
        set({ isLoading: true, error: null });
        try {
          const newResponse = await supportService.addResponse(ticketId, userId, responseText, isInternal);
          set(state => ({
            ticketResponses: [...state.ticketResponses, newResponse],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to add response',
            isLoading: false 
          });
        }
      },
      
      fetchTicketResponses: async (ticketId: string) => {
        set({ isLoading: true, error: null });
        try {
          const responses = await supportService.getTicketResponses(ticketId);
          set({ ticketResponses: responses, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch responses',
            isLoading: false 
          });
        }
      },
      
      uploadAttachment: async (ticketId: string, file: File, responseId?: string) => {
        set({ isLoading: true, error: null });
        try {
          const newAttachment = await supportService.uploadAttachment(ticketId, file, responseId);
          set(state => ({
            ticketAttachments: [...state.ticketAttachments, newAttachment],
            isLoading: false
          }));
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to upload attachment',
            isLoading: false 
          });
        }
      },
      
      fetchTicketAttachments: async (ticketId: string) => {
        set({ isLoading: true, error: null });
        try {
          const attachments = await supportService.getTicketAttachments(ticketId);
          set({ ticketAttachments: attachments, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch attachments',
            isLoading: false 
          });
        }
      },
      
      fetchContactOptions: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const options = await supportService.getContactOptions(userId);
          set({ contactOptions: options, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch contact options',
            isLoading: false 
          });
        }
      },
      
      getTicketById: (ticketId: string) => {
        return get().tickets.find(ticket => ticket.id === ticketId) || null;
      },
      
      getTicketsByStatus: (status: string) => {
        return get().tickets.filter(ticket => ticket.status === status);
      },
      
      getTicketsByPriority: (priority: string) => {
        return get().tickets.filter(ticket => ticket.priority === priority);
      },
      
      clearError: () => {
        set({ error: null });
      },
      
      clearCurrentTicket: () => {
        set({ currentTicket: null, ticketResponses: [], ticketAttachments: [] });
      }
    }),
    {
      name: 'support-storage',
      partialize: (state) => ({
        tickets: state.tickets,
        messages: state.messages
      }),
    }
  )
);