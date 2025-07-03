import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string;
  organizationId?: string;
  createdById?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  assignedOrganizations?: string[];
}

export interface TemplateQuestion {
  id: string;
  templateId: string;
  questionText: string;
  questionType: 'rating' | 'text' | 'multiple_choice' | 'dropdown' | 'boolean';
  category?: string;
  section?: string;
  orderIndex: number;
  isRequired: boolean;
  options?: any;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateAssignment {
  id: string;
  templateId: string;
  organizationId: string;
  assignedById?: string;
  assignedAt: string;
  isActive: boolean;
  organizationName?: string;
}

export interface DefaultTemplateSetting {
  id: string;
  templateId?: string;
  settingType: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  templateName?: string;
}

export interface CreateTemplateData {
  name: string;
  description?: string;
  organizationId?: string;
  questions: Omit<TemplateQuestion, 'id' | 'templateId' | 'createdAt' | 'updatedAt'>[];
}

export interface CloneTemplateData {
  templateId: string;
  newName: string;
  newDescription?: string;
  organizationId?: string;
}

interface TemplateStore {
  // State
  templates: AssessmentTemplate[];
  templateQuestions: Record<string, TemplateQuestion[]>;
  templateAssignments: TemplateAssignment[];
  defaultSettings: DefaultTemplateSetting[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTemplates: (organizationId?: string) => Promise<void>;
  fetchTemplateQuestions: (templateId: string) => Promise<void>;
  fetchTemplateAssignments: (templateId?: string) => Promise<void>;
  fetchDefaultSettings: () => Promise<void>;
  
  createTemplate: (data: CreateTemplateData) => Promise<AssessmentTemplate>;
  updateTemplate: (templateId: string, updates: Partial<AssessmentTemplate>) => Promise<AssessmentTemplate>;
  deleteTemplate: (templateId: string) => Promise<void>;
  cloneTemplate: (data: CloneTemplateData) => Promise<AssessmentTemplate>;
  
  setDefaultTemplate: (templateId: string, settingType?: string) => Promise<void>;
  assignTemplateToOrganizations: (templateId: string, organizationIds: string[]) => Promise<void>;
  unassignTemplateFromOrganizations: (templateId: string, organizationIds: string[]) => Promise<void>;
  
  createAssessmentFromTemplate: (templateId: string, organizationId: string, title: string, description?: string) => Promise<string>;
  getDefaultTemplateForOrganization: (organizationId: string) => Promise<AssessmentTemplate | null>;
  
  clearError: () => void;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  // Initial state
  templates: [],
  templateQuestions: {},
  templateAssignments: [],
  defaultSettings: [],
  isLoading: false,
  error: null,

  // Fetch templates
  fetchTemplates: async (organizationId?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('assessment_templates')
        .select(`
          *,
          organizations (name),
          template_questions (count)
        `)
        .eq('is_active', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const templates = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        organizationId: template.organization_id,
        createdById: template.created_by_id,
        isDefault: template.is_default,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        questionCount: template.template_questions?.[0]?.count || 0
      }));

