import React from 'react';

interface ScaleConfigProps {
  value: number;
  onChange: (value: number) => void;
}

const ScaleConfig: React.FC<ScaleConfigProps> = ({ value, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Rating Scale Maximum
      </label>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {[5, 7, 10].map((num) => (
          <option key={num} value={num}>
            1 to {num}
          </option>
        ))}
      </select>
      <div className="mt-2 text-xs text-gray-500">
        <p><strong>Recommended:</strong> 1-7 scale for comprehensive feedback</p>
        <div className="mt-1 space-y-1">
          <div>• 1-2: Needs Development</div>
          <div>• 3-4: Developing</div>
          <div>• 5: Proficient</div>
          <div>• 6-7: Advanced/Expert</div>
        </div>
      </div>
    </div>
  );
};

export default ScaleConfig;