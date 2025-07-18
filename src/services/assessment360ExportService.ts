import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { Assessment360Overview, Assessment360Summary, Assessment360AnonymousResult } from '../stores/assessment360Store';

export interface ExportOptions {
  format: 'csv' | 'pdf' | 'excel';
  includeNames: boolean;
  includeDetails: boolean;
  includeCharts: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: {
    assessmentId?: string;
    participantId?: string;
    organizationId?: string;
    departmentId?: string;
    relationshipType?: string;
  };
}

export interface ExportResult {
  success: boolean;
  data?: string | Blob;
  filename?: string;
  error?: string;
}

class Assessment360ExportService {
  private user = useAuthStore.getState().user;

  // Get data based on user role
  private async getDataByRole(options: ExportOptions): Promise<any[]> {
    const { user } = useAuthStore.getState();
    if (!user) throw new Error('User not authenticated');

    let query;
    
    if (user.role === 'super_admin') {
      query = supabase.from('assessment_360_super_admin_view').select('*');
    } else if (user.role === 'org_admin') {
      query = supabase.from('assessment_360_org_admin_view').select('*');
    } else {
      query = supabase.from('assessment_360_user_view').select('*');
    }

    // Apply filters
    if (options.filters?.assessmentId) {
      query = query.eq('assessment_id', options.filters.assessmentId);
    }
    if (options.filters?.participantId) {
      query = query.eq('participant_id', options.filters.participantId);
    }
    if (options.filters?.organizationId) {
      query = query.eq('organization_id', options.filters.organizationId);
    }
    if (options.filters?.departmentId) {
      query = query.eq('department_id', options.filters.departmentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // Get detailed results for a specific participant
  private async getDetailedResults(assessmentId: string, participantId: string): Promise<Assessment360Summary[]> {
    const { data, error } = await supabase
      .rpc('get_360_assessment_results', {
        p_assessment_id: assessmentId,
        p_participant_id: participantId
      });

    if (error) throw error;
    return data || [];
  }

  // Get anonymous results
  private async getAnonymousResults(options: ExportOptions): Promise<Assessment360AnonymousResult[]> {
    let query = supabase.from('assessment_360_anonymous_results').select('*');

    if (options.filters?.assessmentId) {
      query = query.eq('assessment_id', options.filters.assessmentId);
    }
    if (options.filters?.participantId) {
      query = query.eq('participant_id', options.filters.participantId);
    }
    if (options.filters?.relationshipType) {
      query = query.eq('relationship_type', options.filters.relationshipType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  // Export as CSV
  async exportCSV(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.getDataByRole(options);
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'No data available for export'
        };
      }

      // Build CSV header
      let csvContent = 'Assessment ID,Assessment Title,Assessment Category,Participant ID';
      
      if (options.includeNames) {
        csvContent += ',First Name,Last Name,Email,Role';
      }
      
      csvContent += ',Organization,Department,Total Assignments,Completed Assignments,Completion Rate,Self Assessments,Peer Assessments,Subordinate Assessments,Supervisor Assessments\n';

      // Build CSV data
      const csvData = data.map(row => {
        let line = `${row.assessment_id},${row.assessment_title},${row.assessment_category || ''},${row.participant_id}`;
        
        if (options.includeNames) {
          line += `,${row.participant_first_name},${row.participant_last_name},${row.participant_email},${row.participant_role}`;
        }
        
        line += `,${row.organization_name},${row.department_name || ''},${row.total_assignments},${row.completed_assignments},${row.completion_rate},${row.self_assessments},${row.peer_assessments},${row.subordinate_assessments},${row.supervisor_assessments}`;
        
        return line;
      }).join('\n');

      csvContent += csvData;

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `360_assessment_results_${new Date().toISOString().split('T')[0]}.csv`;

      return {
        success: true,
        data: blob,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Export as PDF
  async exportPDF(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.getDataByRole(options);
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'No data available for export'
        };
      }

      // Import PDF libraries dynamically to avoid conflicts
      const [jsPDFModule, html2canvasModule] = await Promise.all([
        import('jspdf'),
        import('html2canvas')
      ]);
      const jsPDF = jsPDFModule.default;
      const html2canvas = html2canvasModule.default;

      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);
      const contentHeight = pageHeight - (2 * margin);

      // Add title
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('360° Assessment Results Report', pageWidth / 2, margin + 10, { align: 'center' });

      // Add subtitle
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, margin + 20, { align: 'center' });

      // Add summary table
      let yPosition = margin + 35;
      
      // Table headers
      const headers = ['Assessment', 'Participant', 'Organization', 'Department', 'Completion', 'Status'];
      const columnWidths = [40, 35, 35, 25, 20, 25];
      let xPosition = margin;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      
      headers.forEach((header, index) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += columnWidths[index];
      });

      yPosition += 8;

      // Table data
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);

      data.forEach((row, index) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = margin + 10;
        }

        xPosition = margin;
        
        const values = [
          row.assessment_title.substring(0, 20),
          options.includeNames ? `${row.participant_first_name} ${row.participant_last_name}`.substring(0, 15) : 'Anonymous',
          row.organization_name.substring(0, 15),
          (row.department_name || 'N/A').substring(0, 10),
          `${row.completion_rate}%`,
          row.completion_rate >= 90 ? 'Complete' : row.completion_rate >= 70 ? 'In Progress' : 'Pending'
        ];

        values.forEach((value, colIndex) => {
          pdf.text(value, xPosition, yPosition);
          xPosition += columnWidths[colIndex];
        });

        yPosition += 6;
      });

      // Add detailed results if requested
      if (options.includeDetails && options.filters?.participantId) {
        const detailedResults = await this.getDetailedResults(
          options.filters.assessmentId!,
          options.filters.participantId
        );

        if (detailedResults.length > 0) {
          pdf.addPage();
          yPosition = margin + 10;

          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Detailed Results by Dimension', pageWidth / 2, yPosition, { align: 'center' });

          yPosition += 15;

          // Detailed results table
          const detailHeaders = ['Dimension', 'Self', 'Others', 'Dept Avg', 'Org Avg', 'Gap'];
          const detailColumnWidths = [40, 20, 20, 20, 20, 20];

          xPosition = margin;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');

          detailHeaders.forEach((header, index) => {
            pdf.text(header, xPosition, yPosition);
            xPosition += detailColumnWidths[index];
          });

          yPosition += 8;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);

          detailedResults.forEach((result) => {
            if (yPosition > pageHeight - 20) {
              pdf.addPage();
              yPosition = margin + 10;
            }

            xPosition = margin;
            
            const detailValues = [
              result.dimension?.name || 'Unknown',
              result.selfRating?.toFixed(1) || 'N/A',
              result.overallOthersRating?.toFixed(1) || 'N/A',
              result.departmentAverage?.toFixed(1) || 'N/A',
              result.organizationAverage?.toFixed(1) || 'N/A',
              result.gapAnalysis?.toFixed(1) || 'N/A'
            ];

            detailValues.forEach((value, colIndex) => {
              pdf.text(value, xPosition, yPosition);
              xPosition += detailColumnWidths[colIndex];
            });

            yPosition += 6;
          });
        }
      }

      const filename = `360_assessment_report_${new Date().toISOString().split('T')[0]}.pdf`;
      const pdfBlob = pdf.output('blob');

      return {
        success: true,
        data: pdfBlob,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Export as Excel
  async exportExcel(options: ExportOptions): Promise<ExportResult> {
    try {
      const data = await this.getDataByRole(options);
      
      if (data.length === 0) {
        return {
          success: false,
          error: 'No data available for export'
        };
      }

      // Import Excel library dynamically to avoid conflicts
      const XLSXModule = await import('xlsx');
      const XLSX = XLSXModule;

      // Prepare worksheet data
      const worksheetData = data.map(row => ({
        'Assessment ID': row.assessment_id,
        'Assessment Title': row.assessment_title,
        'Assessment Category': row.assessment_category || '',
        'Participant ID': row.participant_id,
        ...(options.includeNames && {
          'First Name': row.participant_first_name,
          'Last Name': row.participant_last_name,
          'Email': row.participant_email,
          'Role': row.participant_role
        }),
        'Organization': row.organization_name,
        'Department': row.department_name || '',
        'Total Assignments': row.total_assignments,
        'Completed Assignments': row.completed_assignments,
        'Completion Rate (%)': row.completion_rate,
        'Self Assessments': row.self_assessments,
        'Peer Assessments': row.peer_assessments,
        'Subordinate Assessments': row.subordinate_assessments,
        'Supervisor Assessments': row.supervisor_assessments,
        'Status': row.completion_rate >= 90 ? 'Complete' : row.completion_rate >= 70 ? 'In Progress' : 'Pending'
      }));

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);

      // Add detailed results sheet if requested
      if (options.includeDetails && options.filters?.participantId) {
        const detailedResults = await this.getDetailedResults(
          options.filters.assessmentId!,
          options.filters.participantId
        );

        if (detailedResults.length > 0) {
          const detailedData = detailedResults.map(result => ({
            'Dimension': result.dimension?.name || 'Unknown',
            'Category': result.dimension?.category || '',
            'Self Rating': result.selfRating || 0,
            'Self Count': result.selfRatingCount,
            'Peer Rating': result.peerRating || 0,
            'Peer Count': result.peerRatingCount,
            'Subordinate Rating': result.subordinateRating || 0,
            'Subordinate Count': result.subordinateRatingCount,
            'Supervisor Rating': result.supervisorRating || 0,
            'Supervisor Count': result.supervisorRatingCount,
            'Overall Others Rating': result.overallOthersRating || 0,
            'Overall Others Count': result.overallOthersCount,
            'Department Average': result.departmentAverage || 0,
            'Organization Average': result.organizationAverage || 0,
            'Gap Analysis': result.gapAnalysis || 0
          }));

          const detailedWorksheet = XLSX.utils.json_to_sheet(detailedData);
          XLSX.utils.book_append_sheet(workbook, detailedWorksheet, 'Detailed Results');
        }
      }

      // Add anonymous results sheet if requested
      if (options.includeDetails) {
        const anonymousResults = await this.getAnonymousResults(options);
        
        if (anonymousResults.length > 0) {
          const anonymousData = anonymousResults.map(result => ({
            'Assessment': result.assessmentTitle,
            'Dimension': result.dimensionName,
            'Category': result.dimensionCategory,
            'Relationship Type': result.reviewerType,
            'Response Count': result.responseCount,
            'Average Rating': result.averageRating,
            'Min Rating': result.minRating,
            'Max Rating': result.maxRating,
            'Standard Deviation': result.ratingStddev
          }));

          const anonymousWorksheet = XLSX.utils.json_to_sheet(anonymousData);
          XLSX.utils.book_append_sheet(workbook, anonymousWorksheet, 'Anonymous Results');
        }
      }

      // Add main worksheet
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment Results');

      // Generate file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const filename = `360_assessment_results_${new Date().toISOString().split('T')[0]}.xlsx`;

      return {
        success: true,
        data: blob,
        filename
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Main export function
  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      switch (options.format) {
        case 'csv':
          return await this.exportCSV(options);
        case 'pdf':
          return await this.exportPDF(options);
        case 'excel':
          return await this.exportExcel(options);
        default:
          throw new Error('Unsupported export format');
      }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Download file helper
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const assessment360ExportService = new Assessment360ExportService(); 