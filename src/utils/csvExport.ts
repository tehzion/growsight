/**
 * CSV Export Utility
 * Provides functions for converting data to CSV format with proper escaping
 */

export interface CSVExportOptions {
  includeNames?: boolean;
  anonymizeData?: boolean;
  includeTimestamp?: boolean;
}

/**
 * Escapes CSV values to handle commas, quotes, and newlines
 */
const escapeCSV = (value: any): string => {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
};

/**
 * Converts array of objects to CSV string
 */
const arrayToCSV = (data: Record<string, any>[], headers?: string[]): string => {
  if (data.length === 0) return '';
  
  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Build header row
  const headerRow = csvHeaders.map(escapeCSV).join(',');
  
  // Build data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => escapeCSV(row[header])).join(',');
  }).join('\n');
  
  return `${headerRow}\n${dataRows}`;
};

/**
 * Export analytics data to CSV
 */
export const exportAnalyticsToCSV = (
  analytics: any,
  organizationAnalytics: any[],
  options: CSVExportOptions = {}
): Blob => {
  const timestamp = new Date().toISOString();
  let csvContent = '';
  
  // Add timestamp header if requested
  if (options.includeTimestamp) {
    csvContent += `Generated: ${timestamp}\n\n`;
  }
  
  // Summary Section
  csvContent += 'SUMMARY\n';
  csvContent += 'Metric,Value\n';
  csvContent += `Total Organizations,${organizationAnalytics.length}\n`;
  csvContent += `Total Assessments,${analytics.totalAssessments || 0}\n`;
  csvContent += `Completed Assessments,${analytics.completedAssessments || 0}\n`;
  csvContent += `Completion Rate,${analytics.totalAssessments > 0 ? ((analytics.completedAssessments / analytics.totalAssessments) * 100).toFixed(1) : 0}%\n`;
  csvContent += `Average Rating,${analytics.averageRating?.toFixed(1) || 'N/A'}\n`;
  csvContent += `Total Employees,${analytics.totalEmployees || 0}\n`;
  csvContent += `Total Reviewers,${analytics.totalReviewers || 0}\n\n`;
  
  // Organization Breakdown
  if (organizationAnalytics.length > 0) {
    csvContent += 'ORGANIZATION PERFORMANCE\n';
    
    const orgData = organizationAnalytics.map(org => ({
      'Organization': org.organizationName,
      'Total Users': org.totalEmployees + org.totalReviewers,
      'Employees': org.totalEmployees,
      'Reviewers': org.totalReviewers,
      'Total Assessments': org.totalAssessments,
      'Completed': org.completedAssessments,
      'Completion Rate (%)': org.totalAssessments > 0 ? ((org.completedAssessments / org.totalAssessments) * 100).toFixed(1) : '0',
      'Average Rating': org.averageRating.toFixed(1),
      'Total Responses': org.totalResponses,
      'Status': org.totalAssessments > 0 && (org.completedAssessments / org.totalAssessments) >= 0.8 ? 'Excellent' : 
                org.totalAssessments > 0 && (org.completedAssessments / org.totalAssessments) >= 0.6 ? 'Good' : 'Needs Attention'
    }));
    
    csvContent += arrayToCSV(orgData) + '\n';
  }
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Export assessment results to CSV
 */
export const exportResultsToCSV = (
  results: any[],
  options: CSVExportOptions = {}
): Blob => {
  const timestamp = new Date().toISOString();
  let csvContent = '';
  
  if (options.includeTimestamp) {
    csvContent += `Generated: ${timestamp}\n`;
    csvContent += `Anonymized: ${options.anonymizeData ? 'Yes' : 'No'}\n\n`;
  }
  
  csvContent += 'ASSESSMENT RESULTS\n';
  
  const resultData = results.map(result => {
    const baseData: Record<string, any> = {
      'Assessment ID': result.assessmentId || result.assessment_id,
      'Assessment Title': result.assessmentTitle || result.assessment_title || 'N/A',
      'Status': result.status || 'N/A',
      'Completion Date': result.completedAt || result.completed_at ? new Date(result.completedAt || result.completed_at).toLocaleDateString() : 'N/A',
      'Average Score': result.averageScore?.toFixed(1) || result.average_score?.toFixed(1) || 'N/A',
    };
    
    // Add personal information only if not anonymized
    if (!options.anonymizeData && options.includeNames) {
      baseData['Employee ID'] = result.employeeId || result.employee_id || '';
      baseData['Employee Name'] = result.employeeName || result.employee_name || '';
      baseData['Email'] = result.email || '';
      baseData['Department'] = result.department || '';
    }
    
    // Add reviewer information
    if (result.reviewerType || result.reviewer_type) {
      baseData['Reviewer Type'] = result.reviewerType || result.reviewer_type;
    }
    
    if (!options.anonymizeData && (result.reviewerName || result.reviewer_name)) {
      baseData['Reviewer Name'] = result.reviewerName || result.reviewer_name;
    }
    
    return baseData;
  });
  
  csvContent += arrayToCSV(resultData) + '\n';
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Export assessments to CSV
 */
export const exportAssessmentsToCSV = (
  assessments: any[],
  options: CSVExportOptions = {}
): Blob => {
  const timestamp = new Date().toISOString();
  let csvContent = '';
  
  if (options.includeTimestamp) {
    csvContent += `Generated: ${timestamp}\n\n`;
  }
  
  csvContent += 'ASSESSMENTS\n';
  
  const assessmentData = assessments.map(assessment => ({
    'Assessment ID': assessment.id,
    'Title': assessment.title,
    'Description': assessment.description || '',
    'Type': assessment.assessmentType || assessment.assessment_type || 'custom',
    'Organization': assessment.organizationName || assessment.organization_name || '',
    'Created By': !options.anonymizeData && assessment.createdByName ? assessment.createdByName : 'System',
    'Created Date': new Date(assessment.createdAt || assessment.created_at).toLocaleDateString(),
    'Total Sections': assessment.sections?.length || 0,
    'Total Questions': assessment.sections?.reduce((sum: number, s: any) => sum + (s.questions?.length || 0), 0) || 0,
    'Status': assessment.isPublished ? 'Published' : 'Draft'
  }));
  
  csvContent += arrayToCSV(assessmentData) + '\n';
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Export assignments to CSV
 */
export const exportAssignmentsToCSV = (
  assignments: any[],
  options: CSVExportOptions = {}
): Blob => {
  const timestamp = new Date().toISOString();
  let csvContent = '';
  
  if (options.includeTimestamp) {
    csvContent += `Generated: ${timestamp}\n\n`;
  }
  
  csvContent += 'ASSESSMENT ASSIGNMENTS\n';
  
  const assignmentData = assignments.map(assignment => {
    const baseData: Record<string, any> = {
      'Assignment ID': assignment.id,
      'Assessment': assignment.assessmentTitle || assignment.assessment_title || 'N/A',
      'Status': assignment.status,
      'Due Date': assignment.dueDate || assignment.due_date ? new Date(assignment.dueDate || assignment.due_date).toLocaleDateString() : 'N/A',
      'Relationship Type': assignment.relationshipType || assignment.relationship_type || 'N/A',
      'Created Date': new Date(assignment.createdAt || assignment.created_at).toLocaleDateString(),
    };
    
    if (!options.anonymizeData && options.includeNames) {
      baseData['Employee'] = assignment.employeeName || assignment.employee_name || '';
      baseData['Reviewer'] = assignment.reviewerName || assignment.reviewer_name || '';
    }
    
    return baseData;
  });
  
  csvContent += arrayToCSV(assignmentData) + '\n';
  
  return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
};

/**
 * Download a Blob as a file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  setTimeout(() => window.URL.revokeObjectURL(url), 100);
};
