import React from 'react';
import { QuestionType } from '../../types';

interface QuestionTypeSelectorProps {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
}

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as QuestionType)}
      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
    >
      <option value="rating">Rating Scale</option>
      <option value="multiple_choice">Multiple Choice</option>
      <option value="yes_no">Yes/No</option>
      <option value="text">Text Response</option>
    </select>
  );
};

export default QuestionTypeSelector;