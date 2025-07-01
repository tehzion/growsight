import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { Plus, Trash2, MoveUp, MoveDown } from 'lucide-react';

interface QuestionOption {
  id?: string;
  text: string;
  order: number;
  value?: number;
}

interface QuestionOptionsManagerProps {
  options: QuestionOption[];
  onChange: (options: QuestionOption[]) => void;
  showValues?: boolean;
}

const QuestionOptionsManager: React.FC<QuestionOptionsManagerProps> = ({
  options,
  onChange,
  showValues = false,
}) => {
  const [localOptions, setLocalOptions] = useState<QuestionOption[]>(options);

  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

  const addOption = () => {
    const newOption: QuestionOption = {
      text: '',
      order: localOptions.length,
      value: showValues ? 0 : undefined,
    };
    const updatedOptions = [...localOptions, newOption];
    setLocalOptions(updatedOptions);
    onChange(updatedOptions);
  };

  const removeOption = (index: number) => {
    const updatedOptions = localOptions.filter((_, i) => i !== index);
    const reorderedOptions = updatedOptions.map((opt, i) => ({
      ...opt,
      order: i,
    }));
    setLocalOptions(reorderedOptions);
    onChange(reorderedOptions);
  };

  const updateOption = (index: number, field: keyof QuestionOption, value: string | number) => {
    const updatedOptions = localOptions.map((opt, i) => {
      if (i === index) {
        return { ...opt, [field]: value };
      }
      return opt;
    });
    setLocalOptions(updatedOptions);
    onChange(updatedOptions);
  };

  const moveOption = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === localOptions.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const updatedOptions = [...localOptions];
    [updatedOptions[index], updatedOptions[newIndex]] = [
      updatedOptions[newIndex],
      updatedOptions[index],
    ];

    const reorderedOptions = updatedOptions.map((opt, i) => ({
      ...opt,
      order: i,
    }));
    setLocalOptions(reorderedOptions);
    onChange(reorderedOptions);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Options</h3>
        <Button
          onClick={addOption}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Option
        </Button>
      </div>
      <div className="space-y-3">
        {localOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-grow">
              <input
                type="text"
                value={option.text}
                onChange={(e) => updateOption(index, 'text', e.target.value)}
                placeholder={`Option ${index + 1}`}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {showValues && (
              <div className="w-24">
                <input
                  type="number"
                  value={option.value}
                  onChange={(e) => updateOption(index, 'value', parseInt(e.target.value, 10))}
                  placeholder="Value"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveOption(index, 'up')}
                disabled={index === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Move up"
              >
                <MoveUp className="w-4 h-4" />
              </button>
              <button
                onClick={() => moveOption(index, 'down')}
                disabled={index === localOptions.length - 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                title="Move down"
              >
                <MoveDown className="w-4 h-4" />
              </button>
              <button
                onClick={() => removeOption(index)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                title="Remove option"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionOptionsManager;