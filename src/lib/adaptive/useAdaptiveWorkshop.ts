"use client";
import { useState, useEffect } from 'react';
import type {
  AdaptiveWorkshopConfig,
  StudentProfile,
  AdaptationResult,
} from './schema';
import { crearPerfilEstudiante } from './schema';
import { adaptarTaller, guardarPerfil, cargarPerfil } from './engine';

type UseAdaptiveWorkshopReturn = {
  // Estado del diagnóstico
  necesitaDiagnostico: boolean;
  configDiagnostico: AdaptiveWorkshopConfig | null;
  loadingConfig: boolean;
  
  // Perfil y adaptación
  perfil: StudentProfile | null;
  adaptacion: AdaptationResult | null;
  
  // Acciones
  completarDiagnostico: (respuestas: Record<string, string>) => void;
  forzarRediagnostico: () => void;
};

export function useAdaptiveWorkshop(
  tallerId: string,
  sessionId: string,
  classToken: string
): UseAdaptiveWorkshopReturn {
  const [necesitaDiagnostico, setNecesitaDiagnostico] = useState(true);
  const [configDiagnostico, setConfigDiagnostico] = useState<AdaptiveWorkshopConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [perfil, setPerfil] = useState<StudentProfile | null>(null);
  const [adaptacion, setAdaptacion] = useState<AdaptationResult | null>(null);

  // Cargar configuración del diagnóstico
  useEffect(() => {
    async function cargarConfiguracion() {
      try {
        setLoadingConfig(true);
        const response = await fetch(`/adaptive/${tallerId}-diagnostic.json`);
        
        if (!response.ok) {
          console.warn(`[adaptive] No hay config para ${tallerId}, usando defaults`);
          setNecesitaDiagnostico(false);
          setLoadingConfig(false);
          return;
        }

        const config: AdaptiveWorkshopConfig = await response.json();
        setConfigDiagnostico(config);

        // Verificar si ya existe un perfil guardado
        const perfilGuardado = cargarPerfil(sessionId, tallerId);
        if (perfilGuardado) {
          console.log('[adaptive] Perfil encontrado, aplicando adaptación');
          setPerfil(perfilGuardado);
          const resultado = adaptarTaller(perfilGuardado, config);
          setAdaptacion(resultado);
          setNecesitaDiagnostico(false);
        } else {
          console.log('[adaptive] No hay perfil, requiere diagnóstico');
          setNecesitaDiagnostico(true);
        }

        setLoadingConfig(false);
      } catch (error) {
        console.error('[adaptive] Error cargando configuración:', error);
        setNecesitaDiagnostico(false);
        setLoadingConfig(false);
      }
    }

    if (tallerId && sessionId) {
      cargarConfiguracion();
    }
  }, [tallerId, sessionId]);

  // Completar diagnóstico
  const completarDiagnostico = (respuestas: Record<string, string>) => {
    if (!configDiagnostico) {
      console.warn('[adaptive] No hay configuración para crear perfil');
      setNecesitaDiagnostico(false);
      return;
    }

    console.log('[adaptive] Creando perfil desde respuestas:', respuestas);

    // Crear perfil del estudiante
    const nuevoPerfil = crearPerfilEstudiante(
      sessionId,
      classToken,
      tallerId,
      respuestas,
      configDiagnostico.cuestionarioDiagnostico
    );

    // Aplicar reglas de adaptación
    const resultado = adaptarTaller(nuevoPerfil, configDiagnostico);

    console.log('[adaptive] Perfil creado:', nuevoPerfil);
    console.log('[adaptive] Adaptación aplicada:', resultado);

    // Guardar
    setPerfil(nuevoPerfil);
    setAdaptacion(resultado);
    guardarPerfil(nuevoPerfil);
    setNecesitaDiagnostico(false);

    // Track evento
    try {
      if (typeof window !== 'undefined' && (window as any).trackEvent) {
        (window as any).trackEvent({
          verbo: 'completo_diagnostico',
          result: {
            perfil: nuevoPerfil,
            ajustes: resultado.ajustes,
            reglasAplicadas: resultado.reglasAplicadas,
          },
        });
      }
    } catch (err) {
      console.error('[adaptive] Error tracking diagnóstico:', err);
    }
  };

  // Forzar rediagnóstico (útil para testing)
  const forzarRediagnostico = () => {
    setPerfil(null);
    setAdaptacion(null);
    setNecesitaDiagnostico(true);
  };

  return {
    necesitaDiagnostico,
    configDiagnostico,
    loadingConfig,
    perfil,
    adaptacion,
    completarDiagnostico,
    forzarRediagnostico,
  };
}
