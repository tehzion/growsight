import React from 'react';

interface TextResponseProps {
  value: string;
  onChange: (value: string) => void;
  type: 'text' | 'yes_no';
}

const TextResponse: React.FC<TextResponseProps> = ({ value, onChange, type }) => {
  if (type === 'yes_no') {
    return (
      <div className="space-y-2">
        <label className="inline-flex items-center">
          <input
            type="radio"
            value="yes"
            checked={value === 'yes'}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
          />
          <span className="ml-2">Yes</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            value="no"
            checked={value === 'no'}
            onChange={(e) => onChange(e.target.value)}
            className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
          />
          <span className="ml-2">No</span>
        </label>
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      placeholder="Enter your response..."
    />
  );
};

export default TextResponse;