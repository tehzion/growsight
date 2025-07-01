import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = Boolean(error);
    
    return (
      <div className="mb-4">
        {label && (
          <label 
            htmlFor={inputId} 
            className="block text-base font-semibold text-gray-800 mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full text-base px-4 py-3 rounded-lg
              bg-gray-50 border-2 transition-all duration-200
              ${hasError 
                ? 'border-error-300 focus:border-error-500 focus:ring-error-200 pr-10' 
                : 'border-gray-300 hover:border-primary-300 focus:border-primary-500 focus:ring-primary-200'
              }
              shadow-sm
              focus:ring-4 focus:outline-none
              placeholder:text-gray-400
              ${className}
            `}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? `${inputId}-error` : undefined}
            {...props}
          />
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-error-500" aria-hidden="true" />
            </div>
          )}
        </div>
        {hasError ? (
          <p className="mt-2 text-sm text-error-600" id={`${inputId}-error`}>
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-2 text-sm text-gray-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

FormInput.displayName = 'FormInput';

export default FormInput;