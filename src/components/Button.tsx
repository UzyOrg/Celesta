import React from 'react';
import Link from 'next/link';
import styles from './Button.module.css';

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
  const disabled = 'disabled' in props ? props.disabled : false;

  const combinedClassName = [
    styles.button,
    styles[variant],
    styles[size],
    disabled ? styles.disabled : '',
    className // Allow passing custom classes
  ].filter(Boolean).join(' ');

  // Check if href exists to determine if it's a link or a button
  if ('href' in props && props.href) {
    const { href, ...rest } = props as Omit<ButtonAsLink, 'children' | 'variant' | 'size' | 'className'>;
    return (
      <Link href={href} className={combinedClassName} {...rest}>
        {children}
      </Link>
    );
  }

  // It's a button
  const { type = 'button', ...rest } = props as Omit<ButtonAsButton, 'children' | 'variant' | 'size' | 'className'>;
  return (
    <button type={type} className={combinedClassName} {...rest}>
      {children}
    </button>
  );
};

export default Button;