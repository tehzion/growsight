import React, { useEffect, useState } from 'react';
import { useAssessmentResultsStore } from '../../stores/assessmentResultsStore';
import { useAuthStore } from '../../stores/authStore';
import { useOrganizationStore } from '../../stores/organizationStore';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ResultChart } from '../../components/results/ResultChart';
import { 
  User, 
  Eye, 
  TrendingUp, 
  Target, 
  BarChart3,
  Download,
  RefreshCw,
  Send
} from 'lucide-react';
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
import ReportGenerator from '../../components/reports/ReportGenerator';

interface UserResultsProps {}

export const UserResults: React.FC<UserResultsProps> = () => {
  const { 
    selfAssessment,
    peerReviews,
    fetchUserResults,
    exportAllResultsAsCSV
  } = useAssessmentResultsStore();
  
  const { user } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  
  const [viewMode, setViewMode] = useState<'overview' | 'self' | 'reviews'>('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchUserResults(user.id);
    }
  }, [user?.id, fetchUserResults]);

  const loadUserData = async () => {
    // Data is now fetched directly by fetchUserResults in the useEffect
    // This function can be removed or repurposed if needed
  };

  const handleExportResults = async () => {
    setIsLoading(true);
    const reportElement = document.getElementById('assessment-report');
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
        pdf.save(`assessment_report_${user?.firstName}_${user?.lastName}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const sendResultsToOrgAdmin = () => {
    // Implementation for sending results to org admin
    console.log('Sending results to organization admin...');
  };

  const getRelationshipTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'peer': 'Peer Review',
      'supervisor': 'Supervisor Review',
      'subordinate': 'Subordinate Review',
      'client': 'Client Review'
    };
    return labels[type] || type;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 6) return 'text-green-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 6) return 'Excellent';
    if (score >= 4) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Needs Improvement';
  };

  const calculateAverageScore = (): number => {
    if (!selfAssessment && peerReviews.length === 0) return 0;
    
    let totalScore = 0;
    let totalAssessments = 0;

    if (selfAssessment) {
      totalScore += selfAssessment.overallScore;
      totalAssessments++;
    }

    peerReviews.forEach(review => {
      totalScore += review.overallScore;
      totalAssessments++;
    });

    return totalAssessments > 0 ? totalScore / totalAssessments : 0;
  };

  const getCompletionRate = (): number => {
    const allAssessments = [];
    if (selfAssessment) allAssessments.push(selfAssessment);
    allAssessments.push(...peerReviews);

    if (allAssessments.length === 0) return 0;
    const completed = allAssessments.filter(a => a.status === 'completed').length;
    return (completed / allAssessments.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Assessment Results</h1>
          <p className="text-gray-600 mt-2">
            View your self-assessments and feedback from others
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handleExportResults} isLoading={isLoading}>
            <Download className="w-4 h-4 mr-2" />
            Export My Results (PDF)
          </Button>
          <Button onClick={() => fetchUserResults(user!.id)} isLoading={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* The Report Content to be Exported */}
      <div id="assessment-report" className="bg-white p-8 rounded-lg shadow-md">
        <ReportGenerator 
          selfAssessment={selfAssessment}
          peerReviews={peerReviews}
          user={user}
        />
      </div>
    </div>
  );
};

export default UserResults;