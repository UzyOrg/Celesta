"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Image as ImageIcon, Video, FileText } from 'lucide-react';
import type { Recurso } from '@/lib/workshops/schema';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  recursos: Recurso[];
  titulo?: string;
};

export default function KnowledgeSanctuary({ isOpen, onClose, recursos, titulo }: Props) {
  if (recursos.length === 0 && !isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - más sutil, click para cerrar */}
          <motion.div
            className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel lateral DERECHO - Diseño minimalista */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          >
            {/* Header fijo - estilo Linear */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-md bg-turquoise/10 ring-1 ring-turquoise/20">
                  <BookOpen className="w-4 h-4 text-turquoise" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-neutral-100">
                    {titulo || 'Recursos'}
                  </h2>
                  <p className="text-xs text-neutral-500">
                    {recursos.length} {recursos.length === 1 ? 'disponible' : 'disponibles'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-neutral-800 transition-colors group"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
              </button>
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              {recursos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                  <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm">No hay recursos para este paso</p>
                </div>
              ) : (
                recursos.map((recurso, idx) => (
                  <RecursoCard key={idx} recurso={recurso} />
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// Componente Individual de Recurso
// ============================================

function RecursoCard({ recurso }: { recurso: Recurso }) {
  const getIcon = () => {
    switch (recurso.tipo) {
      case 'imagen':
        return <ImageIcon className="w-4 h-4" />;
      case 'video_embed':
        return <Video className="w-4 h-4" />;
      case 'texto':
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="rounded-lg border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-900/80 hover:border-neutral-700 transition-all duration-200"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Header del recurso - minimalista */}
      {(recurso.titulo || recurso.descripcion) && (
        <div className="px-4 py-3 border-b border-neutral-800/50">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-800 ring-1 ring-neutral-700 flex-shrink-0">
              <div className="text-turquoise">
                {getIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              {recurso.titulo && (
                <h4 className="font-medium text-neutral-200 text-sm mb-1">
                  {recurso.titulo}
                </h4>
              )}
              {recurso.descripcion && (
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {recurso.descripcion}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Contenido del recurso */}
      <div className="overflow-hidden">
        {recurso.tipo === 'imagen' && (
          <div className="p-3 bg-neutral-950/50">
            <img
              src={recurso.contenido}
              alt={recurso.descripcion}
              className="w-full h-auto max-h-64 object-contain rounded-md"
              loading="lazy"
            />
          </div>
        )}

        {recurso.tipo === 'video_embed' && (
          <div className="aspect-video bg-black">
            <iframe
              src={recurso.contenido}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={recurso.descripcion}
            />
          </div>
        )}

        {recurso.tipo === 'texto' && (
          <div className="p-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
            {recurso.contenido}
          </div>
        )}
      </div>
    </motion.div>
  );
}
