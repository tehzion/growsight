/**
 * GDPR Compliance Implementation
 * Comprehensive data protection and privacy compliance features
 */

import { supabase } from '../supabase';
import { validationSchemas, validateInput } from '../validation/schemas';
import SecureLogger from '../secureLogger';

export interface DataExportRequest {
  id: string;
  userId: string;
  requestType: 'full_export' | 'specific_data';
  dataTypes?: string[];
  format: 'json' | 'csv' | 'pdf';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
  reason?: string;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestType: 'soft_delete' | 'hard_delete';
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  reason: string;
  retentionPeriod: number; // days
  requestedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
  approvedBy?: string;
  confirmDeletion: boolean;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: 'marketing' | 'analytics' | 'functional' | 'necessary';
  granted: boolean;
  grantedAt: Date;
  withdrawnAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string; // Privacy policy version
}

export interface DataProcessingActivity {
  id: string;
  userId: string;
  activity: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataTypes: string[];
  retention: string;
  timestamp: Date;
  automated: boolean;
}

export class GDPRCompliance {
  private static instance: GDPRCompliance;

  static getInstance(): GDPRCompliance {
    if (!GDPRCompliance.instance) {
      GDPRCompliance.instance = new GDPRCompliance();
    }
    return GDPRCompliance.instance;
  }

  /**
   * Request data export (Article 20 - Right to data portability)
   */
  async requestDataExport(request: Omit<DataExportRequest, 'id' | 'status' | 'requestedAt'>): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Validate request
      const validation = validateInput(validationSchemas.dataExportRequest, request);
      if (!validation.success) {
        return { success: false, error: validation.errors?.join(', ') };
      }

      // Create export request
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          user_id: request.userId,
          request_type: request.requestType,
          data_types: request.dataTypes,
          format: request.format,
          reason: request.reason,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log the request
      await this.logDataProcessingActivity({
        userId: request.userId,
        activity: 'data_export_request',
        purpose: 'GDPR Article 20 - Data portability',
        legalBasis: 'legal_obligation',
        dataTypes: request.dataTypes || ['all'],
        retention: '30 days',
        automated: false
      });

      // Start async processing
      this.processDataExport(data.id).catch(error => {
        SecureLogger.error('Data export processing failed', { requestId: data.id, error });
      });

