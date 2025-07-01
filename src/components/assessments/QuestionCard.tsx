import React from 'react';
import { AlertCircle, Star } from 'lucide-react';
import RatingSelector from './RatingSelector';
import TextResponse from './TextResponse';
import { AssessmentQuestion } from '../../types';

interface QuestionCardProps {
  question: AssessmentQuestion;
  response: {
    rating?: number;
    textResponse?: string;
    selectedOptionId?: string;
    comment?: string;
  };
  onResponseChange: (type: 'main' | 'comment', value: any) => void;
  index: number;
  isValid: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  response,
  onResponseChange,
  index,
  isValid
}) => {
  const hasResponse = Boolean(response?.rating || response?.textResponse || response?.selectedOptionId);
  
  return (
    <div className={`
      border-2 rounded-lg p-6 transition-all duration-200
      ${isValid ? 'border-gray-200 bg-white' : 'border-error-200 bg-error-50'}
      ${hasResponse ? 'shadow-sm' : ''}
    `}>
      <div className="flex items-start space-x-4 mb-6">
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
          ${hasResponse 
            ? 'bg-success-100 text-success-700 border-2 border-success-300' 
            : 'bg-gray-100 text-gray-600 border-2 border-gray-300'
          }
        `}>
          {hasResponse ? '✓' : index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-medium text-gray-900 leading-relaxed">
              {question.text}
            </h3>
            <div className="flex items-center space-x-2 ml-4">
              {question.isRequired && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700">
                  <Star className="h-3 w-3 mr-1" />
                  Required
                </span>
              )}
            </div>
          </div>
          
          {!isValid && (
            <div className="mt-3 flex items-center text-sm text-error-600">
              <AlertCircle className="h-4 w-4 mr-2" />
              This required question needs a response
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Main Response */}
        <div className="bg-gray-50 p-4 rounded-lg">
          {question.questionType === 'rating' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Rate from 1 to {question.scaleMax || 7}:
              </label>
              <RatingSelector
                value={response.rating || 0}
                onChange={(value) => onResponseChange('main', value)}
                max={question.scaleMax}
              />
            </div>
          )}
          
          {(question.questionType === 'text' || question.questionType === 'yes_no') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {question.questionType === 'yes_no' ? 'Select your answer:' : 'Your response:'}
              </label>
              <TextResponse
                value={response.textResponse || ''}
                onChange={(value) => onResponseChange('main', value)}
                type={question.questionType}
              />
            </div>
          )}
          
          {question.questionType === 'multiple_choice' && question.options && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select one option:
              </label>
              <div className="space-y-3">
                {question.options.map((option) => (
                  <label
                    key={option.id}
                    className={`
                      flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                      ${response.selectedOptionId === option.id 
                        ? 'border-primary-300 bg-primary-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={response.selectedOptionId === option.id}
                      onChange={() => onResponseChange('main', option.id)}
                      className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900 font-medium">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (optional):
          </label>
          <textarea
            value={response.comment || ''}
            onChange={(e) => onResponseChange('comment', e.target.value)}
            rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 resize-none"
            placeholder="Share any additional thoughts, examples, or context that might be helpful..."
          />
          <div className="mt-1 text-xs text-gray-500">
            Comments help provide context and specific examples for your rating
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;