"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { logout } from '@/lib/session';
import {
  Home,
  BookOpen,
  Settings,
  Rocket,
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Users,
  Menu,
  X,
  LogOut
} from 'lucide-react';

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
      { id: 'groups', label: 'Mis Grupos', icon: Users, href: '/grupos' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [savedToken, setSavedToken] = useState<string | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  const [displayAlias, setDisplayAlias] = useState(userAlias || 'Invitado');
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // Detección automática de rol basada en pathname si no se provee explícitamente
  const detectedRole: 'student' | 'teacher' = 
    userRole || (pathname?.startsWith('/teacher') ? 'teacher' : 'student');
  
  // Detectar si estamos en mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Leer el último token del docente del localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && detectedRole === 'teacher') {
      const token = localStorage.getItem('celesta:last_teacher_token');
      setSavedToken(token || undefined);
    }
  }, [detectedRole]);
  
  // Cerrar menú móvil cuando cambie la ruta
  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  // Reaccionar a cambios en el alias del localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateAliasFromStorage = () => {
      try {
        // Buscar alias en este orden de prioridad:
        // 1. Alias del último token de docente (si existe)
        // 2. Alias del token DEMO-101 (más común)
        // 3. Alias global (__global__)
        // 4. Cualquier otro alias disponible
        
        let foundAlias: string | null = null;
        
        // Si es docente, usar el último token de docente
        if (detectedRole === 'teacher' && savedToken) {
          foundAlias = localStorage.getItem(`celesta:alias:${savedToken}`);
        }
        
        // Intentar DEMO-101 (token más común para estudiantes)
        if (!foundAlias) {
          foundAlias = localStorage.getItem('celesta:alias:DEMO-101');
        }
        
        // Intentar alias global
        if (!foundAlias) {
          foundAlias = localStorage.getItem('celesta:alias:__global__');
        }
        
        // Buscar cualquier alias disponible
        if (!foundAlias) {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('celesta:alias:'));
          for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value && value.trim().length > 0) {
              foundAlias = value;
              break;
            }
          }
        }
        
        if (foundAlias && foundAlias.trim().length > 0) {
          setDisplayAlias(foundAlias);
        } else {
          setDisplayAlias(userAlias || 'Invitado');
        }
      } catch (e) {
        console.error('[AppShell] Error updating alias:', e);
        setDisplayAlias(userAlias || 'Invitado');
      }
    };

    // Actualizar al montar
    updateAliasFromStorage();

    // Escuchar cambios en storage
    window.addEventListener('storage', updateAliasFromStorage);
    
    // Polling ligero como fallback (para cambios en la misma pestaña)
    const interval = setInterval(updateAliasFromStorage, 500);

    return () => {
      window.removeEventListener('storage', updateAliasFromStorage);
      clearInterval(interval);
    };
  }, [userAlias, detectedRole, savedToken]);

  // Cerrar menú de perfil al hacer clic fuera
  useEffect(() => {
    if (!profileMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  // Función de logout usando la función centralizada
  // SECURITY: logout() ahora es async y hace logout del servidor primero
  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await logout();
  };
  
  // Obtener navegación según rol
  // Priorizar: prop classToken > token guardado > fallback a /teacher
  const effectiveToken = classToken || savedToken;
  const navigationItems = getNavigationItems(detectedRole, effectiveToken);

  return (
    <div className="flex h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 overflow-hidden">
      {/* Mobile Header - Solo visible en pantallas pequeñas */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-xl border-b border-neutral-800/50">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-neutral-800/50 transition-colors"
            aria-label="Menú"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-neutral-300" />
            ) : (
              <Menu className="w-6 h-6 text-neutral-300" />
            )}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-crystal-blue to-crystal-lavender flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-bold text-white">Celestea</span>
          </div>
          
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crystal-lavender to-crystal-blue flex items-center justify-center">
            <User className="w-5 h-5 text-black" />
          </div>
        </div>
      </div>

      {/* Backdrop oscuro para móvil */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <motion.aside
        className="flex flex-col bg-neutral-900/80 backdrop-blur-xl border-r border-neutral-800/50 shadow-2xl
                   md:relative
                   fixed left-0 top-0 bottom-0 z-50"
        initial={false}
        animate={isMobile ? {
          // Mobile: width fijo, solo translateX
          width: 280,
          x: mobileMenuOpen ? 0 : -280
        } : {
          // Desktop: width animado, sin translateX
          width: collapsed ? 80 : 280,
          x: 0
        }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Logo / Brand */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800/50">
          {!collapsed ? (
            <div className="flex items-center gap-2 transition-opacity duration-200">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crystal-blue to-crystal-lavender flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-black" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
                  Celestea
                </h1>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">OS v1.0</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-crystal-blue to-crystal-lavender flex items-center justify-center mx-auto">
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
                      ? 'bg-gradient-to-r from-crystal-blue/20 to-crystal-lavender/10 text-white shadow-lg shadow-crystal-blue/10'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }
                `}
                onClick={(e) => isDisabled && e.preventDefault()}
              >
                {/* Indicador de activo - Sin animación para mejor performance */}
                {isActive && (
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-crystal-blue/20 to-crystal-lavender/10 border border-crystal-blue/30" />
                )}
                
                <Icon className={`w-5 h-5 flex-shrink-0 relative z-10 ${isActive ? 'text-crystal-blue' : ''}`} />
                
                {!collapsed && (
                  <span className="relative z-10 font-medium text-sm transition-opacity duration-200">
                    {item.label}
                  </span>
                )}

                {item.badge && !collapsed && (
                  <span className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-crystal-lavender/20 text-crystal-lavender rounded-full relative z-10">
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
        <div className="p-4 border-t border-neutral-800/50 relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-crystal-lavender to-crystal-blue flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-black" />
            </div>
            {!collapsed && userAlias && (
              <div className="flex-1 min-w-0 text-left transition-opacity duration-200">
                <p className="text-sm font-medium text-white truncate">{displayAlias}</p>
                <p className="text-xs text-neutral-400 capitalize">{detectedRole === 'teacher' ? 'Docente' : 'Estudiante'}</p>
              </div>
            )}
          </button>

          {/* Profile Popover Menu */}
          <AnimatePresence>
            {profileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute bottom-full left-4 right-4 mb-2 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-neutral-700">
                  <p className="text-sm font-medium text-white truncate">{displayAlias}</p>
                  <p className="text-xs text-neutral-400 capitalize">{detectedRole === 'teacher' ? 'Docente' : 'Estudiante'}</p>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400 font-medium">Cerrar Sesión</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse Toggle - Solo visible en desktop */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-4 top-20 w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 items-center justify-center hover:bg-neutral-700 transition-colors shadow-lg z-50"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-neutral-300" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-neutral-300" />
          )}
        </button>
      </motion.aside>

      {/* Main Content Area */}
      <main className={`flex-1 overflow-y-auto ${className} pt-14 md:pt-0`}>
        {children}
      </main>
    </div>
  );
}
