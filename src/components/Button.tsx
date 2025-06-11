import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean; // Added disabled prop
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  children, 
  onClick, 
  disabled = false // Added disabled prop
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-inter-tight font-bold transition-all';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-turquoise to-lime text-base hover:shadow-lg hover:scale-[1.03]',
    secondary: 'bg-base text-white hover:bg-opacity-90 hover:shadow-md',
    outline: 'border-2 border-turquoise text-turquoise hover:bg-turquoise hover:text-white'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: 'text-base py-2.5 px-5',
    lg: 'text-lg py-3 px-6'
  };
  
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabledClasses}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;