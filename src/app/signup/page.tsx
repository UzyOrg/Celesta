"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, AlertCircle, Loader2, GraduationCap, CheckCircle2 } from 'lucide-react';
import { signUpTeacher, getCurrentUser } from '@/lib/auth';

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) {
        router.replace('/grupos');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    const result = await signUpTeacher({
      email,
      password,
      fullName,
    });

    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      
      if (result.needsEmailConfirmation) {
        // Show confirmation message
        setNeedsEmailConfirmation(true);
      } else {
        // Auto-login successful, redirect
        setTimeout(() => {
          router.push('/grupos');
        }, 2000);
      }
    } else {
      setError(result.error || 'Error al crear cuenta');
    }
  };

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
            
            <h2 className="text-xl md:text-2xl font-bold !text-white mb-3">
              {needsEmailConfirmation ? '¡Cuenta creada!' : '¡Bienvenido a Celesta!'}
            </h2>
            
            {needsEmailConfirmation ? (
              <>
                <p className="text-sm md:text-base !text-neutral-400 mb-6">
                  Hemos enviado un correo de confirmación a <strong className="text-turquoise">{email}</strong>
                </p>
                <p className="text-sm text-neutral-500 mb-6">
                  Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta.
                </p>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl hover:from-turquoise-600 hover:to-lime-600 transition-all"
                >
                  Ir al inicio de sesión
                </Link>
              </>
            ) : (
              <>
                <p className="text-neutral-400 mb-6">
                  Tu cuenta ha sido creada exitosamente. Redirigiendo a tu centro de control...
                </p>
                <div className="flex justify-center">
                  <Loader2 className="w-6 h-6 text-turquoise animate-spin" />
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

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
            <span className="text-xl md:text-2xl font-bold !text-white">Celesta</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold !text-white mb-2">Crea tu cuenta</h1>
          <p className="text-sm md:text-base !text-neutral-400">Únete como docente a Celesta OS</p>
        </div>

        {/* Sign Up Form */}
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
                <div className="flex-1">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Full Name Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                <User className="w-4 h-4 text-turquoise" />
                Nombre Completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: María García"
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base !text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="name"
                autoFocus
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                <Mail className="w-4 h-4 text-lime" />
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base !text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-2">
                <Lock className="w-4 h-4 text-turquoise" />
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base !text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
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
                className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base !text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !fullName || !email || !password || !confirmPassword}
              className="w-full min-h-[48px] bg-gradient-to-r from-turquoise to-lime text-black text-sm md:text-base font-bold py-3 md:py-4 px-6 rounded-xl hover:from-turquoise-600 hover:to-lime-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Crear Cuenta
                </>
              )}
            </button>

            {/* Terms */}
            <p className="text-xs text-neutral-500 text-center">
              Al crear una cuenta, aceptas nuestros{' '}
              <Link href="#" className="text-turquoise hover:underline">
                Términos de Servicio
              </Link>{' '}
              y{' '}
              <Link href="#" className="text-turquoise hover:underline">
                Política de Privacidad
              </Link>
            </p>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-neutral-900/60 text-neutral-500">
                ¿Ya tienes cuenta?
              </span>
            </div>
          </div>

          {/* Login Link */}
          <Link
            href="/login"
            className="block w-full min-h-[48px] text-center py-3 px-6 rounded-xl border-2 border-neutral-700 text-sm md:text-base !text-neutral-300 font-medium hover:border-lime hover:text-lime transition-all flex items-center justify-center"
          >
            Iniciar sesión
          </Link>
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
