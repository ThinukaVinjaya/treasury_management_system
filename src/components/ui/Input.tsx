import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, helperText, icon, id, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full text-left space-y-1.5">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
              {icon}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            type={type}
            className={`
              w-full rounded-xl px-4 py-2.5 text-sm glass-input
              ${icon ? 'pl-10' : ''}
              ${error ? 'border-brand-rose/60 focus:border-brand-rose focus:ring-brand-rose/20' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {error && (
          <p className="text-xs font-medium text-brand-rose animate-pulse">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
