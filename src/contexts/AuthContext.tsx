'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser, onAuthStateChange } from '@/lib/auth';
import type { User } from '@supabase/supabase-js';

/**
 * ARQUITECTURA DE CERO CONFIANZA - ROLES ESTRICTOS
 * 
 * Role: 'docente' | 'estudiante' | 'invitado'
 * 
 * - DOCENTE: Usuario autenticado en Supabase (tabla teachers)
 * - ESTUDIANTE: Tiene alias + class_token en localStorage (sesión anónima)
 * - INVITADO: No tiene ni autenticación ni alias
 */
type UserRole = 'docente' | 'estudiante' | 'invitado';

interface UserState {
  role: UserRole;
  user: User | null;           // Solo para docentes
  alias: string | null;         // Solo para estudiantes
  classToken: string | null;    // Solo para estudiantes
}

interface AuthContextType {
  userState: UserState;
  loading: boolean;
  
  // Helpers de conveniencia
  isDocente: boolean;
  isEstudiante: boolean;
  isInvitado: boolean;
  displayName: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider v2 - Kernel de Identidad con Cero Confianza
 * 
 * Determina el rol del usuario UNA VEZ al cargar la aplicación:
 * 1. Verifica autenticación de Supabase → DOCENTE
 * 2. Verifica alias + class_token en localStorage → ESTUDIANTE
 * 3. Si no hay nada → INVITADO
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<UserState>({
    role: 'invitado',
    user: null,
    alias: null,
    classToken: null,
  });
  const [loading, setLoading] = useState(true);

  // Función para determinar el estado del usuario
  const determineUserState = async (): Promise<UserState> => {
    // PASO 1: Verificar autenticación de Supabase (DOCENTE)
    const supabaseUser = await getCurrentUser();
    if (supabaseUser) {
      return {
        role: 'docente',
        user: supabaseUser,
        alias: null,
        classToken: null,
      };
    }

    // PASO 2: Verificar alias + class_token en localStorage (ESTUDIANTE)
    if (typeof window !== 'undefined') {
      // Buscar cualquier alias en localStorage
      const aliasKeys = Object.keys(localStorage).filter(k => k.startsWith('celesta:alias:'));
      
      for (const key of aliasKeys) {
        const alias = localStorage.getItem(key);
        if (alias && alias.trim()) {
          // Extraer class_token del key: "celesta:alias:DEMO-101" → "DEMO-101"
          const classToken = key.replace('celesta:alias:', '');
          
          // NUEVO: Verificar aprobación en roster (si está habilitado)
          // Por ahora, verificamos si tiene session_id guardado (legacy compatibility)
          const sessionId = localStorage.getItem(`celesta:sid:${classToken}`);
          
          // NOTA: La verificación de aprobación se hace en EstudianteGuard
          // para no bloquear la carga inicial de la app
          return {
            role: 'estudiante',
            user: null,
            alias: alias.trim(),
            classToken,
          };
        }
      }
    }

    // PASO 3: No hay nada (INVITADO)
    return {
      role: 'invitado',
      user: null,
      alias: null,
      classToken: null,
    };
  };

  useEffect(() => {
    // Carga inicial - Determinar rol UNA VEZ
    determineUserState().then(state => {
      setUserState(state);
      setLoading(false);
    });

    // Escuchar cambios de autenticación (solo afecta a DOCENTES)
    const subscription = onAuthStateChange((newUser) => {
      if (newUser) {
        // Usuario se autenticó → DOCENTE
        setUserState({
          role: 'docente',
          user: newUser,
          alias: null,
          classToken: null,
        });
      } else {
        // Usuario cerró sesión → Re-determinar (podría ser ESTUDIANTE o INVITADO)
        determineUserState().then(setUserState);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Helpers derivados
  const isDocente = userState.role === 'docente';
  const isEstudiante = userState.role === 'estudiante';
  const isInvitado = userState.role === 'invitado';
  
  const displayName = 
    isDocente ? (userState.user?.user_metadata?.full_name || userState.user?.email?.split('@')[0] || 'Docente') :
    isEstudiante ? (userState.alias || 'Estudiante') :
    'Invitado';

  return (
    <AuthContext.Provider value={{ 
      userState, 
      loading, 
      isDocente, 
      isEstudiante, 
      isInvitado,
      displayName 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
