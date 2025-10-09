'use client';
import Link from 'next/link';
import { Construction, BookOpen, Sparkles, GraduationCap, FileStack } from 'lucide-react';

/**
 * BIBLIOTECA DEL DOCENTE
 * 
 * Vista optimizada para docentes. Centro de gestión de contenido pedagógico.
 * Permite crear, gestionar y compartir recursos educativos.
 */
export default function TeacherLibrary() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-20">
        
        {/* Header */}
        <div className="text-center space-y-4 md:space-y-6 mb-8 md:mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-crystal-lavender/20 to-crystal-blue/20 border border-crystal-lavender/30 mb-3 md:mb-4">
            <Construction className="w-8 h-8 md:w-10 md:h-10 text-crystal-lavender" />
          </div>
          
          <div className="space-y-2 md:space-y-3">
            <h1 className="text-xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-crystal-lavender via-crystal-blue to-crystal-lavender bg-clip-text text-transparent leading-tight px-4">
              Centro de Gestión Pedagógica en Construcción
            </h1>
            <p className="text-sm text-neutral-400 max-w-2xl mx-auto px-4">
              Tu centro de comando para crear experiencias de aprendizaje extraordinarias
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
                ¿Qué será tu Biblioteca?
              </h2>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed">
                La <strong className="text-crystal-lavender">Biblioteca del Docente</strong> será tu centro de gestión de contenido. 
                Aquí podrás crear, editar y compartir talleres, recursos y actividades, todo optimizado para 
                maximizar el impacto educativo.
              </p>
            </div>
          </div>
        </div>

        {/* Features para Docentes */}
        <div className="bg-gradient-to-br from-crystal-lavender/5 to-transparent rounded-lg md:rounded-xl p-4 md:p-6 border border-crystal-lavender/20 mb-6 md:mb-12">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-2 rounded-lg bg-crystal-lavender/20 flex-shrink-0">
              <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-crystal-lavender" />
            </div>
            <h3 className="text-sm font-semibold text-neutral-100">Próximamente en tu Centro de Gestión</h3>
          </div>
          <ul className="space-y-2 md:space-y-3 text-xs md:text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender mt-0.5 flex-shrink-0" />
              <span>Centro de mando para crear y gestionar contenido pedagógico</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender mt-0.5 flex-shrink-0" />
              <span>Editor visual de talleres y recursos</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender mt-0.5 flex-shrink-0" />
              <span>Biblioteca de plantillas y mejores prácticas</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender mt-0.5 flex-shrink-0" />
              <span>Analytics de efectividad de contenido</span>
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-crystal-lavender mt-0.5 flex-shrink-0" />
              <span>Sistema de versionado y colaboración</span>
            </li>
          </ul>
        </div>

        {/* Visión */}
        <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 rounded-lg md:rounded-2xl p-4 md:p-8 border border-neutral-800/50 mb-6 md:mb-12">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10 flex-shrink-0">
              <FileStack className="w-5 h-5 md:w-6 md:h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-neutral-100 mb-2 md:mb-3">
                Nuestra Visión para Docentes
              </h3>
              <p className="text-xs md:text-sm text-neutral-300 leading-relaxed mb-3 md:mb-4">
                Tu Biblioteca será el epicentro de tu creatividad pedagógica. Un espacio donde el contenido 
                educativo se crea con la asistencia de IA, se optimiza con datos reales de tus estudiantes 
                y se comparte con la comunidad docente global.
              </p>
              <p className="text-neutral-400 text-[10px] md:text-xs italic">
                &ldquo;Los mejores maestros no solo enseñan, crean experiencias que transforman.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-xs md:text-sm text-neutral-500 mb-4 md:mb-6 px-4">
            Mientras tanto, gestiona tus grupos desde el centro de control
          </p>
          <Link
            href="/grupos"
            className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-crystal-lavender to-crystal-blue text-black text-xs md:text-sm font-bold rounded-lg md:rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all min-h-[48px]"
          >
            <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
            Ver Mis Grupos
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-8 md:mt-16 text-center">
          <p className="text-neutral-400 text-[10px] md:text-xs px-4">
            Esta funcionalidad está en desarrollo prioritario.
            <br />
            ¿Qué características te gustaría ver en tu Centro de Gestión? Tu feedback es valioso.
          </p>
        </div>
      </div>
    </div>
  );
}
