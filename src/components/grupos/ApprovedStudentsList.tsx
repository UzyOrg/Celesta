'use client';
import { motion } from 'framer-motion';
import { User, CheckCircle2, Clock } from 'lucide-react';
import type { ApprovedStudent } from '@/types/roster';

interface ApprovedStudentsListProps {
  students: ApprovedStudent[];
}

export default function ApprovedStudentsList({ students }: ApprovedStudentsListProps) {
  if (students.length === 0) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-neutral-300 mb-2">
          No hay estudiantes aprobados
        </h3>
        <p className="text-neutral-500">
          Los estudiantes aprobados aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student, index) => (
        <motion.div
          key={student.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          className="bg-neutral-900/50 backdrop-blur-sm border border-lime/20 rounded-xl p-6 hover:border-lime/40 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-full bg-lime/10 border border-lime/30 flex items-center justify-center">
              <User className="w-6 h-6 text-lime" />
            </div>
            <div className="flex items-center gap-1.5 bg-lime/10 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-lime" />
              <span className="text-xs font-semibold text-lime">Aprobado</span>
            </div>
          </div>

          {/* Student Info */}
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-white truncate">
              {student.student_alias}
            </h4>
            
            <div className="space-y-1 text-sm text-neutral-400">
              {student.approved_at && (
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-lime flex-shrink-0" />
                  <span className="truncate">
                    Aprobado el {new Date(student.approved_at).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              )}
              
              {student.last_seen && (
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-turquoise flex-shrink-0" />
                  <span className="truncate">
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
            <div className="mt-4 pt-4 border-t border-neutral-800/50">
              <p className="text-xs text-neutral-600 font-mono truncate">
                ID: {student.student_session_id.slice(0, 8)}...
              </p>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
