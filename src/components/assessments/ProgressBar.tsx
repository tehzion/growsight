import React from 'react';

interface ProgressBarProps {
  currentSection: number;
  totalSections: number;
  sectionProgress: number;
  overallProgress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentSection,
  totalSections,
  sectionProgress,
  overallProgress
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-medium">Section Progress:</span>
          <span className="ml-2 text-gray-600">{Math.round(sectionProgress)}%</span>
        </div>
        <div>
          <span className="font-medium">Overall Progress:</span>
          <span className="ml-2 text-gray-600">{Math.round(overallProgress)}%</span>
        </div>
        <div>
          <span className="font-medium">Section:</span>
          <span className="ml-2 text-gray-600">{currentSection} of {totalSections}</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${sectionProgress}%` }}
          />
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-secondary-600 rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;