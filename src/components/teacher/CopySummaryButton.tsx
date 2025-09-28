"use client";
import React from 'react';

type Props = { text: string };

export default function CopySummaryButton({ text }: Props) {
  const [copied, setCopied] = React.useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  return (
    <button
      type="button"
      className="px-3 py-2 bg-neutral-800 text-white rounded hover:opacity-90 disabled:opacity-50"
      onClick={onClick}
      title="Copiar resumen al portapapeles"
    >
      {copied ? 'Copiado' : 'Copiar resumen'}
    </button>
  );
}
