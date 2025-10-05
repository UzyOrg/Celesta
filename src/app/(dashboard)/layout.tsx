'use client';
import AppShell from '@/components/shell/AppShell';
import DocenteGuard from '@/components/guards/DocenteGuard';
import EstudianteGuard from '@/components/guards/EstudianteGuard';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

/**
 * DASHBOARD LAYOUT - Arquitectura de Cero Confianza
 * 
 * Layout persistente que envuelve el AppShell y aplica guards estrictos.
 * El rol determina completamente la experiencia.
 * 
 * Rutas protegidas:
 * - /grupos → Solo DOCENTES (DocenteGuard)
 * - /dashboard, /missions → Solo ESTUDIANTES (EstudianteGuard)
 * - /biblioteca → Ambos (vista contextual en la página)
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userState, displayName, isDocente, isEstudiante, loading } = useAuth();
  const pathname = usePathname();

  console.log('[DashboardLayout] Role:', userState.role, '| Path:', pathname, '| Loading:', loading);

  // Determinar qué guard aplicar según la ruta
  const isRutaDocente = pathname?.startsWith('/grupos');
  const isRutaEstudiante = pathname?.startsWith('/dashboard') || pathname?.startsWith('/missions');
  const isRutaCompartida = pathname?.startsWith('/biblioteca');

  // RUTA DE DOCENTE: /grupos → Solo docentes
  if (isRutaDocente) {
    return (
      <DocenteGuard>
        <AppShell userAlias={displayName} userRole="teacher">
          {children}
        </AppShell>
      </DocenteGuard>
    );
  }

  // RUTA DE ESTUDIANTE: /dashboard, /missions → Solo estudiantes
  if (isRutaEstudiante) {
    return (
      <EstudianteGuard>
        <AppShell userAlias={displayName} userRole="student">
          {children}
        </AppShell>
      </EstudianteGuard>
    );
  }

  // RUTA COMPARTIDA: /biblioteca → Ambos roles
  // El guard se aplica dentro según el rol
  if (isRutaCompartida) {
    // Docentes ven vista de docente
    if (isDocente) {
      return (
        <AppShell userAlias={displayName} userRole="teacher">
          {children}
        </AppShell>
      );
    }
    
    // Estudiantes ven vista de estudiante (protegida)
    if (isEstudiante) {
      return (
        <AppShell userAlias={displayName} userRole="student">
          {children}
        </AppShell>
      );
    }

    // Invitados son bloqueados (no se renderiza nada)
    return null;
  }

  // Ruta no reconocida - No renderizar (safety fallback)
  console.warn('[DashboardLayout] ⚠️ Ruta no reconocida:', pathname);
  return null;
}