      return { success: true, requestId: data.id };
    } catch (error) {
      SecureLogger.error('Data export request failed', { error, request });
      return { success: false, error: 'Failed to process data export request' };
    }
  }

  /**
   * Request data deletion (Article 17 - Right to erasure)
   */
  async requestDataDeletion(request: Omit<DataDeletionRequest, 'id' | 'status' | 'requestedAt'>): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Validate request
      const validation = validateInput(validationSchemas.dataDeletionRequest, request);
      if (!validation.success) {
        return { success: false, error: validation.errors?.join(', ') };
      }

      // Create deletion request
      const { data, error } = await supabase
        .from('data_deletion_requests')
        .insert({
          user_id: request.userId,
          request_type: request.requestType,
          reason: request.reason,
          retention_period: request.retentionPeriod,
          confirm_deletion: request.confirmDeletion,
          status: 'pending',
          requested_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Log the request
      await this.logDataProcessingActivity({
        userId: request.userId,
        activity: 'data_deletion_request',
        purpose: 'GDPR Article 17 - Right to erasure',
        legalBasis: 'legal_obligation',
        dataTypes: ['all'],
        retention: 'immediate',
        automated: false
      });

      return { success: true, requestId: data.id };
    } catch (error) {
      SecureLogger.error('Data deletion request failed', { error, request });
      return { success: false, error: 'Failed to process data deletion request' };
    }
  }

  /**
   * Record user consent (Article 7 - Conditions for consent)
   */
  async recordConsent(consent: Omit<ConsentRecord, 'id' | 'grantedAt'>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('consent_records')
        .insert({
          user_id: consent.userId,
          consent_type: consent.consentType,
          granted: consent.granted,
          granted_at: new Date().toISOString(),
          ip_address: consent.ipAddress,
          user_agent: consent.userAgent,
          version: consent.version
        });

      if (error) throw error;

      // Log consent activity
      await this.logDataProcessingActivity({
        userId: consent.userId,
        activity: `consent_${consent.granted ? 'granted' : 'withdrawn'}`,
        purpose: `${consent.consentType} consent management`,
        legalBasis: 'consent',
        dataTypes: ['consent_records'],
        retention: '3 years',
        automated: false
      });

      return { success: true };
    } catch (error) {
      SecureLogger.error('Consent recording failed', { error, consent });
      return { success: false, error: 'Failed to record consent' };
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(userId: string, consentType: ConsentRecord['consentType']): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('consent_records')
        .update({
          granted: false,
          withdrawn_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('granted', true);

      if (error) throw error;

      // Log withdrawal
      await this.logDataProcessingActivity({
        userId,
        activity: 'consent_withdrawn',
        purpose: `${consentType} consent withdrawal`,
        legalBasis: 'legal_obligation',
        dataTypes: ['consent_records'],
        retention: '3 years',
        automated: false
      });

      return { success: true };
    } catch (error) {
      SecureLogger.error('Consent withdrawal failed', { error, userId, consentType });
      return { success: false, error: 'Failed to withdraw consent' };
    }
  }

  /**
   * Get user's current consent status
   */
  async getConsentStatus(userId: string): Promise<{ success: boolean; consents?: Record<string, boolean>; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('consent_type, granted, granted_at, withdrawn_at')
        .eq('user_id', userId)
        .order('granted_at', { ascending: false });

      if (error) throw error;

      // Get latest consent for each type
      const consents: Record<string, boolean> = {};
      const processed = new Set<string>();

      data?.forEach(record => {
        if (!processed.has(record.consent_type)) {
          consents[record.consent_type] = record.granted && !record.withdrawn_at;
          processed.add(record.consent_type);
        }
      });

      return { success: true, consents };
    } catch (error) {
      SecureLogger.error('Failed to get consent status', { error, userId });
      return { success: false, error: 'Failed to retrieve consent status' };
    }
  }

  /**
   * Process data export (background task)
   */
  private async processDataExport(requestId: string): Promise<void> {
    try {
      // Update status to processing
      await supabase
        .from('data_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      // Get request details
      const { data: request, error: requestError } = await supabase
        .from('data_export_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) throw requestError;

      // Collect user data
      const userData = await this.collectUserData(request.user_id, request.data_types);
      
      // Generate export file
      const exportData = this.formatExportData(userData, request.format);
      
      // Store export file (implement actual file storage)
      const downloadUrl = await this.storeExportFile(requestId, exportData, request.format);
      
      // Update request as completed
      await supabase
        .from('data_export_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          download_url: downloadUrl,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })
        .eq('id', requestId);

      // Notify user (implement notification system)
      await this.notifyDataExportComplete(request.user_id, downloadUrl);

    } catch (error) {
      SecureLogger.error('Data export processing failed', { error, requestId });
      
      // Update request as failed
      await supabase
        .from('data_export_requests')
        .update({ status: 'failed' })
        .eq('id', requestId);
    }
  }

  /**
   * Collect all user data for export
   */
  private async collectUserData(userId: string, dataTypes?: string[]): Promise<Record<string, any>> {
    const tables = dataTypes || [
      'users', 'user_profiles', 'assessments', 'assessment_responses', 
      'notifications', 'consent_records', 'data_processing_activities'
    ];

    const userData: Record<string, any> = {};

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId);

        if (!error && data) {
          userData[table] = data;
        }
      } catch (error) {
        SecureLogger.warn(`Failed to collect data from table ${table}`, { error, userId });
      }
    }

    return userData;
  }

  /**
   * Format export data based on requested format
   */
  private formatExportData(userData: Record<string, any>, format: 'json' | 'csv' | 'pdf'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(userData, null, 2);
      case 'csv':
        return this.convertToCSV(userData);
      case 'pdf':
        return this.convertToPDF(userData);
      default:
        return JSON.stringify(userData, null, 2);
    }
  }

  /**
   * Convert user data to CSV format
   */
  private convertToCSV(userData: Record<string, any>): string {
    const csvRows: string[] = [];
    
    Object.entries(userData).forEach(([tableName, records]) => {
      if (Array.isArray(records) && records.length > 0) {
        csvRows.push(`\n# ${tableName.toUpperCase()}`);
        const headers = Object.keys(records[0]);
        csvRows.push(headers.join(','));
        
        records.forEach(record => {
          const values = headers.map(header => {
            const value = record[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          });
          csvRows.push(values.join(','));
        });
      }
    });
    
    return csvRows.join('\n');
  }

  /**
   * Convert user data to PDF format (placeholder)
   */
  private convertToPDF(userData: Record<string, any>): string {
    // This would require a PDF generation library like jsPDF
    // For now, return JSON format
    return JSON.stringify(userData, null, 2);
  }

  /**
   * Store export file (implement actual file storage)
   */
  private async storeExportFile(requestId: string, data: string, format: string): Promise<string> {
    // This would integrate with your file storage system (AWS S3, etc.)
    // For now, return a placeholder URL
    return `/api/exports/${requestId}.${format}`;
  }

  /**
   * Notify user that data export is complete
   */
  private async notifyDataExportComplete(userId: string, downloadUrl: string): Promise<void> {
    // Implement notification system integration
    console.log(`Data export complete for user ${userId}: ${downloadUrl}`);
  }

  /**
   * Log data processing activity (Article 30 - Records of processing activities)
   */
  async logDataProcessingActivity(activity: Omit<DataProcessingActivity, 'id' | 'timestamp'>): Promise<void> {
    try {
      await supabase
        .from('data_processing_activities')
        .insert({
          user_id: activity.userId,
          activity: activity.activity,
          purpose: activity.purpose,
          legal_basis: activity.legalBasis,
          data_types: activity.dataTypes,
          retention: activity.retention,
          automated: activity.automated,
          timestamp: new Date().toISOString()
        });
    } catch (error) {
      SecureLogger.error('Failed to log data processing activity', { error, activity });
    }
  }

  /**
   * Get user's data processing history
   */
  async getDataProcessingHistory(userId: string): Promise<{ success: boolean; activities?: DataProcessingActivity[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('data_processing_activities')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      return { success: true, activities: data || [] };
    } catch (error) {
      SecureLogger.error('Failed to get data processing history', { error, userId });
      return { success: false, error: 'Failed to retrieve data processing history' };
    }
  }

  /**
   * Check if user has valid consent for specific processing
   */
  async hasValidConsent(userId: string, consentType: ConsentRecord['consentType']): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('consent_records')
        .select('granted, withdrawn_at')
        .eq('user_id', userId)
        .eq('consent_type', consentType)
        .eq('granted', true)
        .is('withdrawn_at', null)
        .order('granted_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      SecureLogger.error('Failed to check consent', { error, userId, consentType });
      return false;
    }
  }

  /**
   * Anonymize user data (GDPR Article 17 implementation helper)
   */
  async anonymizeUserData(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This would implement actual data anonymization
      // For example, replacing PII with anonymized values
      
      const anonymizedData = {
        first_name: 'Anonymous',
        last_name: 'User',
        email: `anonymous_${Date.now()}@example.com`,
        phone: null,
        anonymized_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('users')
        .update(anonymizedData)
        .eq('id', userId);

      if (error) throw error;

      // Log anonymization
      await this.logDataProcessingActivity({
        userId,
        activity: 'data_anonymization',
        purpose: 'GDPR Article 17 - Right to erasure',
        legalBasis: 'legal_obligation',
        dataTypes: ['personal_data'],
        retention: 'permanent',
        automated: false
      });

      return { success: true };
    } catch (error) {
      SecureLogger.error('Data anonymization failed', { error, userId });
      return { success: false, error: 'Failed to anonymize user data' };
    }
  }
}

export const gdprCompliance = GDPRCompliance.getInstance();