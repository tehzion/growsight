import React, { useState, useEffect } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { Competency } from '../../types';
import { useCompetencyStore } from '../../stores/competencyStore';

interface CompetencySelectorProps {
  selectedCompetencyIds: string[];
  onChange: (competencyIds: string[]) => void;
  organizationId: string;
  disabled?: boolean;
}

const CompetencySelector: React.FC<CompetencySelectorProps> = ({
  selectedCompetencyIds,
  onChange,
  organizationId,
  disabled = false
}) => {
  const { competencies, fetchCompetencies, isLoading } = useCompetencyStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (organizationId) {
      fetchCompetencies(organizationId);
    }
  }, [organizationId, fetchCompetencies]);
  
  const filteredCompetencies = searchTerm
    ? competencies.filter(comp => 
        comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (comp.description && comp.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : competencies;
  
  const handleToggleCompetency = (competencyId: string) => {
    if (disabled) return;
    
    const newSelection = selectedCompetencyIds.includes(competencyId)
      ? selectedCompetencyIds.filter(id => id !== competencyId)
      : [...selectedCompetencyIds, competencyId];
    
    onChange(newSelection);
  };
  
  const getSelectedCompetencies = () => {
    return competencies.filter(comp => selectedCompetencyIds.includes(comp.id));
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Competencies
        </label>
        <span className="text-xs text-gray-500">
          {selectedCompetencyIds.length} selected
        </span>
      </div>
      
      {/* Selected competencies */}
      <div className="flex flex-wrap gap-2 mb-2">
        {getSelectedCompetencies().map(comp => (
          <div 
            key={comp.id} 
            className="flex items-center bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm"
          >
            <Tag className="h-3 w-3 mr-1" />
            <span>{comp.name}</span>
            {!disabled && (
              <button 
                type="button"
                onClick={() => handleToggleCompetency(comp.id)}
                className="ml-2 text-primary-600 hover:text-primary-800"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {selectedCompetencyIds.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No competencies selected
          </div>
        )}
      </div>
      
      {/* Search and select */}
      {!disabled && (
        <>
          <div className="relative">
            <input
              type="text"
              placeholder="Search competencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              disabled={disabled || isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-2.5">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {filteredCompetencies.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                {searchTerm ? 'No matching competencies found' : 'No competencies available'}
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredCompetencies.map(comp => (
                  <div
                    key={comp.id}
                    onClick={() => handleToggleCompetency(comp.id)}
                    className={`
                      p-3 cursor-pointer hover:bg-gray-50 transition-colors
                      ${selectedCompetencyIds.includes(comp.id) ? 'bg-primary-50' : ''}
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{comp.name}</div>
                        {comp.description && (
                          <div className="text-xs text-gray-500">{comp.description}</div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {selectedCompetencyIds.includes(comp.id) ? (
                          <div className="h-5 w-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CompetencySelector;