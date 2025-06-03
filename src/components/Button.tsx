import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  children, 
  onClick 
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-inter-tight font-bold transition-all';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-turquoise to-lime text-base hover:shadow-lg hover:scale-[1.03]',
    secondary: 'bg-base text-white hover:bg-opacity-90 hover:shadow-md',
    outline: 'border-2 border-neutral-200 hover:bg-neutral-100'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: 'text-base py-2.5 px-5',
    lg: 'text-lg py-3 px-6'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;