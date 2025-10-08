'use client';
import { Construction, BookOpen, Sparkles, Brain } from 'lucide-react';

/**
 * BIBLIOTECA DEL ESTUDIANTE
 * 
 * Vista optimizada para estudiantes que completaron misiones.
 * Muestra su progreso, recursos descubiertos y próximos pasos.
 */
export default function StudentLibrary() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-20">
        
        {/* Header */}
        <div className="text-center space-y-4 md:space-y-6 mb-8 md:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-crystal-blue/20 to-crystal-lavender/20 border border-crystal-blue/30 mb-3 md:mb-4">
            <Construction className="w-8 h-8 md:w-10 md:h-10 text-crystal-blue" />
          </div>
          
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-crystal-blue via-crystal-lavender to-crystal-blue bg-clip-text text-transparent leading-tight px-4">
              Tu Segundo Cerebro está en Construcción
            </h1>
            <p className="text-sm md:text-base text-neutral-400 max-w-2xl mx-auto px-4">
              Estamos construyendo algo especial para ti
            </p>
          </div>
        </div>

        {/* Descripción Principal */}
        <div className="bg-neutral-900/50 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-neutral-800/50 mb-6 md:mb-12">
          <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
            <div className="p-2 rounded-lg bg-crystal-lavender/10 flex-shrink-0">
              <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-crystal-lavender" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-bold text-neutral-100 mb-2 md:mb-3">
                ¿Qué será la Biblioteca?
              </h2>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
                Próximamente, la <strong className="text-crystal-lavender">Biblioteca</strong> será tu espacio personal 
                para revisar todas tus misiones completadas, los recursos que has descubierto y los conceptos 
                clave que has dominado.
              </p>
            </div>
          </div>
        </div>

        {/* Features para Estudiantes */}
        <div className="bg-gradient-to-br from-crystal-blue/5 to-transparent rounded-lg md:rounded-xl p-4 md:p-6 border border-crystal-blue/20 mb-6 md:mb-12">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 rounded-lg bg-crystal-blue/20 flex-shrink-0">
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-crystal-blue" />
            </div>
            <h3 className="text-sm md:text-base font-semibold text-neutral-100">Próximamente en tu Biblioteca</h3>
          </div>
          <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-blue mt-0.5 flex-shrink-0" />
              <span>Historial de misiones completadas con tus logros</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-blue mt-0.5 flex-shrink-0" />
              <span>Acceso rápido a todos los recursos descubiertos</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-blue mt-0.5 flex-shrink-0" />
              <span>Mapa de conceptos dominados</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-blue mt-0.5 flex-shrink-0" />
              <span>Recomendaciones personalizadas de siguiente paso</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-xs md:text-sm text-neutral-500 mb-4 md:mb-6 px-4">
            Mientras tanto, continúa explorando tus misiones
          </p>
          <a
            href="/missions"
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-crystal-blue to-crystal-lavender text-black text-xs md:text-sm font-bold rounded-lg md:rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all min-h-[48px]"
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            Ver Mis Misiones
          </a>
        </div>

        {/* Footer Note */}
        <div className="mt-8 md:mt-16 text-center">
          <p className="text-neutral-400 text-[10px] md:text-xs px-4">
            Esta funcionalidad está en nuestro roadmap de desarrollo activo.
            <br />
            ¿Tienes ideas sobre qué debería incluir la Biblioteca? Nos encantaría escucharlas.
          </p>
        </div>
      </div>
    </div>
  );
}
