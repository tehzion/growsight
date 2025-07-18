import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import ReportGenerator from '../../components/reports/ReportGenerator';
import Button from '../../components/ui/Button';
import { Download, RefreshCw } from 'lucide-react';
// Dynamic imports to avoid build conflicts
let html2canvas: any;
let jsPDF: any;

const loadPDFDependencies = async () => {
  if (!html2canvas || !jsPDF) {
    const [html2canvasModule, jsPDFModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ]);
    html2canvas = html2canvasModule.default;
    jsPDF = jsPDFModule.default;
  }
};

const AdminAssessmentReport: React.FC = () => {
  const { userId, assessmentId } = useParams<{ userId: string; assessmentId: string }>();
  const { user } = useAuthStore();
  const { selfAssessment, peerReviews, isLoading, error, fetchUserResults } = useAssessmentResultsStore();

  useEffect(() => {
    if (userId) {
      fetchUserResults(userId);
    }
  }, [userId, fetchUserResults]);

  const handleExportPDF = async () => {
    const reportElement = document.getElementById('assessment-report-admin');
    if (reportElement) {
      try {
        await loadPDFDependencies();
        const canvas = await html2canvas(reportElement, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; 
        const pageHeight = 297;  
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
        pdf.save(`assessment_report_${userId || 'user'}_${assessmentId || 'all'}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to export PDF. Please try again.');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading report: {error}</div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="text-gray-500">You do not have permission to view this report.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Report</h1>
          <p className="text-sm text-gray-500">Detailed report for user: {userId}</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleExportPDF} leftIcon={<Download className="h-4 w-4" />}>
            Export as PDF
          </Button>
          <Button onClick={() => fetchUserResults(userId!)} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Refresh Data
          </Button>
        </div>
      </div>

      <div id="assessment-report-admin">
        {selfAssessment || peerReviews.length > 0 ? (
          <ReportGenerator 
            selfAssessment={selfAssessment}
            peerReviews={peerReviews}
            user={user}
          />
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No assessment data found for this user.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAssessmentReport;