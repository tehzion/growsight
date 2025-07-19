import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { smtpEmailService, SMTPConfig, EmailSendResult } from '../services/smtpEmailService';
import { useNotificationStore } from './notificationStore';
import { useBrandingStore } from './brandingStore';
import SecureLogger from '../lib/secureLogger';

export interface EmailServiceConfig {
  provider: 'smtp' | 'sendgrid' | 'mailgun' | 'demo';
  smtp?: SMTPConfig;
  isConfigured: boolean;
  lastTested?: string;
  testResult?: {
    success: boolean;
    message: string;
    testedAt: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'welcome' | 'assessment' | 'reminder' | 'notification' | 'system';
  variables: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  lastSent?: string;
  successRate: number;
  dailyCount: number;
  weeklyCount: number;
  monthlyCount: number;
}

export interface EmailHistory {
  id: string;
  to: string;
  subject: string;
  template?: string;
  status: 'sent' | 'failed' | 'pending';
  provider: 'smtp' | 'demo';
  messageId?: string;
  error?: string;
  sentAt: string;
  organizationId: string;
}

interface EmailServiceState {
  config: EmailServiceConfig;
  templates: EmailTemplate[];
  stats: EmailStats;
  history: EmailHistory[];
  isLoading: boolean;
  error: string | null;
  
  // Configuration actions
  setProvider: (provider: EmailServiceConfig['provider']) => void;
  configureSMTP: (config: SMTPConfig) => Promise<{ success: boolean; message: string }>;
  testConnection: () => Promise<{ success: boolean; message: string }>;
  resetConfiguration: () => void;
  
  // Email sending actions
  sendTestEmail: (email: string, organizationId: string) => Promise<EmailSendResult>;
  sendBrandedEmail: (options: {
    organizationId: string;
    to: string;
    subject: string;
    content: string;
    templateName?: string;
    variables?: Record<string, any>;
  }) => Promise<EmailSendResult>;
  
  // Template management
  createTemplate: (template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTemplate: (id: string, updates: Partial<EmailTemplate>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => EmailTemplate | null;
  
  // Statistics and history
  updateStats: (result: EmailSendResult) => void;
  addToHistory: (entry: Omit<EmailHistory, 'id'>) => void;
  clearHistory: () => void;
  getHistoryByOrganization: (organizationId: string) => EmailHistory[];
  
  // Utility actions
  validateEmailAddress: (email: string) => boolean;
  getProviderInfo: () => { name: string; status: string; lastTested?: string };
}

export const useEmailServiceStore = create<EmailServiceState>()(
  persist(
    (set, get) => ({
      config: {
        provider: 'demo',
        isConfigured: false
      },
      templates: getDefaultTemplates(),
      stats: {
        totalSent: 0,
        totalFailed: 0,
        successRate: 100,
        dailyCount: 0,
        weeklyCount: 0,
        monthlyCount: 0
      },
      history: [],
      isLoading: false,
      error: null,

      setProvider: (provider) => {
        set(state => ({
          config: {
            ...state.config,
            provider,
            isConfigured: provider === 'demo' // Demo is always "configured"
          }
        }));
      },

      configureSMTP: async (smtpConfig) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await smtpEmailService.configure(smtpConfig);
          
          set(state => ({
            config: {
              ...state.config,
              provider: 'smtp',
              smtp: smtpConfig,
              isConfigured: result.success,
              lastTested: result.success ? new Date().toISOString() : undefined,
              testResult: {
                success: result.success,
                message: result.message,
                testedAt: new Date().toISOString()
              }
            },
            isLoading: false,
            error: result.success ? null : result.message
          }));

          // Add notification
          const notificationStore = useNotificationStore.getState();
          if (result.success) {
            notificationStore.addSuccessNotification(
              'SMTP Configured',
              'Email service is now ready to send emails',
              { category: 'system' }
            );
          } else {
            notificationStore.addErrorNotification(
              'SMTP Configuration Failed',
              result.message,
              { category: 'system' }
            );
          }

          return result;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ 
            isLoading: false, 
            error: errorMessage,
            config: { ...get().config, isConfigured: false }
          });
          
          return {
            success: false,
            message: errorMessage
          };
        }
      },

      testConnection: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await smtpEmailService.testConnection();
          
          set(state => ({
            config: {
              ...state.config,
              lastTested: new Date().toISOString(),
              testResult: {
                success: result.success,
                message: result.message,
                testedAt: new Date().toISOString()
              }
            },
            isLoading: false,
            error: result.success ? null : result.message
          }));

          // Add notification
          const notificationStore = useNotificationStore.getState();
          if (result.success) {
            notificationStore.addSuccessNotification(
              'Connection Test Successful',
              'SMTP connection is working correctly',
              { category: 'system' }
            );
          } else {
            notificationStore.addWarningNotification(
              'Connection Test Failed',
              result.message,
              { category: 'system' }
            );
          }

          return result;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ isLoading: false, error: errorMessage });
          
