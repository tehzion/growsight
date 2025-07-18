import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    ...props
  }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-lg
      transition-all duration-200 shadow-sm
      focus:outline-none focus:ring-4 focus:ring-offset-0
      disabled:opacity-60 disabled:cursor-not-allowed
      hover:scale-[1.02] active:scale-[0.98]
    `;
    
    const variants = {
      primary: `
        bg-primary-600 hover:bg-primary-700 text-white 
        focus:ring-primary-200 shadow-primary-100/30
      `,
      secondary: `
        bg-secondary-600 hover:bg-secondary-700 text-white 
        focus:ring-secondary-200 shadow-secondary-100/30
      `,
      outline: `
        bg-white border-2 border-gray-300 text-gray-700 
        hover:bg-gray-50 hover:border-primary-300
        focus:ring-primary-100 focus:border-primary-500
      `,
      danger: `
        bg-error-600 hover:bg-error-700 text-white 
        focus:ring-error-200 shadow-error-100/30
      `,
      success: `
        bg-success-600 hover:bg-success-700 text-white 
        focus:ring-success-200 shadow-success-100/30
      `,
      ghost: `
        bg-transparent hover:bg-gray-100 text-gray-700 
        focus:ring-gray-200 hover:shadow-none
      `,
    };
    
    const sizes = {
      sm: 'px-4 py-2 text-sm min-h-[44px]', // Touch-friendly minimum height
      md: 'px-6 py-3 text-base min-h-[44px]', // Touch-friendly minimum height
      lg: 'px-8 py-4 text-lg min-h-[48px]', // Larger touch target
    };
    
    const width = fullWidth ? 'w-full' : '';
    const isDisabled = disabled || isLoading;
    
    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variants[variant]}
          ${sizes[size]}
          ${width}
          ${className}
        `}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
            <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {!isLoading && leftIcon && (
          <span className="mr-2">{leftIcon}</span>
        )}
        
        {children}
        
        {!isLoading && rightIcon && (
          <span className="ml-2">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;