"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Rocket, 
  BookOpen, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  href: string;
  badge?: string;
  disabled?: boolean;
};

type AppShellProps = {
  children: React.ReactNode;
  userAlias?: string;
  userRole?: 'student' | 'teacher';
  className?: string;
  classToken?: string; // Para construir el link del dashboard del docente
};

// Navegación dinámica según rol
const getNavigationItems = (role: 'student' | 'teacher', classToken?: string): NavItem[] => {
  if (role === 'teacher') {
    return [
      { id: 'dashboard', label: 'Dashboard', icon: Home, href: classToken ? `/teacher/${classToken}` : '/teacher' },
      { id: 'groups', label: 'Grupos', icon: Users, href: '/grupos' },
      { id: 'library', label: 'Biblioteca', icon: BookOpen, href: '/biblioteca' },
      { id: 'settings', label: 'Configuración', icon: Settings, href: '/settings', disabled: true },
    ];
  }
  
  // Estudiante (default)
  return [
    { id: 'dashboard', label: 'Dashboard', icon: Home, href: '/dashboard' },
    { id: 'missions', label: 'Misiones', icon: Rocket, href: '/missions' },
    { id: 'library', label: 'Biblioteca', icon: BookOpen, href: '/biblioteca' },
    { id: 'settings', label: 'Configuración', icon: Settings, href: '/settings', disabled: true },
  ];
};

export default function AppShell({ children, userAlias, userRole, className = '', classToken }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [savedToken, setSavedToken] = useState<string | undefined>(undefined);
  const pathname = usePathname();
  
  // Detección automática de rol basada en pathname si no se provee explícitamente
  const detectedRole: 'student' | 'teacher' = 
    userRole || (pathname?.startsWith('/teacher') ? 'teacher' : 'student');
  
  // Leer el último token del docente del localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && detectedRole === 'teacher') {
      const token = localStorage.getItem('celesta:last_teacher_token');
      setSavedToken(token || undefined);
    }
  }, [detectedRole]);
  
  // Obtener navegación según rol
  // Priorizar: prop classToken > token guardado > fallback a /teacher
  const effectiveToken = classToken || savedToken;
  const navigationItems = getNavigationItems(detectedRole, effectiveToken);

  return (
    <div className="flex h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden">
      {/* Sidebar Navigation */}
      <motion.aside
        className="relative flex flex-col bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800/50 shadow-2xl"
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800/50">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="logo-full"
                className="flex items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-turquoise to-lime flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
                    Celesta
                  </h1>
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">OS v1.0</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {collapsed && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-turquoise to-lime flex items-center justify-center mx-auto">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname?.startsWith(item.href);
            const isDisabled = item.disabled;

            return (
              <Link
                key={item.id}
                href={isDisabled ? '#' : item.href}
                className={`
                  relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all group
                  ${isDisabled 
                    ? 'opacity-40 cursor-not-allowed' 
                    : isActive
                      ? 'bg-gradient-to-r from-turquoise/20 to-lime/10 text-white shadow-lg shadow-turquoise/10'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }
                `}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-turquoise/20 to-lime/10 border border-turquoise/30"
                    layoutId="activeNav"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-turquoise' : ''}`} />
                
                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.span
                      key="label"
                      className="relative z-10 font-medium text-sm"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {item.badge && !collapsed && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-lime/20 text-lime rounded-full relative z-10">
                    {item.badge}
                  </span>
                )}

                {!isDisabled && !isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-800/50">
          <div className={`flex items-center gap-3 px-3 py-3 rounded-xl bg-neutral-800/50 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-lime to-turquoise flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-black" />
            </div>
            <AnimatePresence mode="wait">
              {!collapsed && userAlias && (
                <motion.div
                  key="user-info"
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <p className="text-sm font-medium text-white truncate">{userAlias}</p>
                  <p className="text-xs text-neutral-400 capitalize">{detectedRole === 'teacher' ? 'Docente' : 'Estudiante'}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-4 top-20 w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center hover:bg-neutral-700 transition-colors shadow-lg z-50"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-neutral-300" />
          )}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${className}`}>
        {children}
      </main>
    </div>
  );
}
