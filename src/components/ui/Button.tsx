import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  isLoading = false,
  size = 'md',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-dark disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-brand-purple to-brand-blue hover:from-brand-purple/90 hover:to-brand-blue/90 text-white shadow-md shadow-brand-purple/15 hover:shadow-brand-purple/25 focus:ring-brand-purple',
    secondary: 'bg-white/10 hover:bg-white/15 text-white border border-white/10 focus:ring-white/30',
    outline: 'bg-transparent border border-white/20 hover:border-white/40 hover:bg-white/[0.02] text-gray-200 focus:ring-white/30',
    danger: 'bg-brand-rose/10 hover:bg-brand-rose/20 text-brand-rose border border-brand-rose/30 focus:ring-brand-rose',
    ghost: 'bg-transparent hover:bg-white/[0.04] text-gray-300 hover:text-white focus:ring-white/10',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
};
