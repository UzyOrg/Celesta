import React from 'react';
import Link from 'next/link';

// Base props shared by both button and link variants
interface ButtonBaseProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'minimal' | 'soft' | 'gradient';
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
    primary: 'bg-[--color-crystal-blue] text-black border-2 border-[--color-crystal-blue] hover:bg-transparent hover:text-[--color-crystal-blue]',
    secondary: 'bg-transparent text-[--color-star-white] hover:text-[--color-crystal-blue]',
    outline: 'bg-transparent text-[--color-star-white] border-2 border-[--color-crystal-lavender] hover:bg-[--color-star-white] hover:text-black',
    minimal: 'bg-transparent text-[--color-star-white] border border-[rgba(var(--color-crystal-lavender-rgb), 0.25)] hover:text-[--color-crystal-blue]',
    soft: 'bg-[--color-crystal-lavender] text-black hover:brightness-95',
    gradient: 'bg-gradient-to-r from-[--color-crystal-blue] to-[--color-crystal-lavender] text-black border-0 hover:brightness-110'
  };
  
  const sizeClasses = {
    sm: 'text-sm py-2 px-3',
    md: ' py-2.5 px-5',
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