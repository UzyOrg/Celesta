'use client';
import { Construction, BookOpen, Sparkles, GraduationCap, FileStack, Brain } from 'lucide-react';
import AppShell from '@/components/shell/AppShell';

export default function BibliotecaPage() {
  return (
    <AppShell userAlias="Explorador" userRole="student">
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-20">
        
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-turquoise/20 to-lime/20 border border-turquoise/30 mb-4">
            <Construction className="w-10 h-10 text-turquoise" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-turquoise via-lime to-turquoise bg-clip-text text-transparent">
              Tu Segundo Cerebro está en Construcción
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
              Estamos construyendo algo especial para ti
            </p>
          </div>
        </div>

        {/* Descripción Principal */}
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-2xl p-8 border border-neutral-800/50 mb-12">
          <div className="flex items-start gap-4 mb-6">
            <div className="p-2 rounded-lg bg-lime/10">
              <BookOpen className="w-6 h-6 text-lime" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-neutral-100 mb-3">
                ¿Qué será la Biblioteca?
              </h2>
              <p className="text-neutral-300 leading-relaxed text-lg">
                Próximamente, la <strong className="text-lime">Biblioteca</strong> será tu espacio personal 
                para revisar todas tus misiones completadas, los recursos que has descubierto y los conceptos 
                clave que has dominado.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          
          {/* Para Estudiantes */}
          <div className="bg-gradient-to-br from-turquoise/5 to-transparent rounded-xl p-6 border border-turquoise/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-turquoise/20">
                <Brain className="w-5 h-5 text-turquoise" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100">Para Estudiantes</h3>
            </div>
            <ul className="space-y-3 text-neutral-300">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-turquoise mt-1 flex-shrink-0" />
                <span>Historial de misiones completadas con tus logros</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-turquoise mt-1 flex-shrink-0" />
                <span>Acceso rápido a todos los recursos descubiertos</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-turquoise mt-1 flex-shrink-0" />
                <span>Mapa de conceptos dominados</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-turquoise mt-1 flex-shrink-0" />
                <span>Recomendaciones personalizadas de siguiente paso</span>
              </li>
            </ul>
          </div>

          {/* Para Docentes */}
          <div className="bg-gradient-to-br from-lime/5 to-transparent rounded-xl p-6 border border-lime/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-lime/20">
                <GraduationCap className="w-5 h-5 text-lime" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100">Para Docentes</h3>
            </div>
            <ul className="space-y-3 text-neutral-300">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-lime mt-1 flex-shrink-0" />
                <span>Centro de mando para crear y gestionar contenido pedagógico</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-lime mt-1 flex-shrink-0" />
                <span>Editor visual de talleres y recursos</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-lime mt-1 flex-shrink-0" />
                <span>Biblioteca de plantillas y mejores prácticas</span>
              </li>
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-lime mt-1 flex-shrink-0" />
                <span>Analytics de efectividad de contenido</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Visión Futura */}
        <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 rounded-2xl p-8 border border-neutral-800/50">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileStack className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-100 mb-3">
                Nuestra Visión
              </h3>
              <p className="text-neutral-300 leading-relaxed mb-4">
                La Biblioteca será el corazón del ecosistema de aprendizaje de Celesta. Un espacio donde 
                el conocimiento no se pierde, sino que se organiza, se conecta y evoluciona contigo.
              </p>
              <p className="text-neutral-400 text-sm italic">
                "El conocimiento no es poder. El conocimiento compartido y organizado es poder."
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-neutral-500 mb-6">
            Mientras tanto, continúa explorando tus misiones
          </p>
          <a
            href="/missions"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-turquoise to-lime text-black font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <BookOpen className="w-5 h-5" />
            Ver Mis Misiones
          </a>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-xs text-neutral-600">
            Esta funcionalidad está en nuestro roadmap de desarrollo activo.
            <br />
            ¿Tienes ideas sobre qué debería incluir la Biblioteca? Nos encantaría escucharlas.
          </p>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
