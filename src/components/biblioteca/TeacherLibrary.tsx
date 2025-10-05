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
      <div className="max-w-4xl mx-auto px-6 py-20">
        
        {/* Header */}
        <div className="text-center space-y-6 mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-lime/20 to-turquoise/20 border border-lime/30 mb-4">
            <Construction className="w-10 h-10 text-lime" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-lime via-turquoise to-lime bg-clip-text text-transparent">
              Centro de Gestión Pedagógica en Construcción
            </h1>
            <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
              Tu centro de comando para crear experiencias de aprendizaje extraordinarias
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
                ¿Qué será tu Biblioteca?
              </h2>
              <p className="text-neutral-300 leading-relaxed text-lg">
                La <strong className="text-lime">Biblioteca del Docente</strong> será tu centro de gestión de contenido. 
                Aquí podrás crear, editar y compartir talleres, recursos y actividades, todo optimizado para 
                maximizar el impacto educativo.
              </p>
            </div>
          </div>
        </div>

        {/* Features para Docentes */}
        <div className="bg-gradient-to-br from-lime/5 to-transparent rounded-xl p-6 border border-lime/20 mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-lime/20">
              <GraduationCap className="w-5 h-5 text-lime" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-100">Próximamente en tu Centro de Gestión</h3>
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
            <li className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-lime mt-1 flex-shrink-0" />
              <span>Sistema de versionado y colaboración</span>
            </li>
          </ul>
        </div>

        {/* Visión */}
        <div className="bg-gradient-to-r from-neutral-900/80 to-neutral-900/40 rounded-2xl p-8 border border-neutral-800/50 mb-12">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <FileStack className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-neutral-100 mb-3">
                Nuestra Visión para Docentes
              </h3>
              <p className="text-neutral-300 leading-relaxed mb-4">
                Tu Biblioteca será el epicentro de tu creatividad pedagógica. Un espacio donde el contenido 
                educativo se crea con la asistencia de IA, se optimiza con datos reales de tus estudiantes 
                y se comparte con la comunidad docente global.
              </p>
              <p className="text-neutral-400 text-sm italic">
                &ldquo;Los mejores maestros no solo enseñan, crean experiencias que transforman.&rdquo;
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-neutral-500 mb-6">
            Mientras tanto, gestiona tus grupos desde el centro de control
          </p>
          <Link
            href="/grupos"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-lime to-turquoise text-black font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <BookOpen className="w-5 h-5" />
            Ver Mis Grupos
          </Link>
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center">
          <p className="text-neutral-400 text-sm">
            Esta funcionalidad está en desarrollo prioritario.
            <br />
            ¿Qué características te gustaría ver en tu Centro de Gestión? Tu feedback es valioso.
          </p>
        </div>
      </div>
    </div>
  );
}
