"use client";
import React, { useState, useEffect } from "react";
import AppShell from '@/components/shell/AppShell';
import PageContainer from '@/components/shell/PageContainer';
import { getAliasFromLocalStorage, setAliasInLocalStorage } from '@/lib/alias';
import { User, Rocket, Shield } from 'lucide-react';

type Props = {
  token: string;
};

export default function JoinFormModern({ token }: Props) {
  const [alias, setAlias] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    try {
      const prev = getAliasFromLocalStorage(token);
      if (prev) {
        setAlias(prev);
      }
    } catch {
      // ignore
    }
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alias.trim();
    if (!trimmed) return;
    
    setIsLoading(true);
    
    try {
      setAliasInLocalStorage(token, trimmed);
      const t = token || "DEMO-101";
      
      // Pequeña pausa para feedback visual
      await new Promise(resolve => setTimeout(resolve, 300));
      
      window.location.href = `/demo/student?t=${encodeURIComponent(t)}`;
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <AppShell userAlias="Nuevo Estudiante" userRole="student">
      <PageContainer
        title="Bienvenido a Celesta OS"
        subtitle="Configura tu identidad antes de comenzar"
        maxWidth="4xl"
      >
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-lime/20 to-turquoise/20 border border-lime/30 mb-6">
            <Rocket className="w-12 h-12 text-lime" />
          </div>
          <h2 className="text-3xl font-bold text-neutral-100 mb-3">
            ¡Tu aventura comienza aquí!
          </h2>
          <p className="text-lg text-neutral-400 max-w-2xl mx-auto">
            Estás a punto de unirte a una experiencia de aprendizaje inmersiva. 
            Primero, elige un alias para identificarte.
          </p>
        </div>

        {/* Token Info */}
        {token && (
          <div className="mb-8 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-turquoise/10 border border-turquoise/30">
                <Shield className="w-5 h-5 text-turquoise" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Grupo de clase</p>
                <p className="font-mono font-semibold text-turquoise">{token}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
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
                className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-lime focus:border-transparent transition-all"
                maxLength={40}
                disabled={isLoading}
                autoFocus
              />
              <p className="mt-2 text-xs text-neutral-500">
                Máximo 40 caracteres • No uses tu nombre real
              </p>
            </div>

            <button
              type="submit"
              disabled={!alias.trim() || isLoading}
              className="w-full bg-gradient-to-r from-lime to-lime-600 text-black font-bold py-4 px-6 rounded-xl hover:from-lime-600 hover:to-lime-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Comenzar Misión
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-4xl mx-auto">
          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-lime/10 border border-lime/30 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-lime" />
            </div>
            <h3 className="font-semibold text-neutral-200 mb-2">Privacidad Total</h3>
            <p className="text-sm text-neutral-400">
              No recolectamos datos personales. Tu alias es anónimo.
            </p>
          </div>

          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-turquoise/10 border border-turquoise/30 flex items-center justify-center mx-auto mb-3">
              <Rocket className="w-6 h-6 text-turquoise" />
            </div>
            <h3 className="font-semibold text-neutral-200 mb-2">Progreso Guardado</h3>
            <p className="text-sm text-neutral-400">
              Tu avance se guarda automáticamente en tu dispositivo.
            </p>
          </div>

          <div className="bg-neutral-900/40 backdrop-blur-sm rounded-xl border border-neutral-800/50 p-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-amber/10 border border-amber/30 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6 text-amber" />
            </div>
            <h3 className="font-semibold text-neutral-200 mb-2">Único y Tuyo</h3>
            <p className="text-sm text-neutral-400">
              Tu alias te representa en todas las misiones.
            </p>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-neutral-500 mt-8">
          Al continuar, aceptas que tu alias y progreso se almacenen localmente en tu navegador.
          <br />
          Celesta OS respeta tu privacidad y no comparte información con terceros.
        </p>
      </PageContainer>
    </AppShell>
  );
}
