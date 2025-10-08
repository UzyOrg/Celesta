'use client';
import { motion } from 'framer-motion';
import { User, CheckCircle2, Clock, Eye } from 'lucide-react';
import type { ApprovedStudent } from '@/types/roster';

interface ApprovedStudentsListProps {
  students: ApprovedStudent[];
  onStudentClick?: (student: ApprovedStudent) => void;
}

export default function ApprovedStudentsList({ students, onStudentClick }: ApprovedStudentsListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-12 md:py-20">
        <User className="w-12 h-12 md:w-16 md:h-16 text-neutral-600 mx-auto mb-3 md:mb-4" />
        <h3 className="text-base md:text-lg font-semibold text-neutral-300 mb-2">
          No hay estudiantes aprobados
        </h3>
        <p className="text-xs md:text-sm text-neutral-500">
          Los estudiantes aprobados aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
      {students.map((student, index) => (
        <motion.div
          key={student.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onStudentClick?.(student)}
          className="bg-neutral-900/50 backdrop-blur-sm border border-crystal-lavender/20 rounded-lg md:rounded-xl p-4 md:p-6 hover:border-crystal-lavender/40 hover:bg-neutral-900/70 transition-all cursor-pointer group min-h-[120px] md:min-h-0"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-crystal-lavender/10 border border-crystal-lavender/30 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 md:w-6 md:h-6 text-crystal-lavender" />
            </div>
            <div className="flex items-center gap-1 md:gap-1.5 bg-crystal-lavender/10 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full">
              <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-crystal-lavender" />
              <span className="text-[10px] md:text-xs font-semibold text-crystal-lavender">Aprobado</span>
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-1.5 md:space-y-2">
            <h4 className="text-base md:text-lg font-bold text-white truncate">
              {student.student_alias}
            </h4>
            
            <div className="space-y-1 text-xs md:text-sm text-neutral-400">
              {student.approved_at && (
                <p className="flex items-center gap-1 md:gap-1.5">
                  <CheckCircle2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-crystal-lavender flex-shrink-0" />
                  <span className="truncate text-[10px] md:text-xs">
                    Aprobado el {new Date(student.approved_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              )}
              
              {student.last_seen && (
                <p className="flex items-center gap-1 md:gap-1.5">
                  <Clock className="w-3 h-3 md:w-3.5 md:h-3.5 text-crystal-blue flex-shrink-0" />
                  <span className="truncate text-[10px] md:text-xs">
                    Último acceso: {new Date(student.last_seen).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Session ID (Debug) */}
          {student.student_session_id && (
            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-neutral-800/50">
              <p className="text-[9px] md:text-[10px] text-neutral-600 font-mono truncate">
                ID: {student.student_session_id.slice(0, 8)}...
              </p>
            </div>
          )}

          {/* Ver Insights Button (appears on hover) */}
          <div className="mt-3 md:mt-4 flex items-center justify-center md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-crystal-blue font-semibold">
              <Eye className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>Ver Viaje de Aprendizaje</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
