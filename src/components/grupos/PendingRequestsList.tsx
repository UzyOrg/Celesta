'use client';
import { motion } from 'framer-motion';
import { Check, X, Clock, User } from 'lucide-react';
import type { StudentRosterEntry } from '@/types/roster';

interface PendingRequestsListProps {
  requests: StudentRosterEntry[];
  onApprove: (requestId: number) => Promise<void>;
  onReject: (requestId: number) => Promise<void>;
}

export default function PendingRequestsList({ requests, onApprove, onReject }: PendingRequestsListProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-20">
        <Clock className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-neutral-300 mb-2">
          No hay solicitudes pendientes
        </h3>
        <p className="text-neutral-500">
          Comparte el enlace de invitación para que los estudiantes soliciten unirse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request, index) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-neutral-900/50 backdrop-blur-sm border border-amber-800/30 rounded-xl p-6 hover:border-amber-700/50 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Student Info */}
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-bold text-white mb-1 truncate">
                  {request.student_alias}
                </h4>
                <p className="text-sm text-neutral-400">
                  Solicitó el {new Date(request.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onApprove(request.id)}
                className="flex items-center gap-2 px-4 py-2 bg-lime/10 hover:bg-lime/20 border border-lime/30 hover:border-lime/50 text-lime rounded-lg transition-all font-medium"
              >
                <Check className="w-4 h-4" />
                <span className="hidden sm:inline">Aceptar</span>
              </button>
              <button
                onClick={() => onReject(request.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/10 hover:bg-red-900/20 border border-red-800/30 hover:border-red-800/50 text-red-400 rounded-lg transition-all font-medium"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">Rechazar</span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
