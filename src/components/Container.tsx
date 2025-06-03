import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

const Container: React.FC<ContainerProps> = ({ children, className = '', fullWidth = false }) => {
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${fullWidth ? 'w-full' : 'max-w-8xl'} ${className}`}>
      {children}
    </div>
  );
};

export default Container;