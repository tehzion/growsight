import React from 'react';

interface RatingSelectorProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  disabled?: boolean;
}

const RatingSelector: React.FC<RatingSelectorProps> = ({ 
  value, 
  onChange, 
  max = 7,
  disabled = false
}) => {
  const ratings = Array.from({ length: max }, (_, i) => i + 1);
  
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 font-medium text-sm
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
              ${value === rating 
                ? 'bg-primary-600 text-white border-2 border-primary-600 shadow-lg transform scale-110' 
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-primary-400 hover:shadow-md'
              }
            `}
            onClick={() => !disabled && onChange(rating)}
            disabled={disabled}
            aria-label={`Rate ${rating} out of ${max}`}
          >
            {rating}
          </button>
        ))}
      </div>
      
      {max === 7 && (
        <div className="text-xs text-gray-500 grid grid-cols-2 gap-2 mt-3">
          <div className="space-y-1">
            <div><strong>1-2:</strong> Needs Development</div>
            <div><strong>3-4:</strong> Developing</div>
          </div>
          <div className="space-y-1">
            <div><strong>5:</strong> Proficient</div>
            <div><strong>6-7:</strong> Advanced/Expert</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RatingSelector;