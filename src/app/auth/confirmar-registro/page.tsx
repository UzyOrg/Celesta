'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, CheckCircle2, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { supabaseClient } from '@/lib/auth';

export default function ConfirmarRegistroPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(true);

  // Verificar y manejar el token de invitación
  useEffect(() => {
    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event: string, session: any) => {
      console.log('[ConfirmarRegistro] Auth event:', event);

      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        // Token válido detectado
        setTokenVerified(true);
        setVerifyingToken(false);
      }
    });

    // Verificar sesión actual (por si ya llegó autenticado)
    supabaseClient.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      if (session) {
        setTokenVerified(true);
      }
      setVerifyingToken(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      // Actualizar contraseña del usuario
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setIsLoading(false);
        return;
      }

      setSuccess(true);

      // Redirigir al dashboard después de 2 segundos
      setTimeout(() => {
        router.push('/grupos');
      }, 2000);

    } catch (err) {
      console.error('[ConfirmarRegistro] Error:', err);
      setError('Error inesperado al establecer la contraseña');
      setIsLoading(false);
    }
  };

  // Estado: Verificando token
  if (verifyingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-12 h-12 text-turquoise animate-spin mx-auto mb-4" />
          <p className="text-neutral-400">Verificando invitación...</p>
        </motion.div>
      </div>
    );
  }

  // Estado: Token inválido
  if (!tokenVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 border border-red-500/30 mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              Enlace Inválido o Expirado
            </h2>
            <p className="text-sm md:text-base text-neutral-400 mb-6">
              Este enlace de invitación no es válido o ya fue utilizado.
            </p>
            <Link
              href="/pilot-login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl hover:from-turquoise-600 hover:to-lime-600 transition-all"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Estado: Registro exitoso
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime/20 border border-lime/30 mb-6">
              <CheckCircle2 className="w-8 h-8 text-lime" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">
              ¡Bienvenido a Celesta!
            </h2>
            <p className="text-neutral-400 mb-6">
              Tu cuenta ha sido activada exitosamente. Redirigiendo a tu centro de control...
            </p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-turquoise animate-spin" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Estado: Formulario de contraseña
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-turquoise to-lime flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-black" />
            </div>
            <span className="text-xl md:text-2xl font-bold text-white">Celesta</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-2">
            Confirma tu Registro
          </h1>
          <p className="text-sm md:text-base text-neutral-400">
            Establece tu contraseña para completar el registro
          </p>
        </div>

        {/* Password Form */}
        <div className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <motion.div
                className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Password Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                <Lock className="w-4 h-4 text-turquoise" />
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
                autoFocus
              />
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                <Lock className="w-4 h-4 text-lime" />
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="w-full min-h-[48px] bg-gradient-to-r from-turquoise to-lime text-black text-sm md:text-base font-bold py-3 md:py-4 px-6 rounded-xl hover:from-turquoise-600 hover:to-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar y Continuar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-sm text-neutral-500 hover:text-turquoise transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
