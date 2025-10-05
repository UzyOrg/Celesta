"use client";
import { createBrowserClient } from '@supabase/ssr';
import type { User, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client for auth operations (usando SSR browser client)
export const supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// Auth State Management
// ============================================================================

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser();
    
    // Si el error es "Auth session missing", es normal (usuario no logueado)
    if (error) {
      if (error.message?.includes('Auth session missing')) {
        // No es un error real, simplemente no hay sesión
        return null;
      }
      console.error('[auth] Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (e) {
    const err = e as Error;
    // Silenciar el error de sesión faltante (es esperado cuando no estás logueado)
    if (err.message?.includes('Auth session missing') || err.name === 'AuthSessionMissingError') {
      return null;
    }
    console.error('[auth] Exception getting current user:', e);
    return null;
  }
}

export async function getCurrentSession(): Promise<Session | null> {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      if (error.message?.includes('Auth session missing')) {
        return null;
      }
      console.error('[auth] Error getting session:', error);
      return null;
    }
    
    return session;
  } catch (e) {
    const err = e as Error;
    if (err.message?.includes('Auth session missing') || err.name === 'AuthSessionMissingError') {
      return null;
    }
    console.error('[auth] Exception getting session:', e);
    return null;
  }
}

// ============================================================================
// Teacher Authentication
// ============================================================================

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
}

export interface SignUpResult {
  success: boolean;
  error?: string;
  user?: User;
  needsEmailConfirmation?: boolean;
}

export async function signUpTeacher(data: SignUpData): Promise<SignUpResult> {
  try {
    const { email, password, fullName } = data;
    
    // Sign up with Supabase Auth
    const { data: authData, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/grupos`,
      }
    });

    if (error) {
      console.error('[signUpTeacher] Error:', error);
      return {
        success: false,
        error: error.message || 'Error al crear cuenta',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario',
      };
    }

    // Check if email confirmation is required
    // Si Supabase requiere confirmación, no habrá sesión activa ni identities
    const needsConfirmation = !authData.session || 
                             (authData.user.identities && authData.user.identities.length === 0) ||
                             authData.user.email_confirmed_at === null;

    return {
      success: true,
      user: authData.user,
      needsEmailConfirmation: needsConfirmation,
    };
  } catch (e) {
    console.error('[signUpTeacher] Exception:', e);
    return {
      success: false,
      error: (e as Error)?.message || 'Error inesperado',
    };
  }
}

export interface SignInResult {
  success: boolean;
  error?: string;
  user?: User;
  session?: Session;
}

export async function signInTeacher(email: string, password: string): Promise<SignInResult> {
  try {
    console.log('[signInTeacher] Attempting login for:', email);
    
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[signInTeacher] ❌ Login error:', error.message);
      return {
        success: false,
        error: error.message || 'Credenciales inválidas',
      };
    }

    if (!data.user || !data.session) {
      console.error('[signInTeacher] ❌ No user or session returned');
      return {
        success: false,
        error: 'No se pudo iniciar sesión',
      };
    }

    console.log('[signInTeacher] ✅ Login successful for:', data.user.email);
    console.log('[signInTeacher] Session expires at:', data.session.expires_at);
    
    // Verificar que las cookies se guardaron
    setTimeout(() => {
      const cookies = document.cookie.split(';').filter(c => c.includes('supabase'));
      console.log('[signInTeacher] Cookies after login:', cookies.length, 'cookies');
    }, 100);

    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (e) {
    console.error('[signInTeacher] ❌ Exception:', e);
    return {
      success: false,
      error: (e as Error)?.message || 'Error inesperado',
    };
  }
}

/**
 * @deprecated Use logout() from @/lib/session instead
 * This function is maintained for backward compatibility but delegates to the secure logout()
 * 
 * The centralized logout() in session.ts implements the correct two-phase logout:
 * 1. Server-side session invalidation (Supabase Auth)
 * 2. Client-side state cleanup (localStorage)
 */
export async function signOut(): Promise<void> {
  console.warn('[signOut] DEPRECATED: Use logout() from @/lib/session for secure logout');
  const { logout } = await import('./session');
  return logout();
}

// ============================================================================
// Teacher Profile
// ============================================================================

export interface TeacherProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export async function getTeacherProfile(userId: string): Promise<TeacherProfile | null> {
  try {
    const { data, error } = await supabaseClient
      .from('teachers')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getTeacherProfile] Error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('[getTeacherProfile] Exception:', e);
    return null;
  }
}

export async function updateTeacherProfile(
  userId: string, 
  updates: Partial<Pick<TeacherProfile, 'full_name'>>
): Promise<boolean> {
  try {
    const { error } = await supabaseClient
      .from('teachers')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('[updateTeacherProfile] Error:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('[updateTeacherProfile] Exception:', e);
    return false;
  }
}

// ============================================================================
// Auth Listeners
// ============================================================================

export function onAuthStateChange(callback: (user: User | null) => void) {
  const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
    (event, session) => {
      console.log('[auth] State change:', event, session?.user?.email);
      callback(session?.user || null);
    }
  );

  return subscription;
}
