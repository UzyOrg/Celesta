'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface DocenteGuardProps {
  children: React.ReactNode;
}

/**
 * DOCENTE GUARD - Arquitectura de Cero Confianza
 * 
 * Solo permite acceso a usuarios con role='docente'.
 * Cualquier otro rol es bloqueado y redirigido.
 * 
 * Uso: Envolver rutas que requieren autenticación de docente
 * Ejemplo: /grupos, /teacher/*
 */
export default function DocenteGuard({ children }: DocenteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { userState, loading, isDocente } = useAuth();
  
  const userRole = userState.role;
  const userEmail = userState.user?.email;

  useEffect(() => {
    if (loading) return; // Esperar a que termine de cargar

    if (!isDocente) {
      // BLOQUEO: No es docente
      const returnUrl = encodeURIComponent(pathname || '/grupos');
      console.log('[DocenteGuard] 🚫 ACCESO DENEGADO - Role:', userRole);
      console.log('[DocenteGuard] Redirigiendo a /login');
      router.replace(`/login?redirect=${returnUrl}`);
    } else {
      console.log('[DocenteGuard] ✅ ACCESO PERMITIDO - Docente:', userEmail);
    }
  }, [loading, isDocente, userRole, userEmail, router, pathname]);

  // Mostrar loader mientras carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
          <p className="text-neutral-400">Verificando credenciales...</p>
        </motion.div>
      </div>
    );
  }

  // Mostrar brevemente mientras redirige (si no es docente)
  if (!isDocente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <ShieldAlert className="w-12 h-12 text-red-400" />
          <h2 className="text-xl font-bold text-white">Acceso Denegado</h2>
          <p className="text-neutral-400">Esta sección requiere autenticación de docente.</p>
          <p className="text-sm text-neutral-500">Redirigiendo...</p>
        </motion.div>
      </div>
    );
  }

  // Acceso permitido - Renderizar contenido protegido
  return <>{children}</>;
}
