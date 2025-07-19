/**
 * Comprehensive Input Validation Schemas
 * Zod-based validation for all user inputs and API data
 */

import { z } from 'zod';

// Base validation patterns
const emailSchema = z.string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(255, 'Email too long')
  .transform(email => email.toLowerCase().trim());

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number, and special character');

const phoneSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL too long')
  .optional()
  .or(z.literal(''));

// User-related schemas
export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid characters in first name'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid characters in last name'),
  organizationId: z.string()
    .uuid('Invalid organization ID')
    .optional(),
  role: z.enum(['employee', 'reviewer', 'org_admin', 'subscriber'], {
    errorMap: () => ({ message: 'Invalid role specified' })
  }).optional(),
  phone: phoneSchema,
  title: z.string()
    .max(100, 'Title too long')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .max(100, 'Department name too long')
    .optional()
    .or(z.literal(''))
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

export const userUpdateSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid characters in first name'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .regex(/^[a-zA-Z\s\-'\.]+$/, 'Invalid characters in last name'),
  phone: phoneSchema,
  title: z.string()
    .max(100, 'Title too long')
    .optional()
    .or(z.literal('')),
  department: z.string()
    .max(100, 'Department name too long')
    .optional()
    .or(z.literal(''))
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  organizationId: z.string()
    .uuid('Invalid organization ID')
    .optional(),
  rememberMe: z.boolean().optional()
});

export const otpSchema = z.object({
  email: emailSchema,
  otp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  organizationId: z.string()
    .uuid('Invalid organization ID')
    .optional()
});

// Organization schemas
export const organizationSchema = z.object({
  name: z.string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name too long')
    .regex(/^[a-zA-Z0-9\s\-&.,()]+$/, 'Invalid characters in organization name'),
  description: z.string()
    .max(500, 'Description too long')
    .optional()
    .or(z.literal('')),
  website: urlSchema,
  industry: z.string()
    .max(100, 'Industry name too long')
    .optional()
    .or(z.literal('')),
  size: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+'], {
    errorMap: () => ({ message: 'Invalid organization size' })
  }).optional(),
  address: z.string()
    .max(200, 'Address too long')
    .optional()
    .or(z.literal('')),
  phone: phoneSchema,
  settings: z.object({
    allowSelfRegistration: z.boolean().optional(),
    requireEmailVerification: z.boolean().optional(),
    passwordPolicy: z.object({
      minLength: z.number().min(8).max(64).optional(),
      requireSpecialChars: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireUppercase: z.boolean().optional()
    }).optional()
  }).optional()
});

// Assessment schemas
export const assessmentSchema = z.object({
  title: z.string()
    .min(1, 'Assessment title is required')
    .max(200, 'Title too long'),
  description: z.string()
    .max(1000, 'Description too long')
    .optional()
    .or(z.literal('')),
  type: z.enum(['self', '360', 'manager', 'peer'], {
    errorMap: () => ({ message: 'Invalid assessment type' })
  }),
  status: z.enum(['draft', 'published', 'archived'], {
    errorMap: () => ({ message: 'Invalid assessment status' })
  }).optional(),
  estimatedDuration: z.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(480, 'Duration cannot exceed 8 hours')
    .optional(),
  instructions: z.string()
    .max(2000, 'Instructions too long')
    .optional()
    .or(z.literal('')),
  organizationId: z.string()
    .uuid('Invalid organization ID')
});

export const questionSchema = z.object({
  text: z.string()
    .min(1, 'Question text is required')
    .max(500, 'Question text too long'),
  type: z.enum(['rating', 'multiple_choice', 'yes_no', 'text', 'scale'], {
    errorMap: () => ({ message: 'Invalid question type' })
  }),
  required: z.boolean().optional().default(true),
  options: z.array(z.string().max(200, 'Option text too long')).optional(),
  scaleMin: z.number().min(1).max(10).optional(),
  scaleMax: z.number().min(1).max(10).optional(),
  category: z.string()
    .max(100, 'Category name too long')
    .optional()
    .or(z.literal('')),
  weight: z.number()
    .min(0.1)
    .max(10)
    .optional()
    .default(1)
});