      set({ templates, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch template questions
  fetchTemplateQuestions: async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_questions')
        .select('*')
        .eq('template_id', templateId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      const questions = data.map(q => ({
        id: q.id,
        templateId: q.template_id,
        questionText: q.question_text,
        questionType: q.question_type,
        category: q.category,
        section: q.section,
        orderIndex: q.order_index,
        isRequired: q.is_required,
        options: q.options,
        createdAt: q.created_at,
        updatedAt: q.updated_at
      }));

      set(state => ({
        templateQuestions: {
          ...state.templateQuestions,
          [templateId]: questions
        }
      }));
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Fetch template assignments
  fetchTemplateAssignments: async (templateId?: string) => {
    try {
      let query = supabase
        .from('template_assignments')
        .select(`
          *,
          organizations (name),
          assessment_templates (name)
        `)
        .eq('is_active', true);

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query.order('assigned_at', { ascending: false });

      if (error) throw error;

      const assignments = data.map(assignment => ({
        id: assignment.id,
        templateId: assignment.template_id,
        organizationId: assignment.organization_id,
        assignedById: assignment.assigned_by_id,
        assignedAt: assignment.assigned_at,
        isActive: assignment.is_active,
        organizationName: assignment.organizations?.name
      }));

      set({ templateAssignments: assignments });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Fetch default settings
  fetchDefaultSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('default_template_settings')
        .select(`
          *,
          assessment_templates (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const settings = data.map(setting => ({
        id: setting.id,
        templateId: setting.template_id,
        settingType: setting.setting_type,
        createdById: setting.created_by_id,
        createdAt: setting.created_at,
        updatedAt: setting.updated_at,
        templateName: setting.assessment_templates?.name
      }));

      set({ defaultSettings: settings });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  // Create template
  createTemplate: async (data: CreateTemplateData) => {
    set({ isLoading: true, error: null });
    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('assessment_templates')
        .insert({
          name: data.name,
          description: data.description,
          organization_id: data.organizationId,
          created_by_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create questions
      if (data.questions.length > 0) {
        const questionsData = data.questions.map((q, index) => ({
          template_id: template.id,
          question_text: q.questionText,
          question_type: q.questionType,
          category: q.category,
          section: q.section,
          order_index: q.orderIndex,
          is_required: q.isRequired,
          options: q.options
        }));

        const { error: questionsError } = await supabase
          .from('template_questions')
          .insert(questionsData);

        if (questionsError) throw questionsError;
      }

      const newTemplate: AssessmentTemplate = {
        id: template.id,
        name: template.name,
        description: template.description,
        organizationId: template.organization_id,
        createdById: template.created_by_id,
        isDefault: template.is_default,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        questionCount: data.questions.length
      };

      set(state => ({
        templates: [newTemplate, ...state.templates],
        isLoading: false
      }));

      return newTemplate;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Update template
  updateTemplate: async (templateId: string, updates: Partial<AssessmentTemplate>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('assessment_templates')
        .update({
          name: updates.name,
          description: updates.description,
          is_default: updates.isDefault,
          is_active: updates.isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId)
        .select()
        .single();

      if (error) throw error;

      const updatedTemplate: AssessmentTemplate = {
        id: data.id,
        name: data.name,
        description: data.description,
        organizationId: data.organization_id,
        createdById: data.created_by_id,
        isDefault: data.is_default,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      set(state => ({
        templates: state.templates.map(t => 
          t.id === templateId ? updatedTemplate : t
        ),
        isLoading: false
      }));

      return updatedTemplate;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Delete template
  deleteTemplate: async (templateId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('assessment_templates')
        .update({ is_active: false })
        .eq('id', templateId);

      if (error) throw error;

      set(state => ({
        templates: state.templates.filter(t => t.id !== templateId),
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Clone template
  cloneTemplate: async (data: CloneTemplateData) => {
    set({ isLoading: true, error: null });
    try {
      // Get original template questions
      const { data: questions, error: questionsError } = await supabase
        .from('template_questions')
        .select('*')
        .eq('template_id', data.templateId)
        .order('order_index', { ascending: true });

      if (questionsError) throw questionsError;

      // Create new template
      const { data: template, error: templateError } = await supabase
        .from('assessment_templates')
        .insert({
          name: data.newName,
          description: data.newDescription,
          organization_id: data.organizationId,
          created_by_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Clone questions
      if (questions.length > 0) {
        const clonedQuestions = questions.map(q => ({
          template_id: template.id,
          question_text: q.question_text,
          question_type: q.question_type,
          category: q.category,
          section: q.section,
          order_index: q.order_index,
          is_required: q.is_required,
          options: q.options
        }));

        const { error: cloneError } = await supabase
          .from('template_questions')
          .insert(clonedQuestions);

        if (cloneError) throw cloneError;
      }

      const clonedTemplate: AssessmentTemplate = {
        id: template.id,
        name: template.name,
        description: template.description,
        organizationId: template.organization_id,
        createdById: template.created_by_id,
        isDefault: template.is_default,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at,
        questionCount: questions.length
      };

      set(state => ({
        templates: [clonedTemplate, ...state.templates],
        isLoading: false
      }));

      return clonedTemplate;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Set default template
  setDefaultTemplate: async (templateId: string, settingType: string = 'global_default') => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.rpc('set_default_template', {
        template_id: templateId,
        setting_type: settingType
      });

      if (error) throw error;

      // Refresh default settings
      await get().fetchDefaultSettings();
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Assign template to organizations
  assignTemplateToOrganizations: async (templateId: string, organizationIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      for (const orgId of organizationIds) {
        const { error } = await supabase.rpc('assign_template_to_organization', {
          template_id: templateId,
          organization_id: orgId
        });

        if (error) throw error;
      }

      // Refresh assignments
      await get().fetchTemplateAssignments(templateId);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Unassign template from organizations
  unassignTemplateFromOrganizations: async (templateId: string, organizationIds: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('template_assignments')
        .update({ is_active: false })
        .eq('template_id', templateId)
        .in('organization_id', organizationIds);

      if (error) throw error;

      // Refresh assignments
      await get().fetchTemplateAssignments(templateId);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Create assessment from template
  createAssessmentFromTemplate: async (templateId: string, organizationId: string, title: string, description?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.rpc('create_assessment_from_template', {
        template_id: templateId,
        organization_id: organizationId,
        title: title,
        description: description
      });

      if (error) throw error;

      set({ isLoading: false });
      return data;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  // Get default template for organization
  getDefaultTemplateForOrganization: async (organizationId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_default_template_for_organization', {
        org_id: organizationId
      });

      if (error) throw error;

      if (!data) return null;

      // Get template details
      const { data: template, error: templateError } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('id', data)
        .single();

      if (templateError) throw templateError;

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        organizationId: template.organization_id,
        createdById: template.created_by_id,
        isDefault: template.is_default,
        isActive: template.is_active,
        createdAt: template.created_at,
        updatedAt: template.updated_at
      };
    } catch (error) {
      set({ error: (error as Error).message });
      return null;
    }
  },

  // Clear error
  clearError: () => set({ error: null })
})); 