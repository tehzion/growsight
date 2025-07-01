import React from 'react';
import { Organization } from '../../types';

interface OrganizationSelectorProps {
  organizations: Organization[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  organizations,
  selectedIds,
  onChange,
  disabled = false
}) => {
  const handleChange = (orgId: string) => {
    const newSelection = selectedIds.includes(orgId)
      ? selectedIds.filter(id => id !== orgId)
      : [...selectedIds, orgId];
    onChange(newSelection);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-900">
          Assigned Organizations
        </label>
        <span className="text-xs text-gray-500">
          {selectedIds.length} selected
        </span>
      </div>
      
      <div className="border border-gray-200 rounded-lg divide-y">
        {organizations.map(org => (
          <label
            key={org.id}
            className={`
              flex items-center p-3 hover:bg-gray-50 cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(org.id)}
              onChange={() => !disabled && handleChange(org.id)}
              disabled={disabled}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="ml-3 text-sm text-gray-900">{org.name}</span>
          </label>
        ))}
      </div>
      
      {selectedIds.length === 0 && (
        <p className="text-sm text-warning-600">
          Please select at least one organization to enable assessment publishing
        </p>
      )}
    </div>
  );
};

export default OrganizationSelector;