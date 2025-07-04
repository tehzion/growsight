import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AssessmentAssignment, AssessmentNotification, RelationshipType } from '../types';
import { emailService } from '../services/emailService';
import { config } from '../config/environment';

interface AssignmentState {
  assignments: AssessmentAssignment[];
  notifications: AssessmentNotification[];
  isLoading: boolean;
  error: string | null;
  fetchAssignments: (userId?: string) => Promise<void>;
  createAssignment: (data: {
    assessmentId: string;
    employeeId: string;
    reviewerId: string;
    relationshipType: RelationshipType;
    deadline: string;
    assessmentTitle?: string;
    employeeEmail?: string;
    reviewerEmail?: string;
    employeeName?: string;
    reviewerName?: string;
    organizationName?: string;
  }) => Promise<void>;
  updateAssignmentStatus: (id: string, status: 'pending' | 'in_progress' | 'completed') => Promise<void>;
  fetchNotifications: (userId: string) => Promise<void>;
  markNotificationSent: (notificationId: string) => Promise<void>;
}

// Mock assignments for demo
const defaultMockAssignments: AssessmentAssignment[] = [
  {
    id: 'assign-1',
    assessmentId: 'preset-assessment-1',
    employeeId: '3', // John Doe
    reviewerId: '4', // Jane Smith
    relationshipType: 'peer',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignedById: '2', // Org Admin
    status: 'pending',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    notificationSent: true,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'assign-2',
    assessmentId: 'preset-assessment-1',
    employeeId: '3', // John Doe
    reviewerId: '2', // Michael Chen (supervisor)
    relationshipType: 'supervisor',
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    assignedById: '2',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    notificationSent: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'assign-3',
    assessmentId: 'preset-assessment-2',
    employeeId: '5', // Mike Wilson
    reviewerId: '6', // Lisa Brown
    relationshipType: 'peer',
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    assignedById: '2',
    status: 'pending',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    notificationSent: false,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export const useAssignmentStore = create<AssignmentState>()(
  persist(
    (set, get) => ({
      assignments: [],
      notifications: [],
      isLoading: false,
      error: null,

      fetchAssignments: async (userId?: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 400));
          
          const { assignments: currentAssignments } = get();
          const allAssignments = currentAssignments.length > 0 ? currentAssignments : defaultMockAssignments;
          
          const filteredAssignments = userId 
            ? allAssignments.filter(a => a.employeeId === userId || a.reviewerId === userId)
            : allAssignments;
          
          set({ assignments: filteredAssignments, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch assignments', isLoading: false });
        }
      },

      createAssignment: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 600));
          
          const newAssignment: AssessmentAssignment = {
            id: `assign-${Date.now()}`,
            assessmentId: data.assessmentId,
            employeeId: data.employeeId,
            reviewerId: data.reviewerId,
            relationshipType: data.relationshipType,
            deadline: data.deadline,
            assignedById: 'current-user-id', // Would be actual user ID
            status: 'pending',
            dueDate: data.deadline,
            notificationSent: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set(state => ({
            assignments: [...state.assignments, newAssignment],
            isLoading: false,
          }));

          // Send email notifications if enabled
          if (config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              // Send assignment notification to employee and reviewer
              if (data.employeeEmail && data.reviewerEmail && data.employeeName && data.reviewerName) {
                await emailService.sendAssignmentNotification({
                  employeeEmail: data.employeeEmail,
                  reviewerEmail: data.reviewerEmail,
                  employeeName: data.employeeName,
                  reviewerName: data.reviewerName,
                  assessmentTitle: data.assessmentTitle || 'Assessment',
                  deadline: data.deadline,
                  organizationName: data.organizationName || 'Your Organization'
                });
              }

              // Send 360° assessment assignment notification if applicable
              if (data.assessmentTitle && data.employeeEmail && data.reviewerEmail) {
                await emailService.sendAssessmentAssignmentNotification(
                  newAssignment.id,
                  data.employeeEmail,
                  data.reviewerEmail,
                  data.assessmentTitle,
                  data.deadline,
                  data.relationshipType
                );
              }
            } catch (emailError) {
              console.error('Failed to send assignment notification emails:', emailError);
              // Don't fail the assignment creation if email fails
            }
          }
          
        } catch (error) {
          set({ error: 'Failed to create assignment', isLoading: false });
        }
      },

      updateAssignmentStatus: async (id, status) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const { assignments } = get();
          const assignment = assignments.find(a => a.id === id);
          
          set(state => ({
            assignments: state.assignments.map(assignment =>
              assignment.id === id 
                ? { ...assignment, status, updatedAt: new Date().toISOString() }
                : assignment
            ),
            isLoading: false,
          }));

          // Send completion notification if assessment is completed
          if (status === 'completed' && assignment && config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              // This would need the actual email addresses and names from the database
              // For now, we'll just log the completion
              console.log(`Assessment completed notification should be sent for assignment ${id}`);
            } catch (emailError) {
              console.error('Failed to send completion notification:', emailError);
            }
          }
        } catch (error) {
          set({ error: 'Failed to update assignment status', isLoading: false });
        }
      },

      fetchNotifications: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Mock notifications based on assignments
          const mockNotifications: AssessmentNotification[] = [
            {
              id: 'notif-1',
              assignmentId: 'assign-1',
              userId: userId,
              notificationType: 'assignment_created',
              emailSent: true,
              sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            }
          ];
          
          set({ notifications: mockNotifications, isLoading: false });
        } catch (error) {
          set({ error: 'Failed to fetch notifications', isLoading: false });
        }
      },

      markNotificationSent: async (notificationId: string) => {
        set({ isLoading: true, error: null });
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          set(state => ({
            notifications: state.notifications.map(notification =>
              notification.id === notificationId 
                ? { ...notification, emailSent: true, sentAt: new Date().toISOString() }
                : notification
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to mark notification as sent', isLoading: false });
        }
      },
    }),
    {
      name: 'assignment-storage',
      partialize: (state) => ({
        assignments: state.assignments,
        notifications: state.notifications,
      }),
    }
  )
);