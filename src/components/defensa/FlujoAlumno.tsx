'use client';

import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { pasoAtras, progresoDePaso, TITULO_DE_PASO } from './pasos';
import type { ModoDeRespuesta, PasoAlumnoId } from './pasos';
import type { ActividadAlumno } from './types';
import { Boton } from '@/components/celeste/Boton';
import { CabeceraAlumno } from './CabeceraAlumno';
import type { CabeceraAlumnoProps } from './CabeceraAlumno';
import { MarcoAlumno } from './MarcoAlumno';
import type { Resplandor } from './MarcoAlumno';
import { PantallaAclaracion } from './PantallaAclaracion';
import { PantallaArchivo } from './PantallaArchivo';
import { PantallaEntregado } from './PantallaEntregado';
import { PantallaEstres } from './PantallaEstres';
import { PantallaHola } from './PantallaHola';
import { PantallaInicio } from './PantallaInicio';
import { PantallaListo } from './PantallaListo';
import { PantallaPermisos } from './PantallaPermisos';
import { PantallaPregunta } from './PantallaPregunta';
import { PantallaQuien } from './PantallaQuien';
import { PantallaRespira } from './PantallaRespira';
import { PantallaRevisar } from './PantallaRevisar';
import { PantallaTrabajo } from './PantallaTrabajo';
import { PantallaVoz } from './PantallaVoz';
import { useFlujoDefensa } from './useFlujoDefensa';
import styles from './FlujoAlumno.module.css';

interface FlujoAlumnoProps {
  actividad: ActividadAlumno;
  pasoInicial: PasoAlumnoId;
  /** Abre el flujo ya en modo ensayo (`?ensayo=1`). */
  ensayoInicial: boolean;
  /** Abre el flujo con la respuesta por escrito (`?modo=escrito`). */
  modoInicial: ModoDeRespuesta;
}

/** Resplandor de fondo de cada paso: sigue a la esfera cuando es protagonista. */
const RESPLANDOR: Readonly<Record<PasoAlumnoId, Resplandor>> = {
  inicio: { arriba: -42, intensidad: 0.16 },
  quien: { arriba: 0, intensidad: 0 },
  permisos: { arriba: 0, intensidad: 0 },
  voz: { arriba: 0, intensidad: 0 },
  trabajo: { arriba: 0, intensidad: 0 },
  archivo: { arriba: 0, intensidad: 0 },
  entregado: { arriba: -55, intensidad: 0.14 },
  hola: { arriba: -10, intensidad: 0.16 },
  respira: { arriba: -5, intensidad: 0.16 },
  pregunta: { arriba: 210, intensidad: 0.14 },
  silencio: { arriba: 210, intensidad: 0.1 },
  aclaracion: { arriba: 0, intensidad: 0 },
  revisar: { arriba: 0, intensidad: 0 },
  estres: { arriba: 0, intensidad: 0 },
  listo: { arriba: 0, intensidad: 0.18 },
};

/**
 * Flujo completo del alumno, de "Hola" a "Listo", conectado a la API de las defensas.
 *
 * - Toda la lógica (sesión, entrega, plan, grabación por partes, reanudar) vive en
 *   `useFlujoDefensa`; este componente solo elige qué pantalla dibujar.
 * - El paso vive en la dirección (`?paso=`), pero solo se muestra si existe lo que ese
 *   paso necesita (no hay "pregunta" sin una pregunta): ver `pasoAlcanzable`.
 * - `MotionConfig` respeta "reducir movimiento" también en el vuelo de la esfera.
 */
