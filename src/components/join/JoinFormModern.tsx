"use client";
import React, { useState } from "react";
import { User, Rocket, Shield, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

type Props = {
  token: string;
  redirectTo?: string;
};

type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'pending' | 'approved' | 'rejected';

export default function JoinFormModern({ token, redirectTo }: Props) {
  const [alias, setAlias] = useState("");
  const [requestStatus, setRequestStatus] = useState<RequestStatus>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Validar que hay token
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center p-6">
        {/* Logo */}
        <div className="absolute top-6 left-6">
          <Image src="/Logo_Celestea.png" alt="Celesta" width={40} height={40} />
        </div>

        <motion.div
          className="max-w-md w-full bg-neutral-900/60 backdrop-blur-sm border border-red-900/50 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-xl md:text-2xl font-bold !text-white mb-3">Código Inválido</h2>
          <p className="text-sm md:text-base !text-neutral-300 mb-6">
            No se proporcionó un código de grupo válido. Solicita el enlace de invitación a tu docente.
          </p>
        </motion.div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alias.trim();
    if (!trimmed) return;
    
    setRequestStatus('loading');
    setErrorMessage("");
    
    try {
      // Enviar solicitud al roster
      const response = await fetch('/api/roster/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_token: token,
          student_alias: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar errores específicos
        if (data.error === 'alias_taken') {
          setErrorMessage('Este alias ya está en uso en este grupo. Elige otro.');
        } else if (data.error === 'invalid_token') {
          setErrorMessage('El código de grupo no es válido.');
        } else {
          setErrorMessage(data.message || 'Error al enviar la solicitud. Intenta de nuevo.');
        }
        setRequestStatus('error');
        return;
      }

      // Solicitud exitosa

      // Guardar alias en localStorage para identificación posterior
      localStorage.setItem(`celesta:alias:${token}`, trimmed);

      if (data.status === 'pending') {
        setRequestStatus('pending');
        setSuccessMessage(data.message || 'Solicitud enviada. Esperando aprobación del docente.');
      } else if (data.status === 'approved') {
        // Ya fue aprobado previamente
        setRequestStatus('approved');
        setSuccessMessage(data.message || '¡Ya estás aprobado! Redirigiendo...');
        
        // Redirigir después de 2 segundos
        setTimeout(() => {
          window.location.href = redirectTo || '/missions';
        }, 2000);
      } else if (data.status === 'rejected') {
        setRequestStatus('rejected');
        setErrorMessage(data.message || 'Tu solicitud fue rechazada por el docente.');
      }

    } catch (e) {
      console.error('[JoinForm] Error:', e);
      setErrorMessage('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setRequestStatus('error');
    }
  };

  const isLoading = requestStatus === 'loading';
  const showForm = requestStatus === 'idle' || requestStatus === 'loading' || requestStatus === 'error';

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-12 px-6">
      {/* Logo */}
      <div className="absolute top-6 left-6">
        <Image src="/Logo_Celestea.png" alt="Celesta" width={40} height={40} />
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-lime/20 to-turquoise/20 border border-lime/30 mb-6">
            <Rocket className="w-12 h-12 text-lime" />
          </div>
          <h2 className="text-xl md:text-2xl font-bold !text-white mb-3">
            Solicita Unirte al Grupo
          </h2>
          <p className="text-sm md:text-base !text-neutral-400 max-w-2xl mx-auto">
            Envía una solicitud con tu alias. El docente debe aprobarla para que puedas acceder.
          </p>
        </div>

        {/* Token Info */}
        <div className="mb-8 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/50 backdrop-blur-sm max-w-xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-turquoise/10 border border-turquoise/30">
              <Shield className="w-5 h-5 text-turquoise" />
            </div>
            <div>
              <p className="text-xs md:text-sm !text-neutral-400">Grupo de clase</p>
              <p className="font-mono text-sm md:text-base font-semibold !text-turquoise">{token}</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <AnimatePresence mode="wait">
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-xl mx-auto mb-6"
            >
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-200 text-sm">{errorMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success: Pending */}
        {requestStatus === 'pending' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto bg-neutral-900/60 backdrop-blur-sm border border-neutral-800/50 rounded-2xl p-8 text-center"
          >
            <Clock className="w-16 h-16 text-amber-400 mx-auto mb-6" />
            <h3 className="text-xl md:text-2xl font-bold !text-white mb-3">¡Solicitud Enviada!</h3>
            <p className="text-sm md:text-base !text-neutral-300 mb-6">{successMessage}</p>
            <div className="bg-neutral-800/50 rounded-lg p-4">
              <p className="text-sm text-neutral-400">
                Tu solicitud con el alias <strong className="text-turquoise">{alias}</strong> está 
                esperando la aprobación del docente. Te notificaremos cuando sea aprobada.
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-turquoise text-black font-semibold rounded-lg hover:bg-turquoise/90 transition"
            >
              Verificar Estado
            </button>
          </motion.div>
        )}

        {/* Success: Approved */}
        {requestStatus === 'approved' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto bg-neutral-900/60 backdrop-blur-sm border border-lime/30 rounded-2xl p-8 text-center"
          >
            <CheckCircle2 className="w-16 h-16 text-lime mx-auto mb-6" />
            <h3 className="text-xl md:text-2xl font-bold !text-white mb-3">¡Aprobado!</h3>
            <p className="text-sm md:text-base !text-neutral-300 mb-6">{successMessage}</p>
            <div className="flex items-center justify-center gap-2 text-turquoise">
              <div className="w-2 h-2 bg-turquoise rounded-full animate-pulse" />
              <span className="text-sm">Redirigiendo a tus misiones...</span>
            </div>
          </motion.div>
        )}

        {/* Form */}
        {showForm && (
          <form onSubmit={onSubmit} className="max-w-xl mx-auto">
            <div className="bg-neutral-900/60 backdrop-blur-sm rounded-2xl border border-neutral-800/50 p-8 space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-neutral-300 mb-3">
                  <User className="w-4 h-4 text-lime" />
                  Tu Alias
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder="Ej: AlexR, BioCientífica23, ProfeJuan..."
                  className="w-full min-h-[48px] bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-sm md:text-base !text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent transition-all"
                  maxLength={40}
                  disabled={isLoading}
                  autoFocus
                />
                <p className="mt-2 text-xs text-neutral-500">
                  Máximo 40 caracteres • Elige un alias único para este grupo
                </p>
              </div>

              <button
                type="submit"
                disabled={!alias.trim() || isLoading}
                className="w-full min-h-[48px] bg-gradient-to-r from-lime to-lime-600 text-black text-sm md:text-base font-bold py-3 md:py-4 px-6 rounded-xl hover:from-lime-600 hover:to-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Solicitar Acceso
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-lime/10 border border-lime/30 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-lime" />
            </div>
            <h3 className="text-sm md:text-base font-semibold !text-white mb-2">Privacidad Total</h3>
            <p className="text-xs md:text-sm !text-neutral-400">
              No recolectamos datos personales. Tu alias es anónimo.
            </p>
          </div>

          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-turquoise/10 border border-turquoise/30 flex items-center justify-center mx-auto mb-3">
              <Rocket className="w-6 h-6 text-turquoise" />
            </div>
            <h3 className="text-sm md:text-base font-semibold !text-white mb-2">Progreso Guardado</h3>
            <p className="text-xs md:text-sm !text-neutral-400">
              Tu avance se guarda automáticamente en tu dispositivo.
            </p>
          </div>

          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-amber" />
            </div>
            <h3 className="text-sm md:text-base font-semibold !text-white mb-2">Único y Tuyo</h3>
            <p className="text-xs md:text-sm !text-neutral-400">
              Tu alias te representa en todas las misiones.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        {showForm && (
          <p className="text-center text-xs text-neutral-500 mt-8">
            Al solicitar acceso, tu alias será enviado al docente para aprobación.
            <br />
            Celesta respeta tu privacidad y no comparte información con terceros.
          </p>
        )}
      </div>
    </div>
  );
}
