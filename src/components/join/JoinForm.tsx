"use client";
import React from "react";
import { getAliasFromLocalStorage, setAliasInLocalStorage } from '@/lib/alias';

type Props = {
  token: string;
};

export default function JoinForm({ token }: Props) {
  const [alias, setAlias] = React.useState("");

  React.useEffect(() => {
    try {
      const prev = getAliasFromLocalStorage(token);
      if (prev) setAlias(prev);
    } catch {
      // ignore
    }
  }, [token]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = alias.trim();
    if (!trimmed) return;
    try {
      setAliasInLocalStorage(token, trimmed);
    } catch {
      // ignore
    }
    const t = token || "DEMO-101";
    window.location.href = `/demo/student?t=${encodeURIComponent(t)}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-neutral-300 mb-1">Alias</label>
        <input
          value={alias}
          onChange={(e) => setAlias(e.target.value)}
          placeholder="Tu alias (p. ej. AlexR)"
          className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-white"
          maxLength={40}
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-lime text-black rounded hover:opacity-90"
        disabled={!alias.trim()}
      >
        Entrar a la misión
      </button>
    </form>
  );
}