export function FlujoAlumno({ actividad, pasoInicial, ensayoInicial, modoInicial }: FlujoAlumnoProps) {
  const flujo = useFlujoDefensa(actividad, { pasoInicial, ensayoInicial, modoInicial });
  const { paso, defensa, irA } = flujo;

  const numeroDePregunta = defensa?.pregunta?.numero ?? defensa?.aclaracion?.numero ?? 1;

  // Título de la pestaña: cada paso nuevo se anuncia.
  useEffect(() => {
    const titulo = paso === 'pregunta' || paso === 'silencio' || paso === 'aclaracion' ? `Pregunta ${numeroDePregunta}` : TITULO_DE_PASO[paso];
    document.title = `${titulo} | Celestea`;
  }, [paso, numeroDePregunta]);

  const atras = pasoAtras(paso);

  const cabecera = ((): CabeceraAlumnoProps => {
    switch (paso) {
      case 'inicio':
        return { tipo: 'marca' };
      case 'quien':
      case 'permisos':
      case 'voz':
      case 'trabajo':
      case 'archivo':
      case 'hola':
      case 'entregado':
        return {
          tipo: 'progreso',
          progreso: progresoDePaso(paso) ?? 0,
          alVolver: atras ? () => irA(atras, { direccion: 'izq' }) : undefined,
        };
      case 'respira':
        return { tipo: 'centrada', texto: 'Antes de empezar' };
      case 'pregunta':
      case 'silencio':
      case 'aclaracion':
        return {
          tipo: 'defensa',
          texto: `Pregunta ${numeroDePregunta}`,
          etiquetaSalir: 'Salir de la defensa',
          alSalir: flujo.salirDeLaDefensa,
        };
      case 'revisar':
        return {
          tipo: 'defensa',
          texto: 'Revisión',
          etiquetaSalir: 'Salir sin entregar la defensa',
          alSalir: flujo.salirDeLaDefensa,
        };
      case 'estres':
        return {
          tipo: 'entrega',
          texto: flujo.ensayo ? 'Ensayo terminado' : `Defensa entregada a las ${flujo.horaDefensa}`,
          alOmitir: flujo.omitirEstres,
        };
      case 'listo':
      default:
        return { tipo: 'ninguna' };
    }
  })();

  const pie =
    paso === 'revisar' ? (
      <footer className={styles.pieRevision}>
        <Boton tamano={64} onClick={flujo.entregarRevision} aria-disabled={flujo.ocupado} aria-busy={flujo.ocupado}>
          {flujo.ensayo ? 'Terminar ensayo' : 'Entregar defensa'}
        </Boton>
      </footer>
    ) : undefined;

  const pantalla = ((): JSX.Element | null => {
    switch (paso) {
      case 'inicio':
        return <PantallaInicio actividad={actividad} alEmpezar={flujo.empezar} />;
      case 'quien':
        return (
          <PantallaQuien
            nombre={flujo.nombre}
            matricula={flujo.matricula}
            alCambiarNombre={flujo.setNombre}
            alCambiarMatricula={flujo.setMatricula}
            alSeguir={() => irA('permisos')}
          />
        );
      case 'permisos':
        return (
          <PantallaPermisos
            aceptaciones={flujo.aceptaciones}
            alCambiar={flujo.cambiarAceptacion}
            alAceptar={flujo.aceptarPermisos}
            ocupado={flujo.ocupado}
            error={flujo.error}
          />
        );
      case 'voz':
        return <PantallaVoz modo={flujo.modo} alElegir={flujo.cambiarModo} alSeguir={() => irA('trabajo')} />;
      case 'trabajo':
        return (
          <PantallaTrabajo
            alElegirArchivo={flujo.elegirArchivo}
            alPegarTexto={flujo.pegarTexto}
            ocupado={flujo.ocupado}
            error={flujo.error}
          />
        );
      case 'archivo':
        return flujo.trabajo ? (
          <PantallaArchivo trabajo={flujo.trabajo} alCambiar={() => irA('trabajo', { direccion: 'izq' })} alEntregar={() => irA('entregado')} />
        ) : null;
      case 'entregado':
        return (
          <PantallaEntregado
            sello={flujo.selloEntrega}
            hora={flujo.horaEntrega}
            fecha={flujo.fechaEntrega}
            nombreDelTrabajo={flujo.entrega?.nombre ?? ''}
            alCambiar={() => irA('trabajo', { direccion: 'izq' })}
            alSeguir={flujo.seguirDeEntregado}
          />
        );
      case 'hola':
        return (
          <PantallaHola
            estado={flujo.estadoMicrofono}
            preparandoPreguntas={flujo.planEstado === 'generando'}
            alEscribir={flujo.escribirDesdeHola}
            alSeguir={flujo.seguirDeHola}
          />
        );
      case 'respira':
        return (
          <PantallaRespira
            plan={flujo.planEstado}
            defensaEnCurso={flujo.defensaRealAbierta}
            resumenPractica={flujo.resumenPractica}
            alEnsayar={() => flujo.empezarDefensa(true)}
            alEmpezar={() => flujo.empezarDefensa(false)}
            alReintentarPlan={flujo.reintentarPlan}
            alCambiarArchivo={() => irA('trabajo', { direccion: 'izq' })}
            ocupado={flujo.ocupado}
            error={flujo.error}
          />
        );
      case 'pregunta':
      case 'silencio': {
        const pregunta = defensa?.pregunta;
        if (!pregunta) return null;
        return (
          <PantallaPregunta
            pregunta={{ id: pregunta.turnoId, numero: pregunta.numero, contexto: pregunta.contexto, pregunta: pregunta.pregunta }}
            enSilencio={paso === 'silencio'}
            modo={flujo.modo}
            ensayo={flujo.ensayo}
            voz={flujo.vozDeLaPregunta}
            conAudio={Boolean(pregunta.audioUrl)}
            ocupado={flujo.ocupado}
            error={flujo.error}
            textoEscrito={flujo.textoDeLaPregunta}
            alCambiarTexto={flujo.cambiarTexto}
            alEscribir={flujo.escribirEnVezDeHablar}
            alHablar={flujo.hablarEnVezDeEscribir}
            alRepetir={flujo.repetirPregunta}
            alListo={flujo.terminarRespuesta}
          />
        );
      }
      case 'aclaracion': {
        const aclaracion = defensa?.aclaracion;
        if (!aclaracion) return null;
        return (
          <PantallaAclaracion
            aclaracion={{ antes: aclaracion.antes, despues: aclaracion.despues }}
            textoEscrito={flujo.aclaracionTexto}
            alCambiarTexto={flujo.setAclaracionTexto}
            puedeOir={Boolean(aclaracion.audioUrl)}
            oyendo={flujo.oyendoParte}
            alOir={flujo.oirParte}
            puedeHablar={flujo.puedeHablar && flujo.modo === 'voz'}
            grabando={flujo.grabandoAclaracion}
            alEmpezarADecir={flujo.empezarADecirLaParte}
            alListo={flujo.terminarAclaracion}
            alCambiarMedio={flujo.cambiarMedioDeAclaracion}
            ocupado={flujo.ocupado}
            error={flujo.error}
          />
        );
      }
      case 'revisar':
        return <PantallaRevisar bloques={flujo.bloquesRevision} marcas={flujo.marcas} alAlternarMarca={flujo.alternarMarca} />;
      case 'estres':
        return <PantallaEstres alElegir={flujo.elegirEstres} />;
      case 'listo':
      default:
        return <PantallaListo horaEntrega={flujo.horaEntrega} horaDefensa={flujo.horaDefensa} />;
    }
  })();

  // Las dos caras de la pregunta (escuchando / sin prisa) comparten pantalla y esfera. Cada pregunta nueva entra como pantalla nueva.
  const clavePantalla = paso === 'silencio' || paso === 'pregunta' ? `pregunta:${defensa?.pregunta?.turnoId ?? ''}` : paso;

  return (
    <MotionConfig reducedMotion="user">
      <MarcoAlumno
        direccion={flujo.direccion}
        resplandor={RESPLANDOR[paso]}
        cabecera={<CabeceraAlumno {...cabecera} />}
        pie={pie}
        paso={paso}
      >
        <div key={clavePantalla} className={styles.pantalla}>
          {pantalla}
        </div>
      </MarcoAlumno>
    </MotionConfig>
  );
}
