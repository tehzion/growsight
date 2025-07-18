import { supabase } from '../lib/supabase';
import { emailService } from './emailService';
import { emailNotificationService } from './emailNotificationService';
import { config } from '../config/environment';
import SecureLogger from '../lib/secureLogger';
import { User } from '../types';

export interface BulkUserData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string;
  jobTitle?: string;
  phone?: string;
  location?: string;
}

export interface BulkUserResult {
  success: boolean;
  email: string;
  userId?: string;
  error?: string;
  tempPassword?: string;
}

export interface BulkUserImportResult {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  results: BulkUserResult[];
  errors: string[];
  importId: string;
  organizationId: string;
  importedBy: string;
  startedAt: string;
  completedAt: string;
}

export interface BulkUserValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export class BulkUserService {
  private static instance: BulkUserService;
  
  static getInstance(): BulkUserService {
    if (!BulkUserService.instance) {
      BulkUserService.instance = new BulkUserService();
    }
    return BulkUserService.instance;
  }

  /**
   * Parse CSV file and validate data
   */
  async parseCSV(file: File): Promise<{ data: BulkUserData[]; errors: BulkUserValidationError[] }> {
    const errors: BulkUserValidationError[] = [];
    const data: BulkUserData[] = [];

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      
      dataLines.forEach((line, index) => {
        const row = index + 2; // +2 because we skipped header and arrays are 0-indexed
        const columns = this.parseCSVLine(line);
        
        if (columns.length < 4) {
          errors.push({
            row,
            field: 'general',
            value: line,
            message: 'Insufficient columns. Required: email, firstName, lastName, role'
          });
          return;
        }

        const userData: BulkUserData = {
          email: columns[0]?.trim() || '',
          firstName: columns[1]?.trim() || '',
          lastName: columns[2]?.trim() || '',
          role: columns[3]?.trim() || '',
          department: columns[4]?.trim() || undefined,
          jobTitle: columns[5]?.trim() || undefined,
          phone: columns[6]?.trim() || undefined,
          location: columns[7]?.trim() || undefined
        };

        // Validate user data
        const validationErrors = this.validateUserData(userData, row);
        errors.push(...validationErrors);

        if (validationErrors.length === 0) {
          data.push(userData);
        }
      });

      return { data, errors };
    } catch (error) {
      throw new Error(`Failed to parse CSV file: ${(error as Error).message}`);
    }
  }

  /**
   * Validate individual user data
   */
  private validateUserData(userData: BulkUserData, row: number): BulkUserValidationError[] {
    const errors: BulkUserValidationError[] = [];

    // Email validation
    if (!userData.email) {
      errors.push({
        row,
        field: 'email',
        value: userData.email,
        message: 'Email is required'
      });
    } else if (!this.isValidEmail(userData.email)) {
      errors.push({
        row,
        field: 'email',
        value: userData.email,
        message: 'Invalid email format'
      });
    }

    // First name validation
    if (!userData.firstName) {
      errors.push({
        row,
        field: 'firstName',
        value: userData.firstName,
        message: 'First name is required'
      });
    } else if (userData.firstName.length < 2) {
      errors.push({
        row,
        field: 'firstName',
        value: userData.firstName,
        message: 'First name must be at least 2 characters'
      });
    }

    // Last name validation
    if (!userData.lastName) {
      errors.push({
        row,
        field: 'lastName',
        value: userData.lastName,
        message: 'Last name is required'
      });
    } else if (userData.lastName.length < 2) {
      errors.push({
        row,
        field: 'lastName',
        value: userData.lastName,
        message: 'Last name must be at least 2 characters'
      });
    }

    // Role validation
    const validRoles = ['employee', 'reviewer', 'org_admin', 'subscriber'];
    if (!userData.role) {
      errors.push({
        row,
        field: 'role',
        value: userData.role,
        message: 'Role is required'
      });
    } else if (!validRoles.includes(userData.role.toLowerCase())) {
      errors.push({
        row,
        field: 'role',
        value: userData.role,
        message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      });
    }

    return errors;
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check for duplicate emails in database
   */
  async checkDuplicateEmails(emails: string[]): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .in('email', emails)
        .eq('is_active', true);

      if (error) throw error;

      return data?.map((user: { email: string }) => user.email) || [];
    } catch (error) {
      SecureLogger.error('Failed to check duplicate emails', error);
      throw new Error('Failed to check for existing users');
    }
  }

  /**
   * Create users in bulk
   */
  async createBulkUsers(
    users: BulkUserData[],
    organizationId: string,
    importedBy: string,
    batchSize: number = 10
  ): Promise<BulkUserImportResult> {
    const importId = `bulk-import-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const startedAt = new Date().toISOString();
    const results: BulkUserResult[] = [];
    const errors: string[] = [];

    try {
      // Check for duplicate emails
      const emails = users.map(u => u.email.toLowerCase());
      const existingEmails = await this.checkDuplicateEmails(emails);
      
      if (existingEmails.length > 0) {
        errors.push(`Found ${existingEmails.length} existing users: ${existingEmails.join(', ')}`);
      }

      // Process users in batches
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const batchResults = await this.processBatch(batch, organizationId, existingEmails);
        results.push(...batchResults);

        // Add small delay between batches to avoid rate limiting
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const successfulImports = results.filter(r => r.success).length;
      const failedImports = results.filter(r => !r.success).length;

      const importResult: BulkUserImportResult = {
        totalRecords: users.length,
        successfulImports,
        failedImports,
        results,
        errors,
        importId,
        organizationId,
        importedBy,
        startedAt,
        completedAt: new Date().toISOString()
      };

      // Log import result
      SecureLogger.info(`Bulk user import completed - Import ID: ${importId}, Organization: ${organizationId}, Total: ${users.length}, Success: ${successfulImports}, Failed: ${failedImports}`);

      return importResult;
    } catch (error) {
      SecureLogger.error('Bulk user import failed', error);
      throw new Error(`Bulk import failed: ${(error as Error).message}`);
    }
  }

  /**
   * Process a batch of users
   */
  private async processBatch(
    users: BulkUserData[],
    organizationId: string,
    existingEmails: string[]
  ): Promise<BulkUserResult[]> {
    const results: BulkUserResult[] = [];

    for (const userData of users) {
      try {
        // Skip if email already exists
        if (existingEmails.includes(userData.email.toLowerCase())) {
          results.push({
            success: false,
            email: userData.email,
            error: 'User already exists'
          });
          continue;
        }

        // Generate temporary password
        const tempPassword = 'Temp' + Math.random().toString(36).substring(2, 10) + '!';

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userData.email.toLowerCase().trim(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: userData.firstName.trim(),
            last_name: userData.lastName.trim(),
            role: userData.role.toLowerCase(),
            organization_id: organizationId,
            requires_password_change: true
          }
        });

        if (authError) {
          results.push({
            success: false,
            email: userData.email,
            error: `Auth creation failed: ${authError.message}`
          });
          continue;
        }

        if (!authData.user) {
          results.push({
            success: false,
            email: userData.email,
            error: 'Failed to create user account'
          });
          continue;
        }

        // Create user profile in database
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: userData.email.toLowerCase().trim(),
            first_name: userData.firstName.trim(),
            last_name: userData.lastName.trim(),
            role: userData.role.toLowerCase(),
            organization_id: organizationId,
            department: userData.department,
            title: userData.jobTitle,
            phone: userData.phone,
            requires_password_change: true,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (profileError) {
          // If profile creation fails, delete the auth user
          await supabase.auth.admin.deleteUser(authData.user.id);
          results.push({
            success: false,
            email: userData.email,
            error: `Profile creation failed: ${profileError.message}`
          });
          continue;
        }

        // Send email notification
        try {
          await emailNotificationService.sendOrgAdminAccountCreatedNotification({
            recipientEmail: userData.email,
            recipientName: `${userData.firstName} ${userData.lastName}`,
            organizationId: organizationId,
            loginUrl: `${config.app.url}/login`,
            temporaryPassword: tempPassword
          });
        } catch (emailError) {
          SecureLogger.warn('Failed to send user creation email', emailError);
          // Don't fail user creation if email fails
        }

        results.push({
          success: true,
          email: userData.email,
          userId: profileData.id,
          tempPassword
        });

      } catch (error) {
        results.push({
          success: false,
          email: userData.email,
          error: (error as Error).message
        });
      }
    }

    return results;
  }

  /**
   * Get import history for an organization
   */
  async getImportHistory(organizationId: string): Promise<BulkUserImportResult[]> {
    try {
      const { data, error } = await supabase
        .from('bulk_user_imports')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      SecureLogger.error('Failed to fetch import history', error);
      throw new Error('Failed to fetch import history');
    }
  }

  /**
   * Save import result to database
   */
  async saveImportResult(result: BulkUserImportResult): Promise<void> {
    try {
      const { error } = await supabase
        .from('bulk_user_imports')
        .insert({
          import_id: result.importId,
          organization_id: result.organizationId,
          imported_by: result.importedBy,
          total_records: result.totalRecords,
          successful_imports: result.successfulImports,
          failed_imports: result.failedImports,
          results: result.results,
          errors: result.errors,
          started_at: result.startedAt,
          completed_at: result.completedAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      SecureLogger.error('Failed to save import result', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Generate CSV template for bulk import
   */
  generateCSVTemplate(): string {
    const headers = [
      'email',
      'firstName', 
      'lastName',
      'role',
      'department',
      'jobTitle',
      'phone',
      'location'
    ];

    const example = [
      'john.doe@company.com',
      'John',
      'Doe',
      'employee',
      'Engineering',
      'Software Engineer',
      '+1234567890',
      'New York'
    ];

    return [headers.join(','), example.join(',')].join('\n');
  }

  /**
   * Export users to CSV
   */
  async exportUsersToCSV(organizationId: string): Promise<string> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('email, first_name, last_name, role, department, title, phone')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const headers = ['email', 'firstName', 'lastName', 'role', 'department', 'jobTitle', 'phone'];
      const csvRows = [headers.join(',')];

      users?.forEach((user: { email: string; first_name: string; last_name: string; role: string; department?: string; title?: string; phone?: string }) => {
        const row = [
          user.email,
          user.first_name,
          user.last_name,
          user.role,
          user.department || '',
          user.title || '',
          user.phone || ''
        ].map(field => `"${field}"`).join(',');
        
        csvRows.push(row);
      });

      return csvRows.join('\n');
    } catch (error) {
      SecureLogger.error('Failed to export users to CSV', error);
      throw new Error('Failed to export users');
    }
  }
}

// Export singleton instance
export const bulkUserService = BulkUserService.getInstance(); 