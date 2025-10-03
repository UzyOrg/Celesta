"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

type CardProps = {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
};

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  const Component = onClick ? motion.button : motion.div;
  
  return (
    <Component
      className={`
        bg-neutral-900/60 backdrop-blur-sm rounded-xl border border-neutral-800/50 shadow-lg
        ${hover ? 'hover:border-neutral-700 hover:shadow-xl transition-all cursor-pointer' : ''}
        ${onClick ? 'text-left w-full' : ''}
        ${className}
      `}
      onClick={onClick}
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.99 } : undefined}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </Component>
  );
}

type MetricCardProps = {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'turquoise' | 'lime' | 'amber' | 'red' | 'blue' | 'neutral';
  className?: string;
};

const colorClasses = {
  turquoise: {
    bg: 'from-turquoise/20 to-turquoise/5',
    border: 'border-turquoise/30',
    icon: 'text-turquoise',
    iconBg: 'bg-turquoise/10',
  },
  lime: {
    bg: 'from-lime/20 to-lime/5',
    border: 'border-lime/30',
    icon: 'text-lime',
    iconBg: 'bg-lime/10',
  },
  amber: {
    bg: 'from-amber-500/20 to-amber-500/5',
    border: 'border-amber-500/30',
    icon: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
  },
  red: {
    bg: 'from-red-500/20 to-red-500/5',
    border: 'border-red-500/30',
    icon: 'text-red-400',
    iconBg: 'bg-red-500/10',
  },
  blue: {
    bg: 'from-blue-500/20 to-blue-500/5',
    border: 'border-blue-500/30',
    icon: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
  },
  neutral: {
    bg: 'from-neutral-800/40 to-neutral-800/20',
    border: 'border-neutral-700/50',
    icon: 'text-neutral-300',
    iconBg: 'bg-neutral-800/50',
  },
};

export function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  trendValue,
  color = 'neutral',
  className = '',
}: MetricCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      className={`
        bg-gradient-to-br ${colors.bg} backdrop-blur-sm rounded-xl border ${colors.border} 
        p-6 shadow-lg hover:shadow-xl transition-all
        ${className}
      `}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-neutral-400">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
          {trend && trendValue && (
            <div className={`inline-flex items-center gap-1 text-xs font-medium ${
              trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-neutral-400'
            }`}>
              <span>{trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`p-3 rounded-xl ${colors.iconBg}`}>
            <Icon className={`w-6 h-6 ${colors.icon}`} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
