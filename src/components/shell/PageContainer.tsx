"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type PageContainerProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  className?: string;
};

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
};

export default function PageContainer({
  children,
  title,
  subtitle,
  backHref,
  backLabel = 'Volver',
  actions,
  maxWidth = '7xl',
  className = '',
}: PageContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-8 px-6">
      <div className={`${maxWidthClasses[maxWidth]} mx-auto space-y-6`}>
        {/* Header */}
        {(title || backHref || actions) && (
          <motion.header
            className="space-y-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {backHref && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                {backLabel}
              </Link>
            )}

            {(title || actions) && (
              <div className="flex items-start justify-between gap-4">
                {title && (
                  <div className="space-y-1">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
                      {title}
                    </h1>
                    {subtitle && <p className="text-neutral-400 text-base">{subtitle}</p>}
                  </div>
                )}
                {actions && <div className="flex items-center gap-3">{actions}</div>}
              </div>
            )}
          </motion.header>
        )}

        {/* Content */}
        <motion.div
          className={className}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
