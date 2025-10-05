'use client';
import { useAuth } from '@/contexts/AuthContext';
import StudentLibrary from '@/components/biblioteca/StudentLibrary';
import TeacherLibrary from '@/components/biblioteca/TeacherLibrary';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * BIBLIOTECA - Vista Contextual por Rol
 * 
 * Renderiza la vista apropiada según el rol del usuario:
 * - Docentes → TeacherLibrary (centro de gestión pedagógica)
 * - Estudiantes → StudentLibrary (progreso y recursos)
 * - Invitados → Bloqueados (no deberían llegar aquí)
 */
export default function BibliotecaPage() {
  const { userState, isDocente, isEstudiante, loading } = useAuth();

  console.log('[BibliotecaPage] Role:', userState.role, '| Loading:', loading);

  // Mostrar loader mientras determina el rol
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 flex items-center justify-center">
        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
          <p className="text-neutral-400">Cargando biblioteca...</p>
        </motion.div>
      </div>
    );
  }

  // DOCENTE → Vista de docente
  if (isDocente) {
    return <TeacherLibrary />;
  }

  // ESTUDIANTE → Vista de estudiante
  if (isEstudiante) {
    return <StudentLibrary />;
  }

  // INVITADO → No debería llegar aquí (layout debería bloquearlo)
  // Safety fallback
  return null;
}
