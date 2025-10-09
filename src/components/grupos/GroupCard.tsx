'use client';
import { motion } from 'framer-motion';
import { MoreVertical, Archive, Trash2, CheckCircle2, XCircle, Bell } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

type GroupCardProps = {
  classToken: string;
  talleresCount?: number; // Número de talleres asignados
  isActive: boolean;
  createdAt: string;
  pendingCount?: number;  // Nuevo: número de solicitudes pendientes
  onArchive: (token: string, newState: boolean) => Promise<void>;
  onDelete: (token: string) => Promise<void>;
};

export default function GroupCard({
  classToken,
  talleresCount = 0,
  isActive,
  createdAt,
  pendingCount = 0,
  onArchive,
  onDelete,
}: GroupCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpen]);

  const handleArchive = async () => {
    setLoading(true);
    setMenuOpen(false);
    try {
      await onArchive(classToken, !isActive);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setMenuOpen(false);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    try {
      await onDelete(classToken);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = () => {
    // Ir a la página de detalle del grupo (con pestaña Dashboard integrada)
    router.push(`/grupos/${classToken}`);
  };

  return (
    <motion.div
      onClick={handleCardClick}
      className={`relative bg-neutral-900/50 backdrop-blur-sm rounded-xl p-6 border transition-all cursor-pointer ${
        isActive ? 'border-neutral-800/50 hover:border-turquoise/30' : 'border-neutral-800/30 opacity-60'
      }`}
      whileHover={{ scale: loading ? 1 : 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Badge de Notificaciones */}
      {pendingCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 z-10"
        >
          <div className="flex items-center gap-1.5 bg-amber-500 text-black px-3 py-1.5 rounded-full shadow-lg">
            <Bell className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">{pendingCount}</span>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{classToken}</h3>
          <p className="text-sm text-neutral-400">
            Creado: {new Date(createdAt).toLocaleDateString('es-ES')}
          </p>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <Bell className="w-3 h-3" />
              {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''} pendiente{pendingCount > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Menu de Acciones */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevenir click en la card
              setMenuOpen(!menuOpen);
            }}
            className="p-2 rounded-lg hover:bg-neutral-800/50 transition-colors"
            disabled={loading}
          >
            <MoreVertical className="w-5 h-5 text-neutral-400" />
          </button>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()} // Prevenir click en la card
              className="absolute right-0 top-full mt-2 w-56 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-10"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-700 transition-colors text-left"
              >
                <Archive className="w-4 h-4 text-lime" />
                <span className="text-sm text-white">
                  {isActive ? 'Archivar Grupo' : 'Restaurar Grupo'}
                </span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-900/30 transition-colors text-left border-t border-neutral-700"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Eliminar Grupo</span>
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Talleres Info */}
      <div className="mb-4 p-3 bg-neutral-800/30 rounded-lg">
        <p className="text-xs text-neutral-500 mb-1">Talleres Asignados</p>
        <p className="text-sm font-medium text-turquoise">
          {talleresCount === 0 ? 'Sin talleres' : `${talleresCount} taller${talleresCount !== 1 ? 'es' : ''}`}
        </p>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-2">
        {isActive ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-lime" />
            <span className="text-xs font-medium text-lime">Activo</span>
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4 text-neutral-500" />
            <span className="text-xs font-medium text-neutral-500">Archivado</span>
          </>
        )}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-turquoise border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Grupo"
        message={`¿Estás seguro de que deseas eliminar el grupo "${classToken}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />
    </motion.div>
  );
}
