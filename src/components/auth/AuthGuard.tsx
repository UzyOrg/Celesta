"use client";
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

/**
 * AuthGuard: Protege rutas que requieren autenticación de docente
 * 
 * Uso:
 * ```tsx
 * <AuthGuard>
 *   <TeacherPage />
 * </AuthGuard>
 * ```
 * 
 * Si el usuario no está autenticado, redirige a /login
 */
export default function AuthGuard({ children, redirectTo = '/login' }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userState, loading } = useAuth();
  
  const user = userState.user;

  useEffect(() => {
    // Solo redirigir si auth ya cargó y no hay usuario
    if (!loading && !user) {
      const returnUrl = encodeURIComponent(pathname || '/grupos');
      router.replace(`${redirectTo}?redirect=${returnUrl}`);
    }
  }, [user, loading, router, pathname, redirectTo]);

  // Mostrar loader solo en primera carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
          <p className="text-neutral-400">Cargando...</p>
        </motion.div>
      </div>
    );
  }

  // Si ya cargó y no hay usuario, mostrar brevemente mientras redirige
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
          <p className="text-neutral-400">Redirigiendo...</p>
        </motion.div>
      </div>
    );
  }

  // Authenticated, render protected content
  return <>{children}</>;
}
