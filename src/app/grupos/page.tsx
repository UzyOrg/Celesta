'use client';
import { Users, Plus, Sparkles, Calendar, BookOpen, TrendingUp } from 'lucide-react';
import AppShell from '@/components/shell/AppShell';

export default function GruposPage() {
  return (
    <AppShell userAlias="Docente" userRole="teacher">
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-6xl mx-auto px-6 py-12">
          
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime/10 border border-lime/30 text-lime text-sm font-medium mb-4">
              <Users className="w-4 h-4" />
              Centro de Grupos
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent mb-4">
              Gestiona tus Grupos
            </h1>
            <p className="text-xl text-neutral-400 max-w-3xl">
              Administra tus clases, asigna talleres y monitorea el progreso de tus estudiantes en un solo lugar.
            </p>
          </div>

          {/* Estado: En Construcción */}
          <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800/50 mb-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 rounded-xl bg-turquoise/10">
                <Sparkles className="w-7 h-7 text-turquoise" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-neutral-100 mb-2">
                  Próximamente Disponible
                </h2>
                <p className="text-neutral-300 leading-relaxed text-lg">
                  Estamos construyendo el sistema de gestión de grupos más intuitivo para docentes.
                  Pronto podrás crear, organizar y administrar todos tus grupos desde aquí.
                </p>
              </div>
            </div>
          </div>

          {/* Features Preview Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-turquoise/5 to-transparent rounded-xl p-6 border border-turquoise/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-turquoise/20">
                  <Plus className="w-5 h-5 text-turquoise" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-100">Crear Grupos Fácilmente</h3>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Crea nuevos grupos con un solo click. Genera códigos únicos de acceso y compártelos con tus estudiantes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-lime/5 to-transparent rounded-xl p-6 border border-lime/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-lime/20">
                  <BookOpen className="w-5 h-5 text-lime" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-100">Asignar Talleres</h3>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Asigna talleres específicos a cada grupo. Controla qué contenido está disponible y cuándo.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-amber-500/5 to-transparent rounded-xl p-6 border border-amber-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-100">Monitorear Progreso</h3>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Visualiza el progreso de cada estudiante en tiempo real. Identifica quién necesita apoyo adicional.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gradient-to-br from-purple-500/5 to-transparent rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-100">Programar Sesiones</h3>
              </div>
              <p className="text-neutral-300 leading-relaxed">
                Programa sesiones en vivo, establece fechas límite y envía recordatorios automáticos.
              </p>
            </div>
          </div>

          {/* Temporary Access */}
          <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 rounded-2xl p-8 border border-neutral-800/50">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-turquoise/10">
                <Users className="w-6 h-6 text-turquoise" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-neutral-100 mb-3">
                  Mientras Tanto...
                </h3>
                <p className="text-neutral-300 leading-relaxed mb-4">
                  Puedes acceder directamente a tus grupos existentes usando su código único:
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                  <code className="text-turquoise font-mono text-sm">
                    /teacher/&lt;CODIGO-GRUPO&gt;
                  </code>
                </div>
                <p className="text-neutral-400 text-sm mt-3">
                  Ejemplo: <code className="text-neutral-300">/teacher/DEMO-101</code>
                </p>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center">
            <p className="text-xs text-neutral-600">
              Esta funcionalidad está en desarrollo activo. Pronto estará disponible.
              <br />
              ¿Tienes sugerencias sobre qué deberían incluir los Grupos? Nos encantaría escucharlas.
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
