import React, { useState, useEffect } from 'react';
import { Download, FileText, Loader2, AlertCircle, CheckCircle, Lock, Eye, EyeOff, Settings } from 'lucide-react';
import Button from './Button';
import { usePDFExportStore } from '../../stores/pdfExportStore';
import { useAuthStore } from '../../stores/authStore';

interface PDFExportButtonProps {
  exportType: 'analytics' | 'results' | 'assessments' | 'assignments';
  format?: 'pdf' | 'csv';
  organizationId?: string;
  userId?: string;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children?: React.ReactNode;
  anonymizeData?: boolean;
  showSettingsButton?: boolean;
  onSettingsClick?: () => void;
}

const PDFExportButton: React.FC<PDFExportButtonProps> = ({
  exportType,
  format = 'pdf',
  organizationId,
  userId,
  variant = 'outline',
  size = 'md',
  fullWidth = false,
  children,
  anonymizeData,
  showSettingsButton = false,
  onSettingsClick
}) => {
  const { isExporting, exportProgress, exportAnalytics, exportResults, exportAssessments, exportAssignments, error: exportError, clearError, pdfSettings } = usePDFExportStore();
  const { user } = useAuthStore();
  const [showProgress, setShowProgress] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [showSettingsInfo, setShowSettingsInfo] = useState(false);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (localError) {
      const timer = setTimeout(() => setLocalError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [localError]);

  const handleExport = async () => {
    setShowProgress(true);
    setLocalError(null);
    clearError();
    
    try {
      let downloadUrl = '';
      
      // Determine if we should anonymize data based on user role
      const shouldAnonymize = anonymizeData !== undefined ? anonymizeData : 
                             (user?.role === 'org_admin' && exportType === 'results');
      
      switch (exportType) {
        case 'analytics':
          downloadUrl = await exportAnalytics(format, organizationId);
          break;
        case 'results':
          downloadUrl = await exportResults(format, userId, shouldAnonymize);
          break;
        case 'assessments':
          downloadUrl = await exportAssessments(format, organizationId);
          break;
        case 'assignments':
          downloadUrl = await exportAssignments(format, organizationId);
          break;
      }
      
      // Handle the actual download URL
      if (downloadUrl) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${exportType}-export-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      // Show success message
      setSuccess(true);
      setTimeout(() => {
        setShowProgress(false);
      }, 500);
      
    } catch (error) {
      console.error('Export failed:', error);
      const errorMessage = (error as Error).message || 'Export failed. Please try again.';
      setLocalError(errorMessage);
      setShowProgress(false);
    }
  };

  const getIcon = () => {
    if (isExporting) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (success) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (localError || exportError) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return format === 'pdf' ? <FileText className="h-4 w-4" /> : <Download className="h-4 w-4" />;
  };

  const getLabel = () => {
    if (children) return children;
    if (success) return 'Export Complete';
    if (localError || exportError) return 'Export Failed';
    if (isExporting) return `Exporting... ${exportProgress}%`;
    return `Export ${format.toUpperCase()}`;
  };

  const buttonVariant = success ? 'success' : (localError || exportError) ? 'danger' : variant;

  return (
    <div className="relative">
      <div className="flex items-center">
        <Button
          variant={buttonVariant}
          size={size}
          fullWidth={fullWidth}
          leftIcon={getIcon()}
          onClick={handleExport}
          disabled={isExporting}
          isLoading={isExporting}
        >
          {getLabel()}
        </Button>
        
        {anonymizeData !== undefined && (
          <div 
            className="ml-1 text-gray-500 cursor-pointer"
            onMouseEnter={() => setShowPrivacyInfo(true)}
            onMouseLeave={() => setShowPrivacyInfo(false)}
          >
            {anonymizeData ? (
              <Lock className="h-4 w-4 text-primary-500" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </div>
        )}

        {showSettingsButton && (
          <div 
            className="ml-1 text-gray-500 cursor-pointer"
            onClick={onSettingsClick}
            onMouseEnter={() => setShowSettingsInfo(true)}
            onMouseLeave={() => setShowSettingsInfo(false)}
          >
            <Settings className="h-4 w-4" />
          </div>
        )}
      </div>
      
      {showProgress && isExporting && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Generating {format.toUpperCase()}...</span>
            <span>{exportProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${exportProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {(localError || exportError) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-error-50 border border-error-200 rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-center text-sm text-error-700">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{localError || exportError}</span>
          </div>
        </div>
      )}
      
      {showPrivacyInfo && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-primary-50 border border-primary-200 rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-center text-sm text-primary-700">
            {anonymizeData ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                <span>
                  This export will be anonymized to protect individual privacy while providing valuable insights.
                </span>
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                <span>
                  This export contains personal data. Please ensure compliance with privacy regulations.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {showSettingsInfo && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-primary-50 border border-primary-200 rounded-lg p-3 shadow-lg z-10">
          <div className="flex items-center text-sm text-primary-700">
            <Settings className="h-4 w-4 mr-2" />
            <span>
              Configure PDF branding settings including logo, colors, and layout options.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDFExportButton;