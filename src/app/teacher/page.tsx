"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherIndexPage() {
  const [token, setToken] = useState('');
  const router = useRouter();

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <header>
        <h1 className="text-3xl font-bold">Panel Docente</h1>
        <p className="text-neutral-300 text-sm">
          Visualiza el progreso y métricas de tu grupo en tiempo real.
        </p>
      </header>

      <div className="p-4 rounded bg-black/20 border border-neutral-800 space-y-3">
        <label className="block text-sm text-neutral-300">Token de grupo</label>
        <input
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Ej. DEMO-101"
          className="w-full p-2 rounded bg-black/20 border border-neutral-700"
        />
        <button
          className="px-4 py-2 bg-lime text-black rounded disabled:opacity-50"
          disabled={!token.trim()}
          onClick={() => {
            const t = token.trim();
            if (!t) return;
            router.push(`/teacher/${encodeURIComponent(t)}`);
          }}
        >
          Abrir panel
        </button>
      </div>

      <section className="text-sm text-neutral-400 space-y-2">
        <p>
          Comparte con estudiantes el enlace del taller incluyendo <code>?t=TOKEN</code> para
          asociar sus eventos al grupo. Ejemplo: <code>/demo/student?t=DEMO-101</code>.
        </p>
        <p>
          Asegúrate de configurar <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> en el servidor.
        </p>
      </section>
    </div>
  );
}