          return {
            success: false,
            message: errorMessage
          };
        }
      },

      resetConfiguration: () => {
        smtpEmailService.reset();
        
        set(state => ({
          config: {
            provider: 'demo',
            isConfigured: false
          },
          error: null
        }));

        // Add notification
        const notificationStore = useNotificationStore.getState();
        notificationStore.addInfoNotification(
          'Email Service Reset',
          'Email service has been reset to demo mode',
          { category: 'system' }
        );
      },

      sendTestEmail: async (email, organizationId) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await smtpEmailService.sendTestEmail(email, organizationId);
          
          // Update statistics
          get().updateStats(result);
          
          // Add to history
          get().addToHistory({
            to: email,
            subject: 'SMTP Test Email',
            template: 'test',
            status: result.success ? 'sent' : 'failed',
            provider: result.provider as 'smtp' | 'demo',
            messageId: result.messageId,
            error: result.error,
            sentAt: new Date().toISOString(),
            organizationId
          });

          set({ isLoading: false });
          return result;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ isLoading: false, error: errorMessage });
          
          return {
            success: false,
            error: errorMessage,
            provider: 'smtp' as const
          };
        }
      },

      sendBrandedEmail: async (options) => {
        set({ isLoading: true, error: null });
        
        try {
          const result = await smtpEmailService.sendBrandedEmail({
            organizationId: options.organizationId,
            to: options.to,
            subject: options.subject,
            content: options.content,
            templateVariables: options.variables,
            category: 'notification'
          });
          
          // Update statistics
          get().updateStats(result);
          
          // Add to history
          get().addToHistory({
            to: options.to,
            subject: options.subject,
            template: options.templateName,
            status: result.success ? 'sent' : 'failed',
            provider: result.provider as 'smtp' | 'demo',
            messageId: result.messageId,
            error: result.error,
            sentAt: new Date().toISOString(),
            organizationId: options.organizationId
          });

          set({ isLoading: false });
          return result;
        } catch (error) {
          const errorMessage = (error as Error).message;
          set({ isLoading: false, error: errorMessage });
          
          return {
            success: false,
            error: errorMessage,
            provider: 'smtp' as const
          };
        }
      },

      createTemplate: (template) => {
        const newTemplate: EmailTemplate = {
          ...template,
          id: `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        set(state => ({
          templates: [...state.templates, newTemplate]
        }));

        // Add notification
        const notificationStore = useNotificationStore.getState();
        notificationStore.addSuccessNotification(
          'Template Created',
          `Email template "${template.name}" has been created`,
          { category: 'system' }
        );
      },

      updateTemplate: (id, updates) => {
        set(state => ({
          templates: state.templates.map(template =>
            template.id === id
              ? { ...template, ...updates, updatedAt: new Date().toISOString() }
              : template
          )
        }));

        // Add notification
        const notificationStore = useNotificationStore.getState();
        notificationStore.addSuccessNotification(
          'Template Updated',
          'Email template has been updated successfully',
          { category: 'system' }
        );
      },

      deleteTemplate: (id) => {
        const template = get().templates.find(t => t.id === id);
        if (template?.isDefault) {
          // Add error notification
          const notificationStore = useNotificationStore.getState();
          notificationStore.addErrorNotification(
            'Cannot Delete Template',
            'Default templates cannot be deleted',
            { category: 'system' }
          );
          return;
        }

        set(state => ({
          templates: state.templates.filter(template => template.id !== id)
        }));

        // Add notification
        const notificationStore = useNotificationStore.getState();
        notificationStore.addInfoNotification(
          'Template Deleted',
          'Email template has been deleted',
          { category: 'system' }
        );
      },

      getTemplate: (id) => {
        return get().templates.find(template => template.id === id) || null;
      },

      updateStats: (result) => {
        set(state => {
          const newStats = { ...state.stats };
          
          if (result.success) {
            newStats.totalSent++;
            newStats.lastSent = new Date().toISOString();
          } else {
            newStats.totalFailed++;
          }
          
          newStats.successRate = newStats.totalSent + newStats.totalFailed > 0 
            ? (newStats.totalSent / (newStats.totalSent + newStats.totalFailed)) * 100 
            : 100;

          // Update daily/weekly/monthly counts (simplified)
          newStats.dailyCount++;
          newStats.weeklyCount++;
          newStats.monthlyCount++;
          
          return { stats: newStats };
        });
      },

      addToHistory: (entry) => {
        const historyEntry: EmailHistory = {
          ...entry,
          id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        };
        
        set(state => ({
          history: [historyEntry, ...state.history].slice(0, 1000) // Keep last 1000 entries
        }));
      },

      clearHistory: () => {
        set({ history: [] });
        
        // Add notification
        const notificationStore = useNotificationStore.getState();
        notificationStore.addInfoNotification(
          'History Cleared',
          'Email history has been cleared',
          { category: 'system' }
        );
      },

      getHistoryByOrganization: (organizationId) => {
        return get().history.filter(entry => entry.organizationId === organizationId);
      },

      validateEmailAddress: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },

      getProviderInfo: () => {
        const state = get();
        const config = state.config;
        
        switch (config.provider) {
          case 'smtp':
            return {
              name: 'SMTP',
              status: config.isConfigured ? 'Configured' : 'Not Configured',
              lastTested: config.lastTested
            };
          case 'sendgrid':
            return {
              name: 'SendGrid',
              status: config.isConfigured ? 'Configured' : 'Not Configured',
              lastTested: config.lastTested
            };
          case 'mailgun':
            return {
              name: 'Mailgun',
              status: config.isConfigured ? 'Configured' : 'Not Configured',
              lastTested: config.lastTested
            };
          case 'demo':
          default:
            return {
              name: 'Demo Mode',
              status: 'Active (Development)',
              lastTested: undefined
            };
        }
      }
    }),
    {
      name: 'email-service-storage',
      partialize: (state) => ({
        config: {
          ...state.config,
          // Don't persist sensitive SMTP password
          smtp: state.config.smtp ? {
            ...state.config.smtp,
            password: '' // Clear password for security
          } : undefined
        },
        templates: state.templates,
        stats: state.stats,
        history: state.history.slice(0, 100) // Only persist last 100 history entries
      })
    }
  )
);

// Default email templates
function getDefaultTemplates(): EmailTemplate[] {
  return [
    {
      id: 'welcome-default',
      name: 'Welcome Email',
      subject: 'Welcome to {{companyName}} - Get Started',
      content: `
        <h2>Welcome to {{companyName}}!</h2>
        <p>Hello {{userName}},</p>
        <p>We're excited to have you join our team. Your account has been created and you're now part of our assessment and feedback system.</p>
        <div class="highlight">
          <h3>Getting Started:</h3>
          <ul>
            <li>Log in to your account using your email address</li>
            <li>Complete your profile information</li>
            <li>Explore the dashboard and available features</li>
            <li>Start participating in assessments</li>
          </ul>
        </div>
        <p>If you have any questions, please don't hesitate to contact support.</p>
        <a href="{{appUrl}}/login" class="button">Login to Your Account</a>
      `,
      category: 'welcome',
      variables: ['companyName', 'userName', 'appUrl'],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'assessment-invitation-default',
      name: 'Assessment Invitation',
      subject: 'Assessment Invitation: {{assessmentTitle}}',
      content: `
        <h2>Assessment Invitation</h2>
        <p>Hello {{userName}},</p>
        <p>You have been invited to complete an assessment that will help provide valuable feedback.</p>
        <div class="info-box">
          <h4>Assessment Details:</h4>
          <ul>
            <li><strong>Title:</strong> {{assessmentTitle}}</li>
            <li><strong>Organization:</strong> {{companyName}}</li>
            <li><strong>Due Date:</strong> {{dueDate}}</li>
            <li><strong>Estimated Time:</strong> {{estimatedTime}} minutes</li>
          </ul>
        </div>
        <p>Your feedback is important and will be kept confidential. Please complete the assessment by the due date.</p>
        <a href="{{assessmentUrl}}" class="button">Start Assessment</a>
      `,
      category: 'assessment',
      variables: ['userName', 'assessmentTitle', 'companyName', 'dueDate', 'estimatedTime', 'assessmentUrl'],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'reminder-default',
      name: 'Assessment Reminder',
      subject: 'Reminder: {{assessmentTitle}} - Due {{dueDate}}',
      content: `
        <h2>Assessment Reminder</h2>
        <p>Hello {{userName}},</p>
        <p>This is a friendly reminder that you have a pending assessment that needs to be completed.</p>
        <div class="highlight">
          <h3>Assessment: {{assessmentTitle}}</h3>
          <p><strong>Due Date:</strong> {{dueDate}}</p>
          <p><strong>Days Remaining:</strong> {{daysRemaining}}</p>
          {{#if urgent}}<p style="color: #dc3545; font-weight: bold;">⚠️ This assessment is due soon!</p>{{/if}}
        </div>
        <p>Please complete your assessment as soon as possible to ensure timely feedback.</p>
        <a href="{{assessmentUrl}}" class="button">Complete Assessment</a>
      `,
      category: 'reminder',
      variables: ['userName', 'assessmentTitle', 'dueDate', 'daysRemaining', 'urgent', 'assessmentUrl'],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'completion-default',
      name: 'Assessment Completed',
      subject: 'Assessment Completed: {{assessmentTitle}}',
      content: `
        <h2>Assessment Completed Successfully</h2>
        <p>Hello {{userName}},</p>
        <p>Thank you for completing the <strong>{{assessmentTitle}}</strong> assessment. Your feedback has been recorded.</p>
        <div class="info-box">
          <h4>Completion Details:</h4>
          <ul>
            <li><strong>Completed on:</strong> {{completionDate}}</li>
            <li><strong>Time taken:</strong> {{timeTaken}} minutes</li>
            <li><strong>Questions answered:</strong> {{questionsAnswered}}</li>
          </ul>
        </div>
        <p>Your responses will be processed along with other feedback to generate comprehensive results.</p>
        <a href="{{resultsUrl}}" class="button">View Results</a>
      `,
      category: 'notification',
      variables: ['userName', 'assessmentTitle', 'completionDate', 'timeTaken', 'questionsAnswered', 'resultsUrl'],
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
}