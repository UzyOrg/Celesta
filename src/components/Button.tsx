import React from 'react';
import Link from 'next/link';

// Base props shared by both button and link variants
interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
}

// Props for when the component is a button
type ButtonAsButton = ButtonBaseProps & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> & {
  href?: never; // Ensure href is not passed for a button
  type?: 'button' | 'submit' | 'reset';
};

// Props for when the component is a link
type ButtonAsLink = ButtonBaseProps & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string; // href is required for a link
  type?: never; // type is not a valid prop for a link
};

// Union type for all possible props
type ButtonProps = ButtonAsButton | ButtonAsLink;

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  className = '',
  children, 
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-inter-tight font-bold transition-all';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-turquoise to-lime text-base hover:shadow-lg hover:scale-[1.03]',
    secondary: 'bg-transparent text-white hover:text-turquoise',
    outline: 'border-2 border-turquoise text-turquoise hover:bg-turquoise hover:text-white'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: 'text-base py-2.5 px-5',
    lg: 'text-lg py-3 px-6'
  };
  
  const disabled = 'disabled' in props ? props.disabled : false;
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  const combinedClassName = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabledClasses}`.trim();

  // Check if href exists to determine if it's a link or a button
  if ('href' in props && props.href) {
    const { href, ...rest } = props as Omit<ButtonAsLink, 'children' | 'variant' | 'size' | 'className'>;
    return (
      <Link href={href} className={combinedClassName} {...rest}>
        {children}
      </Link>
    );
  }

  // At this point, props are of type ButtonAsButton because of the href check above.
  const { onClick, type = 'button', ...rest } = props as Omit<ButtonAsButton, 'children' | 'variant' | 'size' | 'className'>;
  
  return (
    <button 
      type={type} 
      className={combinedClassName} 
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;