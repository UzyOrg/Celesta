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
      <div className="text-center py-12 md:py-20 px-4">
        <Clock className="w-12 h-12 md:w-16 md:h-16 text-neutral-600 mx-auto mb-3 md:mb-4" />
        <h3 className="text-base md:text-lg font-semibold text-neutral-300 mb-2">
          No hay solicitudes pendientes
        </h3>
        <p className="text-xs md:text-sm text-neutral-500">
          Comparte el enlace de invitación para que los estudiantes soliciten unirse.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {requests.map((request, index) => (
        <motion.div
          key={request.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-neutral-900/50 backdrop-blur-sm border border-amber-800/30 rounded-lg md:rounded-xl p-4 md:p-6 hover:border-amber-700/50 transition-colors"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
            {/* Student Info */}
            <div className="flex items-center gap-3 md:gap-4 flex-1">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm md:text-base font-bold !text-white mb-0.5 md:mb-1 truncate">
                  {request.student_alias}
                </h4>
                <p className="text-[10px] md:text-xs !text-neutral-400 truncate">
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
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-5 min-h-[48px] bg-crystal-lavender/10 hover:bg-crystal-lavender/20 border border-crystal-lavender/30 hover:border-crystal-lavender/50 text-crystal-lavender rounded-lg transition-all text-xs md:text-sm font-medium"
              >
                <Check className="w-4 h-4" />
                <span>Aceptar</span>
              </button>
              <button
                onClick={() => onReject(request.id)}
                className="flex-1 md:flex-initial flex items-center justify-center gap-1.5 md:gap-2 px-4 md:px-5 min-h-[48px] bg-red-900/10 hover:bg-red-900/20 border border-red-800/30 hover:border-red-800/50 text-red-400 rounded-lg transition-all text-xs md:text-sm font-medium"
              >
                <X className="w-4 h-4" />
                <span>Rechazar</span>
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
