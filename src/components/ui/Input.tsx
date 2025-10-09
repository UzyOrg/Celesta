import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
            {icon}
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full 
            min-h-[48px] 
            bg-neutral-700 
            border border-neutral-500 
            rounded-xl 
            px-4 py-3 
            text-base
            text-white
            placeholder:text-neutral-400
            focus:outline-none 
            focus:ring-2 
            focus:ring-crystal-blue 
            focus:border-transparent 
            transition-all
            disabled:opacity-50 
            disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
