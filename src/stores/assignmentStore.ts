import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { handleSupabaseError } from '../lib/supabaseError';
import { AssessmentAssignment, AssessmentNotification, RelationshipType } from '../types';
import { emailService } from '../services/emailService';
import { config } from '../config/environment';
import { useNotificationStore, notificationTemplates } from './notificationStore';

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
          let query = supabase
            .from('assessment_assignments')
            .select(`
              *,
              assessments!inner(*),
              employees:users!assessment_assignments_employee_id_fkey(*),
              reviewers:users!assessment_assignments_reviewer_id_fkey(*)
            `)
            .eq('is_active', true);

          if (userId) {
            query = query.or(`employee_id.eq.${userId},reviewer_id.eq.${userId}`);
          }

          const { data, error } = await query.order('created_at', { ascending: false });

          if (error) throw error;

          const assignments: AssessmentAssignment[] = (data || []).map((item: any) => ({
            id: item.id,
            assessmentId: item.assessment_id,
            employeeId: item.employee_id,
            reviewerId: item.reviewer_id,
            relationshipType: item.relationship_type,
            deadline: item.deadline,
            assignedById: item.assigned_by_id,
            status: item.status,
            dueDate: item.due_date,
            notificationSent: item.notification_sent,
            createdAt: item.created_at,
            updatedAt: item.updated_at,
          }));

          set({ assignments, isLoading: false });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      createAssignment: async (data) => {
        set({ isLoading: true, error: null });
        try {
          // Get current user
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error('User not authenticated');

          const { data: newAssignment, error } = await supabase
            .from('assessment_assignments')
            .insert({
              assessment_id: data.assessmentId,
              employee_id: data.employeeId,
              reviewer_id: data.reviewerId,
              relationship_type: data.relationshipType,
              deadline: data.deadline,
              due_date: data.deadline,
              assigned_by_id: user.id,
              status: 'pending',
              notification_sent: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (error) throw error;

          const assignment: AssessmentAssignment = {
            id: newAssignment.id,
            assessmentId: newAssignment.assessment_id,
            employeeId: newAssignment.employee_id,
            reviewerId: newAssignment.reviewer_id,
            relationshipType: newAssignment.relationship_type,
            deadline: newAssignment.deadline,
            assignedById: newAssignment.assigned_by_id,
            status: newAssignment.status,
            dueDate: newAssignment.due_date,
            notificationSent: newAssignment.notification_sent,
            createdAt: newAssignment.created_at,
            updatedAt: newAssignment.updated_at,
          };

          set(state => ({
            assignments: [assignment, ...state.assignments],
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
                  assignment.id,
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

          // Add in-app notifications
          const { addNotification } = useNotificationStore.getState();
          if (data.employeeName) {
            addNotification(notificationTemplates.assessmentInvitation(
              data.assessmentTitle || 'Assessment',
              data.employeeName
            ));
          }
          if (data.reviewerName) {
            addNotification(notificationTemplates.assessmentInvitation(
              data.assessmentTitle || 'Assessment',
              data.reviewerName
            ));
          }
          
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      updateAssignmentStatus: async (id, status) => {
        set({ isLoading: true, error: null });
        try {
          const { data: updatedAssignment, error } = await supabase
            .from('assessment_assignments')
            .update({ 
              status,
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;

          const assignment: AssessmentAssignment = {
            id: updatedAssignment.id,
            assessmentId: updatedAssignment.assessment_id,
            employeeId: updatedAssignment.employee_id,
            reviewerId: updatedAssignment.reviewer_id,
            relationshipType: updatedAssignment.relationship_type,
            deadline: updatedAssignment.deadline,
            assignedById: updatedAssignment.assigned_by_id,
            status: updatedAssignment.status,
            dueDate: updatedAssignment.due_date,
            notificationSent: updatedAssignment.notification_sent,
            createdAt: updatedAssignment.created_at,
            updatedAt: updatedAssignment.updated_at,
          };

          set(state => ({
            assignments: state.assignments.map(a =>
              a.id === id ? assignment : a
            ),
            isLoading: false,
          }));

          // Send completion notification if assessment is completed
          if (status === 'completed' && config.features.emailNotifications && config.email.provider !== 'demo') {
            try {
              // Get assignment details for email notification
              const { data: assignmentDetails, error: detailsError } = await supabase
                .from('assessment_assignments')
                .select(`
                  *,
                  assessments!inner(*),
                  employees:users!assessment_assignments_employee_id_fkey(*),
                  reviewers:users!assessment_assignments_reviewer_id_fkey(*)
                `)
                .eq('id', id)
                .single();

              if (!detailsError && assignmentDetails) {
                // Send completion notification
                console.log(`Assessment completed notification should be sent for assignment ${id}`);
                // TODO: Implement completion notification logic
              }
            } catch (emailError) {
              console.error('Failed to send completion notification:', emailError);
            }
          }
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      fetchNotifications: async (userId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('assessment_notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          const notifications: AssessmentNotification[] = (data || []).map((item: any) => ({
            id: item.id,
            assignmentId: item.assignment_id,
            userId: item.user_id,
            notificationType: item.notification_type,
            emailSent: item.email_sent,
            sentAt: item.sent_at,
            createdAt: item.created_at,
          }));

          set({ notifications, isLoading: false });
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
        }
      },

      markNotificationSent: async (notificationId: string) => {
        set({ isLoading: true, error: null });
        try {
          const { data: updatedNotification, error } = await supabase
            .from('assessment_notifications')
            .update({ 
              email_sent: true, 
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .select()
            .single();

          if (error) throw error;

          const notification: AssessmentNotification = {
            id: updatedNotification.id,
            assignmentId: updatedNotification.assignment_id,
            userId: updatedNotification.user_id,
            notificationType: updatedNotification.notification_type,
            emailSent: updatedNotification.email_sent,
            sentAt: updatedNotification.sent_at,
            createdAt: updatedNotification.created_at,
          };

          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === notificationId ? notification : n
            ),
            isLoading: false,
          }));
        } catch (error) {
          set({ error: handleSupabaseError(error), isLoading: false });
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