'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ShieldAlert, Clock, Ban } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface EstudianteGuardProps {
  children: React.ReactNode;
}

type RosterStatus = 'checking' | 'approved' | 'pending' | 'rejected' | 'not_found' | 'error';

/**
 * ESTUDIANTE GUARD - Con Verificación de Roster Gestionado
 * 
 * Verifica que el estudiante:
 * 1. Tenga alias + class_token (role='estudiante')
 * 2. Esté APROBADO en el roster por el docente
 * 
 * Estados posibles:
 * - approved: ✅ Acceso permitido
 * - pending: ⏳ Esperando aprobación
 * - rejected: ❌ Solicitud rechazada
 * - not_found: ❓ No hay solicitud
 */
// Cache global de verificación (persiste entre navegaciones)
const verificationCache = new Map<string, { status: RosterStatus; message: string; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minuto

export default function EstudianteGuard({ children }: EstudianteGuardProps) {
  const router = useRouter();
  const { userState, loading: authLoading, isEstudiante } = useAuth();
  const [rosterStatus, setRosterStatus] = useState<RosterStatus>(() => {
    // Verificar cache inicial para evitar loading innecesario
    const cacheKey = `${userState.classToken}:${userState.alias}`;
    const cached = verificationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.status;
    }
    return 'checking';
  });
  const [statusMessage, setStatusMessage] = useState('');

  // Extraer valores específicos para evitar dependencias de objetos completos
  const userRole = userState.role;
  const userAlias = userState.alias;
  const userClassToken = userState.classToken;

  // Verificar aprobación en roster
  useEffect(() => {
    async function checkRosterApproval() {
      if (authLoading) return;

      // Si no es estudiante, bloquear
      if (!isEstudiante) {
        
        if (userRole === 'docente') {
          router.replace('/grupos');
        } else {
          router.replace('/');
        }
        return;
      }

      // Verificar cache antes de hacer request
      const cacheKey = `${userClassToken}:${userAlias}`;
      const cached = verificationCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setRosterStatus(cached.status);
        setStatusMessage(cached.message);
        return;
      }

      // Verificar aprobación en roster
      try {
        const response = await fetch('/api/roster/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_token: userClassToken,
            student_alias: userAlias,
          }),
        });

        if (!response.ok) {
          setRosterStatus('error');
          setStatusMessage('Error verificando estado. Intenta de nuevo.');
          return;
        }

        const data = await response.json();

        setRosterStatus(data.status);
        setStatusMessage(data.message || '');

        // Guardar en cache
        verificationCache.set(cacheKey, {
          status: data.status,
          message: data.message || '',
          timestamp: Date.now(),
        });

        // Si fue aprobado, guardar session_id en localStorage
        if (data.status === 'approved' && data.student_session_id) {
          localStorage.setItem(`celesta:sid:${userState.classToken}`, data.student_session_id);
        }

      } catch (error) {
        console.error('[EstudianteGuard] Error verificando roster:', error);
        setRosterStatus('error');
        setStatusMessage('Error de conexión. Intenta recargar la página.');
      }
    }

    checkRosterApproval();
  }, [authLoading, isEstudiante, userRole, userAlias, userClassToken, router, userState.classToken]);

  // Loading: Verificando auth
  if (authLoading || rosterStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
          <p className="text-neutral-400">Verificando acceso...</p>
        </motion.div>
      </div>
    );
  }

  // Estado: Pendiente de aprobación
  if (rosterStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Clock className="w-16 h-16 text-amber-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Solicitud Enviada</h2>
          <p className="text-neutral-300 mb-6">{statusMessage}</p>
          <div className="bg-neutral-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-neutral-400">
              Tu solicitud con el alias <strong className="text-turquoise">{userState.alias}</strong> está 
              esperando la aprobación del docente.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-turquoise text-black font-semibold rounded-lg hover:bg-turquoise/90 transition"
          >
            Verificar de Nuevo
          </button>
        </motion.div>
      </div>
    );
  }

  // Estado: Rechazado
  if (rosterStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full bg-neutral-900/50 backdrop-blur-sm border border-red-900/50 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Ban className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Acceso Denegado</h2>
          <p className="text-neutral-300 mb-6">{statusMessage}</p>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-neutral-400">
              Tu solicitud con el alias <strong className="text-red-400">{userState.alias}</strong> fue 
              rechazada por el docente.
            </p>
          </div>
          <button
            onClick={() => {
              // Limpiar localStorage y redirigir
              localStorage.removeItem(`celesta:alias:${userState.classToken}`);
              router.replace('/');
            }}
            className="px-6 py-3 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 transition"
          >
            Volver al Inicio
          </button>
        </motion.div>
      </div>
    );
  }

  // Estado: No encontrado (legacy o error)
  if (rosterStatus === 'not_found') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
        <motion.div
          className="max-w-md w-full bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <ShieldAlert className="w-16 h-16 text-neutral-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-3">Sin Solicitud</h2>
          <p className="text-neutral-300 mb-4">
            No encontramos una solicitud para este alias en este grupo.
          </p>
          <div className="bg-neutral-800/50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-neutral-500 mb-2">Información de acceso:</p>
            <p className="text-sm text-neutral-300">
              <strong className="text-turquoise">Alias:</strong> {userState.alias}
            </p>
            <p className="text-sm text-neutral-300">
              <strong className="text-turquoise">Grupo:</strong> {userState.classToken}
            </p>
            <p className="text-xs text-neutral-500 mt-3">
              Si este alias fue aprobado para otro grupo, limpia tu sesión e ingresa nuevamente con el código correcto.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => router.replace(`/join?t=${userState.classToken}`)}
              className="px-6 py-3 bg-turquoise text-black font-semibold rounded-lg hover:bg-turquoise/90 transition"
            >
              Solicitar Acceso
            </button>
            <button
              onClick={() => {
                // Limpiar TODO el localStorage y redirigir
                Object.keys(localStorage)
                  .filter(k => k.startsWith('celesta:'))
                  .forEach(k => localStorage.removeItem(k));
                router.replace('/');
              }}
              className="px-6 py-2 text-sm text-neutral-400 hover:text-white transition"
            >
              Limpiar sesión y volver al inicio
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Estado: Aprobado ✅
  if (rosterStatus === 'approved') {
    return <>{children}</>;
  }

  // Fallback: Error
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
      <motion.div
        className="max-w-md w-full bg-neutral-900/50 backdrop-blur-sm border border-neutral-800 rounded-2xl p-8 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Error</h2>
        <p className="text-neutral-300 mb-6">{statusMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-neutral-700 text-white font-semibold rounded-lg hover:bg-neutral-600 transition"
        >
          Reintentar
        </button>
      </motion.div>
    </div>
  );
}