// Email and notification schemas
export const emailNotificationSchema = z.object({
  to: z.array(z.string().email('Invalid email address')).min(1, 'At least one recipient required'),
  cc: z.array(z.string().email('Invalid email address')).optional(),
  bcc: z.array(z.string().email('Invalid email address')).optional(),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(200, 'Subject too long'),
  content: z.string()
    .min(1, 'Email content is required')
    .max(10000, 'Email content too long'),
  templateName: z.string()
    .max(100, 'Template name too long')
    .optional(),
  variables: z.record(z.string(), z.any()).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  scheduledFor: z.date().optional()
});

// File upload schemas
export const fileUploadSchema = z.object({
  file: z.instanceof(File, { message: 'Valid file is required' }),
  allowedTypes: z.array(z.string()).optional(),
  maxSize: z.number().optional().default(10 * 1024 * 1024), // 10MB default
  category: z.string()
    .max(50, 'Category name too long')
    .optional()
});

// Bulk operations schemas
export const bulkUserImportSchema = z.object({
  users: z.array(z.object({
    email: emailSchema,
    firstName: z.string().min(1, 'First name required').max(50),
    lastName: z.string().min(1, 'Last name required').max(50),
    role: z.enum(['employee', 'reviewer', 'org_admin', 'subscriber']),
    department: z.string().max(100).optional(),
    jobTitle: z.string().max(100).optional(),
    phone: phoneSchema
  })).min(1, 'At least one user required').max(1000, 'Cannot import more than 1000 users at once'),
  organizationId: z.string().uuid('Invalid organization ID'),
  sendWelcomeEmails: z.boolean().optional().default(true)
});

// Search and filter schemas
export const searchSchema = z.object({
  query: z.string()
    .max(255, 'Search query too long')
    .optional()
    .or(z.literal('')),
  filters: z.record(z.string(), z.any()).optional(),
  sort: z.object({
    field: z.string().max(50),
    direction: z.enum(['asc', 'desc'])
  }).optional(),
  pagination: z.object({
    page: z.number().min(1).max(10000),
    limit: z.number().min(1).max(100)
  }).optional()
});

// Security schemas
export const securityEventSchema = z.object({
  type: z.enum(['login', 'logout', 'failed_login', 'password_change', 'permission_change', 'data_access']),
  userId: z.string().uuid().optional(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().max(500).optional(),
  details: z.record(z.string(), z.any()).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium')
});

// GDPR compliance schemas
export const dataExportRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  requestType: z.enum(['full_export', 'specific_data']),
  dataTypes: z.array(z.string()).optional(),
  format: z.enum(['json', 'csv', 'pdf']).default('json'),
  reason: z.string().max(500).optional()
});

export const dataDeletionRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  requestType: z.enum(['soft_delete', 'hard_delete']),
  reason: z.string().min(1, 'Reason for deletion is required').max(500),
  retentionPeriod: z.number().min(0).max(2555), // Max 7 years in days
  confirmDeletion: z.boolean().refine(val => val === true, {
    message: 'Must confirm deletion'
  })
});

// Validation helper functions
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000); // Limit length
}

// Export all schemas
export const validationSchemas = {
  userRegistration: userRegistrationSchema,
  userUpdate: userUpdateSchema,
  login: loginSchema,
  otp: otpSchema,
  organization: organizationSchema,
  assessment: assessmentSchema,
  question: questionSchema,
  email: emailNotificationSchema,
  fileUpload: fileUploadSchema,
  bulkUserImport: bulkUserImportSchema,
  search: searchSchema,
  securityEvent: securityEventSchema,
  dataExportRequest: dataExportRequestSchema,
  dataDeletionRequest: dataDeletionRequestSchema
};