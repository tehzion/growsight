import { supabase } from '../lib/supabase';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  organizationId: string;
  departmentId?: string;
  contactType: 'department_admin' | 'org_admin' | 'all_org_admins' | 'super_admin' | 'other';
  contactRecipients: string[];
  contactDepartments: string[];
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  category: 'technical' | 'assessment' | 'user_management' | 'billing' | 'general' | 'other';
  assessmentId?: string;
  assessmentResultId?: string;
  assignedToId?: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface SupportTicketResponse {
  id: string;
  ticketId: string;
  userId: string;
  responseText: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketAttachment {
  id: string;
  ticketId: string;
  responseId?: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileType?: string;
  uploadedById: string;
  createdAt: string;
}

export interface ContactOption {
  contactType: string;
  contactLabel: string;
  contactRecipients: string[];
  contactDepartments: string[];
  description?: string;
}

export interface CreateTicketData {
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'technical' | 'assessment' | 'user_management' | 'billing' | 'general' | 'other';
  contactType: 'department_admin' | 'org_admin' | 'all_org_admins' | 'super_admin' | 'other';
  contactRecipients?: string[];
  contactDepartments?: string[];
  assessmentId?: string;
  assessmentResultId?: string;
}

class SupportService {
  async createTicket(userId: string, data: CreateTicketData): Promise<SupportTicket> {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        organization_id: (await this.getUserOrganization(userId)),
        department_id: (await this.getUserDepartment(userId)),
        contact_type: data.contactType,
        contact_recipients: data.contactRecipients || [],
        contact_departments: data.contactDepartments || [],
        subject: data.subject,
        description: data.description,
        priority: data.priority || 'medium',
        category: data.category || 'general',
        assessment_id: data.assessmentId,
        assessment_result_id: data.assessmentResultId,
        created_by_id: userId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create support ticket: ${error.message}`);
    }

    return this.mapTicketFromDB(ticket);
  }

  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        organizations (name),
        departments (name),
        assessments (title),
        assessment_results (overall_score)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user tickets: ${error.message}`);
    }

    return tickets.map(this.mapTicketFromDB);
  }

  async getOrganizationTickets(organizationId: string): Promise<SupportTicket[]> {
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users (first_name, last_name, email),
        departments (name),
        assessments (title),
        assessment_results (overall_score)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch organization tickets: ${error.message}`);
    }

    return tickets.map(this.mapTicketFromDB);
  }

  async getTicket(ticketId: string): Promise<SupportTicket> {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        organizations (name),
        departments (name),
        assessments (title),
        assessment_results (overall_score),
        users (first_name, last_name, email)
      `)
      .eq('id', ticketId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch ticket: ${error.message}`);
    }

    return this.mapTicketFromDB(ticket);
  }

  async updateTicket(ticketId: string, updates: Partial<SupportTicket>): Promise<SupportTicket> {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }

    return this.mapTicketFromDB(ticket);
  }

  async assignTicket(ticketId: string, assignedToId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      assignedToId,
      assignedAt: new Date().toISOString(),
      status: 'in_progress'
    });
  }

  async resolveTicket(ticketId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: 'resolved',
      resolvedAt: new Date().toISOString()
    });
  }

  async closeTicket(ticketId: string): Promise<SupportTicket> {
    return this.updateTicket(ticketId, {
      status: 'closed',
      closedAt: new Date().toISOString()
    });
  }

  async addResponse(ticketId: string, userId: string, responseText: string, isInternal: boolean = false): Promise<SupportTicketResponse> {
    const { data: response, error } = await supabase
      .from('support_ticket_responses')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        response_text: responseText,
        is_internal: isInternal
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add response: ${error.message}`);
    }

    return this.mapResponseFromDB(response);
  }

  async getTicketResponses(ticketId: string): Promise<SupportTicketResponse[]> {
    const { data: responses, error } = await supabase
      .from('support_ticket_responses')
      .select(`
        *,
        users (first_name, last_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ticket responses: ${error.message}`);
    }

    return responses.map(this.mapResponseFromDB);
  }

  async getContactOptions(userId: string): Promise<ContactOption[]> {
    try {
      // Get user's organization and department
      const userOrg = await this.getUserOrganization(userId);
      const userDept = await this.getUserDepartment(userId);
      const userRole = await this.getUserRole(userId);

      const contactOptions: ContactOption[] = [];

      // Department Admin contact option
      if (userDept) {
        const deptAdmins = await this.getDepartmentAdmins(userDept);
        if (deptAdmins.length > 0) {
          contactOptions.push({
            contactType: 'department_admin',
            contactLabel: 'Department Administrator',
            contactRecipients: deptAdmins.map(admin => admin.email),
            contactDepartments: [userDept],
            description: 'Contact your department administrator for department-specific issues'
          });
        }
      }

      // Organization Admin contact option
      const orgAdmins = await this.getOrganizationAdmins(userOrg);
      if (orgAdmins.length > 0) {
        contactOptions.push({
          contactType: 'org_admin',
          contactLabel: 'Organization Administrator',
          contactRecipients: orgAdmins.map(admin => admin.email),
          contactDepartments: [],
          description: 'Contact your organization administrator for organization-wide issues'
        });
      }

      // All Org Admins contact option (for org admins)
      if (userRole === 'org_admin') {
        contactOptions.push({
          contactType: 'all_org_admins',
          contactLabel: 'All Organization Administrators',
          contactRecipients: orgAdmins.map(admin => admin.email),
          contactDepartments: [],
          description: 'Contact all organization administrators'
        });
      }

      // Super Admin contact option
      const superAdmins = await this.getSuperAdmins();
      if (superAdmins.length > 0) {
        contactOptions.push({
          contactType: 'super_admin',
          contactLabel: 'Super Administrator',
          contactRecipients: superAdmins.map(admin => admin.email),
          contactDepartments: [],
          description: 'Contact super administrator for system-wide issues'
        });
      }

      // Other/General contact option
      contactOptions.push({
        contactType: 'other',
        contactLabel: 'General Support',
        contactRecipients: ['support@growsight.com'],
        contactDepartments: [],
        description: 'Contact general support for any other issues'
      });

      return contactOptions;
    } catch (error) {
      console.error('Error getting contact options:', error);
      // Return fallback options
      return [
        {
          contactType: 'other',
          contactLabel: 'General Support',
          contactRecipients: ['support@growsight.com'],
          contactDepartments: [],
          description: 'Contact general support for any issues'
        }
      ];
    }
  }

  async getOrganizationAdmins(organizationId: string): Promise<any[]> {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('organization_id', organizationId)
      .eq('role', 'org_admin')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching org admins:', error);
      return [];
    }

    return admins || [];
  }

  async getDepartmentAdmins(departmentId: string): Promise<any[]> {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('department_id', departmentId)
      .eq('role', 'dept_admin')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching dept admins:', error);
      return [];
    }

    return admins || [];
  }

  async getSuperAdmins(): Promise<any[]> {
    const { data: admins, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .eq('role', 'super_admin')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching super admins:', error);
      return [];
    }

    return admins || [];
  }

  async uploadAttachment(ticketId: string, file: File, responseId?: string): Promise<SupportTicketAttachment> {
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `support-attachments/${ticketId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload attachment: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath);

    const { data: attachment, error } = await supabase
      .from('support_ticket_attachments')
      .insert({
        ticket_id: ticketId,
        response_id: responseId,
        file_name: file.name,
        file_url: publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by_id: (await this.getCurrentUserId())
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save attachment record: ${error.message}`);
    }

    return this.mapAttachmentFromDB(attachment);
  }

  async getTicketAttachments(ticketId: string): Promise<SupportTicketAttachment[]> {
    const { data: attachments, error } = await supabase
      .from('support_ticket_attachments')
      .select(`
        *,
        users (first_name, last_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ticket attachments: ${error.message}`);
    }

    return attachments.map(this.mapAttachmentFromDB);
  }

  private async getUserOrganization(userId: string): Promise<string> {
    const { data: user, error } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (error || !user?.organization_id) {
      throw new Error('User organization not found');
    }

    return user.organization_id;
  }

  private async getUserDepartment(userId: string): Promise<string | null> {
    const { data: user, error } = await supabase
      .from('users')
      .select('department_id')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user department:', error);
      return null;
    }

    return user?.department_id || null;
  }

  private async getUserRole(userId: string): Promise<string> {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return 'user';
    }

    return user?.role || 'user';
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  private mapTicketFromDB(dbTicket: any): SupportTicket {
    return {
      id: dbTicket.id,
      ticketNumber: dbTicket.ticket_number,
      userId: dbTicket.user_id,
      organizationId: dbTicket.organization_id,
      departmentId: dbTicket.department_id,
      contactType: dbTicket.contact_type,
      contactRecipients: dbTicket.contact_recipients || [],
      contactDepartments: dbTicket.contact_departments || [],
      subject: dbTicket.subject,
      description: dbTicket.description,
      priority: dbTicket.priority,
      status: dbTicket.status,
      category: dbTicket.category,
      assessmentId: dbTicket.assessment_id,
      assessmentResultId: dbTicket.assessment_result_id,
      assignedToId: dbTicket.assigned_to_id,
      assignedAt: dbTicket.assigned_at,
      resolvedAt: dbTicket.resolved_at,
      closedAt: dbTicket.closed_at,
      createdAt: dbTicket.created_at,
      updatedAt: dbTicket.updated_at,
      createdById: dbTicket.created_by_id
    };
  }

  private mapResponseFromDB(dbResponse: any): SupportTicketResponse {
    return {
      id: dbResponse.id,
      ticketId: dbResponse.ticket_id,
      userId: dbResponse.user_id,
      responseText: dbResponse.response_text,
      isInternal: dbResponse.is_internal,
      createdAt: dbResponse.created_at,
      updatedAt: dbResponse.updated_at
    };
  }

  private mapAttachmentFromDB(dbAttachment: any): SupportTicketAttachment {
    return {
      id: dbAttachment.id,
      ticketId: dbAttachment.ticket_id,
      responseId: dbAttachment.response_id,
      fileName: dbAttachment.file_name,
      fileUrl: dbAttachment.file_url,
      fileSize: dbAttachment.file_size,
      fileType: dbAttachment.file_type,
      uploadedById: dbAttachment.uploaded_by_id,
      createdAt: dbAttachment.created_at
    };
  }
}

export const supportService = new SupportService(); 