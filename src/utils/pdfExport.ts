import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  organizationName?: string;
  includeCharts?: boolean;
  includeTables?: boolean;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
}

export interface AssessmentData {
  analytics?: any;
  comparisonData?: any[];
  selfAssessments?: any[];
  reviewsAboutMe?: any[];
  reviewsDoneByMe?: any[];
  departmentBreakdown?: any;
  allOrgResults?: any[];
}

export class PDFExporter {
  private doc: jsPDF;
  private options: PDFExportOptions;
  private currentY: number = 20;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;

  constructor(options: PDFExportOptions) {
    this.options = options;
    this.doc = new jsPDF({
      orientation: options.orientation || 'portrait',
      format: options.format || 'a4',
      unit: 'mm'
    });
    
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  private addHeader() {
    // Add title
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.options.title, this.margin, this.currentY);
    this.currentY += 10;

    // Add subtitle if provided
    if (this.options.subtitle) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.options.subtitle, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Add organization name if provided
    if (this.options.organizationName) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'italic');
      this.doc.text(`Organization: ${this.options.organizationName}`, this.margin, this.currentY);
      this.currentY += 8;
    }

    // Add date
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Generated on: ${new Date().toLocaleDateString()}`, this.margin, this.currentY);
    this.currentY += 15;
  }

  private addSection(title: string, content: string | string[]) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 40) {
      this.doc.addPage();
      this.currentY = 20;
    }

    // Add section title
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;

    // Add content
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    
    if (Array.isArray(content)) {
      content.forEach(line => {
        if (this.currentY > this.pageHeight - 20) {
          this.doc.addPage();
          this.currentY = 20;
        }
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    } else {
      // Split long text into lines
      const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin);
      lines.forEach(line => {
        if (this.currentY > this.pageHeight - 20) {
          this.doc.addPage();
          this.currentY = 20;
        }
        this.doc.text(line, this.margin, this.currentY);
        this.currentY += 5;
      });
    }
    
    this.currentY += 10;
  }

  private addTable(headers: string[], data: string[][]) {
    // Check if we need a new page
    if (this.currentY > this.pageHeight - 60) {
      this.doc.addPage();
      this.currentY = 20;
    }

    const tableWidth = this.pageWidth - 2 * this.margin;
    const colWidth = tableWidth / headers.length;

    // Add headers
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      this.doc.text(header, this.margin + index * colWidth, this.currentY);
    });
    this.currentY += 6;

    // Add data rows
    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    data.forEach(row => {
      if (this.currentY > this.pageHeight - 20) {
        this.doc.addPage();
        this.currentY = 20;
      }
      row.forEach((cell, index) => {
        const lines = this.doc.splitTextToSize(cell, colWidth - 2);
        this.doc.text(lines, this.margin + index * colWidth, this.currentY);
      });
      this.currentY += 6;
    });
    
    this.currentY += 10;
  }

  public async exportAssessmentResults(data: AssessmentData): Promise<Blob> {
    this.addHeader();

    // Analytics Overview
    if (data.analytics) {
      const analyticsContent = [
        `Total Assessments: ${data.analytics.totalAssessments}`,
        `Completed Assessments: ${data.analytics.completedAssessments}`,
        `Average Score: ${data.analytics.averageScore?.toFixed(1) || 'N/A'}`,
        `Completion Rate: ${data.analytics.completionRate?.toFixed(1) || 'N/A'}%`
      ];
      this.addSection('Analytics Overview', analyticsContent);

      // Relationship Type Breakdown
      if (data.analytics.relationshipTypeBreakdown) {
        const breakdownData = Object.entries(data.analytics.relationshipTypeBreakdown).map(([type, count]) => [
          type,
          count.toString(),
          `${((count / data.analytics.totalAssessments) * 100).toFixed(1)}%`
        ]);
        this.addTable(['Relationship Type', 'Count', 'Percentage'], breakdownData);
      }

      // Top Strengths and Areas for Improvement
      if (data.analytics.topStrengths?.length > 0) {
        const strengthsContent = data.analytics.topStrengths.map((strength, index) => 
          `Strength ${index + 1}: Question ID ${strength}`
        );
        this.addSection('Top Strengths', strengthsContent);
      }

      if (data.analytics.areasForImprovement?.length > 0) {
        const improvementContent = data.analytics.areasForImprovement.map((area, index) => 
          `Area ${index + 1}: Question ID ${area}`
        );
        this.addSection('Areas for Improvement', improvementContent);
      }
    }

    // Self Assessments
    if (data.selfAssessments?.length > 0) {
      const selfAssessmentData = data.selfAssessments.map(assessment => [
        assessment.assessment_title || 'N/A',
        new Date(assessment.completed_at).toLocaleDateString(),
        assessment.average_score?.toFixed(1) || 'N/A',
        assessment.status
      ]);
      this.addTable(['Assessment', 'Completed', 'Average Score', 'Status'], selfAssessmentData);
    }

    // Reviews About Me
    if (data.reviewsAboutMe?.length > 0) {
      const reviewsData = data.reviewsAboutMe.map(review => [
        review.assessment_title || 'N/A',
        review.reviewer_name || 'N/A',
        review.relationship_type || 'N/A',
        review.average_score?.toFixed(1) || 'N/A',
        review.status
      ]);
      this.addTable(['Assessment', 'Reviewer', 'Relationship', 'Score', 'Status'], reviewsData);
    }

    // Department Breakdown
    if (data.departmentBreakdown) {
      const deptData = Object.entries(data.departmentBreakdown).map(([deptName, data]: [string, any]) => [
        deptName,
        data.total_assessments?.toString() || '0',
        data.completed_assessments?.toString() || '0',
        data.average_score?.toFixed(1) || 'N/A'
      ]);
      this.addTable(['Department', 'Total', 'Completed', 'Avg Score'], deptData);
    }

    // All Organization Results
    if (data.allOrgResults?.length > 0) {
      const orgData = data.allOrgResults.map(org => [
        org.organization_name || 'N/A',
        org.total_assessments?.toString() || '0',
        org.completed_assessments?.toString() || '0',
        org.average_score?.toFixed(1) || 'N/A'
      ]);
      this.addTable(['Organization', 'Total', 'Completed', 'Avg Score'], orgData);
    }

    // Comparison Data
    if (data.comparisonData?.length > 0) {
      this.addSection('Question Comparison Analysis', ['Detailed comparison data available in the system.']);
    }

    return this.doc.output('blob');
  }

  public async exportElementAsPDF(elementId: string, filename: string): Promise<void> {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: this.options.orientation || 'portrait',
      format: this.options.format || 'a4',
      unit: 'mm'
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  }

  public static async exportChartAsPDF(chartElement: HTMLElement, filename: string): Promise<void> {
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      format: 'a4',
      unit: 'mm'
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  }
}

// Utility functions for common export scenarios
export const exportAssessmentResultsPDF = async (
  data: AssessmentData,
  options: PDFExportOptions
): Promise<Blob> => {
  const exporter = new PDFExporter(options);
  return await exporter.exportAssessmentResults(data);
};

export const exportAnalyticsPDF = async (
  analytics: any,
  options: PDFExportOptions
): Promise<Blob> => {
  const exporter = new PDFExporter(options);
  return await exporter.exportAssessmentResults({ analytics });
};

export const exportUserResultsPDF = async (
  userData: any,
  options: PDFExportOptions
): Promise<Blob> => {
  const exporter = new PDFExporter(options);
  return await exporter.exportAssessmentResults({
    selfAssessments: userData.selfAssessments,
    reviewsAboutMe: userData.reviewsAboutMe,
    reviewsDoneByMe: userData.reviewsDoneByMe
  });
}; 