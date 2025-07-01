import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import QuestionTypeSelector from './QuestionTypeSelector';
import ScaleConfig from './ScaleConfig';
import QuestionOptionsManager from './QuestionOptionsManager';
import CompetencySelector from '../competencies/CompetencySelector';
import { QuestionType, QuestionOption } from '../../types';
import { useAuthStore } from '../../stores/authStore';

interface QuestionBuilderProps {
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  scaleMax?: number;
  options?: QuestionOption[];
  competencyIds?: string[];
  organizationId: string;
  onUpdate: (data: {
    text?: string;
    questionType?: QuestionType;
    isRequired?: boolean;
    scaleMax?: number;
    options?: QuestionOption[];
    competencyIds?: string[];
  }) => void;
}

const QuestionBuilder: React.FC<QuestionBuilderProps> = ({
  questionText,
  questionType,
  isRequired,
  scaleMax = 7,
  options = [],
  competencyIds = [],
  organizationId,
  onUpdate
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showCompetencies, setShowCompetencies] = useState(false);
  const { user } = useAuthStore();

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ text: e.target.value });
  };

  const handleTypeChange = (type: QuestionType) => {
    onUpdate({ 
      questionType: type,
      // Reset related fields when type changes
      scaleMax: type === 'rating' ? 7 : undefined,
      options: type === 'multiple_choice' ? [] : undefined
    });
  };

  const handleRequiredChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ isRequired: e.target.checked });
  };

  const handleScaleMaxChange = (value: number) => {
    onUpdate({ scaleMax: value });
  };

  const handleOptionsUpdate = (updatedOptions: QuestionOption[]) => {
    onUpdate({ options: updatedOptions });
  };
  
  const handleCompetencyChange = (selectedCompetencyIds: string[]) => {
    onUpdate({ competencyIds: selectedCompetencyIds });
  };

  // Check if user has permission to manage competencies
  const canManageCompetencies = user?.role === 'super_admin' || 
    (user?.role === 'org_admin' && user?.organizationId === organizationId);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <FormInput
            value={questionText}
            onChange={handleTextChange}
            placeholder="Enter your question"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Settings className={`h-4 w-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} />}
          onClick={() => setShowSettings(!showSettings)}
          className={showSettings ? 'bg-primary-50 text-primary-700' : ''}
        >
          {showSettings ? 'Hide Settings' : 'Show Settings'}
        </Button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
              <QuestionTypeSelector
                value={questionType}
                onChange={handleTypeChange}
              />
            </div>
            <div className="flex items-center justify-end">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={handleRequiredChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">Required</span>
              </label>
            </div>
          </div>

          {questionType === 'rating' && (
            <ScaleConfig
              value={scaleMax}
              onChange={handleScaleMaxChange}
            />
          )}

          {questionType === 'multiple_choice' && (
            <QuestionOptionsManager
              options={options}
              onChange={handleOptionsUpdate}
              showValues={true}
            />
          )}

          {questionType === 'yes_no' && (
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-600">
              This question will have fixed "Yes\" and "No\" options
            </div>
          )}

          {questionType === 'text' && (
            <div className="bg-gray-100 p-3 rounded text-sm text-gray-600">
              Respondents will provide a free-form text answer
            </div>
          )}
          
          {/* Competency Selector Toggle */}
          {canManageCompetencies && (
            <div className="pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCompetencies(!showCompetencies)}
              >
                {showCompetencies ? 'Hide Competencies' : 'Map to Competencies'}
              </Button>
              
              {showCompetencies && (
                <div className="mt-3">
                  <CompetencySelector
                    selectedCompetencyIds={competencyIds}
                    onChange={handleCompetencyChange}
                    organizationId={organizationId}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestionBuilder;