"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, Loader2, GraduationCap } from 'lucide-react';
import { signInTeacher, getCurrentUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    setIsLoading(true);

    const result = await signInTeacher(email, password);

    if (result.success) {
      // Redirect to grupos (teacher control center)
      router.push('/grupos');
    } else {
      setError(result.error || 'Error al iniciar sesión');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center px-4 py-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-6 md:mb-8">
          <Link href="/" className="inline-flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-gradient-to-br from-crystal-blue to-crystal-lavender flex items-center justify-center">
              <GraduationCap className="w-6 h-6 md:w-7 md:h-7 text-black" />
            </div>
            <span className="text-lg md:text-2xl font-bold text-white">Celesta</span>
          </Link>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">Bienvenido de vuelta</h1>
          <p className="text-xs md:text-sm text-neutral-400">Inicia sesión en tu cuenta de docente</p>
        </div>

        {/* Login Form */}
        <div className="bg-neutral-900/60 backdrop-blur-sm rounded-xl md:rounded-2xl border border-neutral-800/50 p-5 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                className="flex items-start gap-2 md:gap-3 p-3 md:p-4 rounded-lg md:rounded-xl bg-red-500/10 border border-red-500/30"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs md:text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-neutral-300 mb-2 md:mb-3">
                <Mail className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-blue" />
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full h-12 bg-neutral-950 border border-neutral-700 rounded-lg md:rounded-xl px-3 md:px-4 text-sm md:text-base text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-crystal-blue focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-medium text-neutral-300 mb-2 md:mb-3">
                <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-crystal-lavender" />
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 bg-neutral-950 border border-neutral-700 rounded-lg md:rounded-xl px-3 md:px-4 text-sm md:text-base text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-crystal-lavender focus:border-transparent transition-all"
                required
                disabled={isLoading}
                autoComplete="current-password"
                minLength={6}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full min-h-[48px] bg-gradient-to-r from-crystal-blue to-crystal-lavender text-black text-xs md:text-sm font-bold py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                  <span className="text-xs md:text-sm">Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="text-xs md:text-sm">Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 md:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-800"></div>
            </div>
            <div className="relative flex justify-center text-xs md:text-sm">
              <span className="px-3 md:px-4 bg-neutral-900/60 text-neutral-500">
                ¿No tienes cuenta?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            href="/signup"
            className="block w-full min-h-[48px] text-center py-3 px-4 md:px-6 rounded-lg md:rounded-xl border-2 border-neutral-700 text-neutral-300 text-xs md:text-sm font-medium hover:border-crystal-blue hover:text-crystal-blue transition-all flex items-center justify-center"
          >
            Crear cuenta de docente
          </Link>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-4 md:mt-6">
          <Link href="/" className="text-xs md:text-sm text-neutral-500 hover:text-crystal-blue transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
