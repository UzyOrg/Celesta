'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import {
  indiceDePaso,
  leerBandera,
  normalizarPaso,
  pasoAtras,
  pasoSiguiente,
  progresoDePaso,
  TITULO_DE_PASO,
} from './pasos';
import type { ModoDeRespuesta, PasoAlumnoId } from './pasos';
import type { ActividadAlumno, PreguntaDefensa } from './types';
import { Boton } from '@/components/celeste/Boton';
import { CabeceraAlumno } from './CabeceraAlumno';
import type { CabeceraAlumnoProps } from './CabeceraAlumno';
import { MarcoAlumno } from './MarcoAlumno';
import type { DireccionDeEntrada, Resplandor } from './MarcoAlumno';
import { PantallaAclaracion } from './PantallaAclaracion';
import { PantallaArchivo } from './PantallaArchivo';
import { PantallaEntregado } from './PantallaEntregado';
import { PantallaEstres } from './PantallaEstres';
import { PantallaHola } from './PantallaHola';
import { PantallaInicio } from './PantallaInicio';
import { PantallaListo } from './PantallaListo';
import { PantallaPermisos } from './PantallaPermisos';
import type { Aceptaciones } from './PantallaPermisos';
import { PantallaPregunta } from './PantallaPregunta';
import { PantallaQuien } from './PantallaQuien';
import { PantallaRespira } from './PantallaRespira';
import { PantallaRevisar } from './PantallaRevisar';
import { PantallaTrabajo } from './PantallaTrabajo';
import { PantallaVoz } from './PantallaVoz';
import { construirUrl } from './urlFlujo';
import type { ModoDeHistorial } from './urlFlujo';
import styles from './FlujoAlumno.module.css';

interface FlujoAlumnoProps {
  actividad: ActividadAlumno;
  pasoInicial: PasoAlumnoId;
  /** Abre el flujo ya en modo ensayo (`?ensayo=1`). */
  ensayoInicial: boolean;
  /** Abre el flujo con la respuesta por escrito (`?modo=escrito`). */
  modoInicial: ModoDeRespuesta;
}

/** Trabajo que la persona va a entregar. Hoy es solo un nombre: nada se sube. */
interface TrabajoElegido {
  nombre: string;
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

function esPregunta(paso: PasoAlumnoId): boolean {
  return paso === 'pregunta' || paso === 'silencio';
}

function marcasIniciales(actividad: ActividadAlumno): Record<string, boolean> {
  const marcas: Record<string, boolean> = {};
  actividad.revision.forEach((bloque) => {
    (bloque.lineas ?? []).forEach((linea) => {
      if (linea.marcadaDeInicio) marcas[linea.id] = true;
    });
  });
  return marcas;
}

/**
 * Flujo completo del alumno, de "Hola" a "Listo".
 *
 * - El paso vive en la dirección (`?paso=`), pero se cambia con la API de
 *   historial del navegador: sin pedir nada al servidor en cada paso.
 * - Todo lo que la persona escribe o elige se queda en este componente; nada
 *   sale del navegador (no hay servidor, micrófono ni subida de archivos).
 * - `MotionConfig` respeta "reducir movimiento" también en el vuelo de la esfera.
 */
export function FlujoAlumno({ actividad, pasoInicial, ensayoInicial, modoInicial }: FlujoAlumnoProps) {
  const [paso, setPaso] = useState<PasoAlumnoId>(pasoInicial);
  const [direccion, setDireccion] = useState<DireccionDeEntrada>('ninguna');
  const [modo, setModo] = useState<ModoDeRespuesta>(modoInicial);
  const [ensayo, setEnsayo] = useState(ensayoInicial);

  const [nombre, setNombre] = useState(actividad.alumnoDemo.nombre);
  const [matricula, setMatricula] = useState(actividad.alumnoDemo.matricula);
  const [aceptaciones, setAceptaciones] = useState<Aceptaciones>([false, false, false]);
  const [trabajo, setTrabajo] = useState<TrabajoElegido>({ nombre: actividad.trabajo.archivo });
  const [marcas, setMarcas] = useState<Record<string, boolean>>(() => marcasIniciales(actividad));
  const [respuestasEscritas, setRespuestasEscritas] = useState<Record<string, string>>({});
  const [aclaracionEscrita, setAclaracionEscrita] = useState('');
  const [reinicioSilencio, setReinicioSilencio] = useState(0);

  const pasoActual = useRef(paso);
  const historial = useRef<ModoDeHistorial>('ninguno');
  const primerRender = useRef(true);
  pasoActual.current = paso;

  /* ------------------------------ navegación ------------------------------ */

  const irA = useCallback(
    (destino: PasoAlumnoId, opciones: { reemplazar?: boolean; direccion?: DireccionDeEntrada } = {}) => {
      const sentido: DireccionDeEntrada =
        opciones.direccion ?? (indiceDePaso(destino) >= indiceDePaso(pasoActual.current) ? 'der' : 'izq');
      historial.current = opciones.reemplazar ? 'reemplazar' : 'empujar';
      setDireccion(sentido);
      setPaso(destino);
    },
    [],
  );

  const cambiarModo = useCallback((nuevo: ModoDeRespuesta) => {
    historial.current = 'reemplazar';
    setModo(nuevo);
  }, []);

  const cambiarEnsayo = useCallback((nuevo: boolean) => {
    historial.current = 'reemplazar';
    setEnsayo(nuevo);
  }, []);

  // Escribe el paso en la dirección (empujando o reemplazando la entrada del historial).
  useEffect(() => {
    if (historial.current === 'ninguno') return;
    const url = construirUrl(window.location, paso, ensayo, modo);
    if (historial.current === 'empujar') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    historial.current = 'ninguno';
  }, [paso, ensayo, modo]);

  // "Atrás" y "adelante" del navegador: se lee el paso de la dirección.
  useEffect(() => {
    const alRecorrerHistorial = () => {
      const parametros = new URLSearchParams(window.location.search);
      const destino = normalizarPaso(parametros.get('paso') ?? undefined);
      historial.current = 'ninguno';
      setDireccion(indiceDePaso(destino) >= indiceDePaso(pasoActual.current) ? 'der' : 'izq');
      setPaso(destino);
      setEnsayo(leerBandera(parametros.get('ensayo') ?? undefined));
      setModo(parametros.get('modo') === 'escrito' ? 'escrito' : 'voz');
    };
    window.addEventListener('popstate', alRecorrerHistorial);
    return () => window.removeEventListener('popstate', alRecorrerHistorial);
  }, []);

  // Título de la pestaña y foco: cada paso nuevo se anuncia y el teclado empieza en su título.
  const pasoAnterior = useRef(paso);
  useEffect(() => {
    document.title = `${TITULO_DE_PASO[paso]} | Celestea`;
    if (primerRender.current) {
      primerRender.current = false;
      pasoAnterior.current = paso;
      return;
    }
    // "Pregunta" y "Sin prisa" son la misma pantalla: ahí el foco se queda donde está.
    const mismaPregunta = esPregunta(paso) && esPregunta(pasoAnterior.current);
    pasoAnterior.current = paso;
    if (mismaPregunta) return;
    const titulo = document.querySelector<HTMLElement>('#contenido-defensa h1');
    if (titulo) {
      titulo.setAttribute('tabindex', '-1');
      titulo.focus({ preventScroll: true });
    }
  }, [paso]);

  // Si pasan unos segundos sin responder, la pregunta pasa a "Sin prisa".
  useEffect(() => {
    if (paso !== 'pregunta' || modo !== 'voz') return undefined;
    const espera = window.setTimeout(
      () => irA('silencio', { reemplazar: true, direccion: 'ninguna' }),
      actividad.segundosSilencio * 1000,
    );
    return () => window.clearTimeout(espera);
  }, [paso, modo, reinicioSilencio, actividad.segundosSilencio, irA]);

  /* -------------------------------- acciones ------------------------------- */

  const seguir = () => {
    const siguiente = pasoSiguiente(paso, { modo, ensayo });
    if (siguiente) irA(siguiente);
  };

  const atras = pasoAtras(paso);

  const primeraPregunta = actividad.preguntas[0] as PreguntaDefensa;

  const alternarMarca = (idLinea: string) =>
    setMarcas((previas) => ({ ...previas, [idLinea]: !previas[idLinea] }));

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
        return {
          tipo: 'defensa',
          texto: 'Pregunta 1',
          etiquetaSalir: 'Salir de la defensa',
          alSalir: () => irA('respira', { direccion: 'izq' }),
        };
      case 'aclaracion':
        return {
          tipo: 'defensa',
          texto: 'Pregunta 2',
          etiquetaSalir: 'Salir de la defensa',
          alSalir: () => irA('respira', { direccion: 'izq' }),
        };
      case 'revisar':
        return {
          tipo: 'defensa',
          texto: 'Revisión',
          etiquetaSalir: 'Salir sin entregar la defensa',
          alSalir: () => irA('respira', { direccion: 'izq' }),
        };
      case 'estres':
        return {
          tipo: 'entrega',
          texto: `Defensa entregada a las ${actividad.horaDefensa}`,
          alOmitir: () => irA('listo'),
        };
      case 'listo':
      default:
        return { tipo: 'ninguna' };
    }
  })();

  const pie =
    paso === 'revisar' ? (
      <footer className={styles.pieRevision}>
        <Boton tamano={64} onClick={seguir}>
          {ensayo ? 'Terminar ensayo' : 'Entregar defensa'}
        </Boton>
      </footer>
    ) : undefined;

  const pantalla = ((): JSX.Element => {
    switch (paso) {
      case 'inicio':
        return <PantallaInicio actividad={actividad} alEmpezar={seguir} />;
      case 'quien':
        return (
          <PantallaQuien
            nombre={nombre}
            matricula={matricula}
            alCambiarNombre={setNombre}
            alCambiarMatricula={setMatricula}
            alSeguir={seguir}
          />
        );
      case 'permisos':
        return (
          <PantallaPermisos
            aceptaciones={aceptaciones}
            alCambiar={(indice, valor) =>
              setAceptaciones((previas) => {
                const copia: [boolean, boolean, boolean] = [previas[0], previas[1], previas[2]];
                copia[indice] = valor;
                return copia;
              })
            }
            alAceptar={seguir}
          />
        );
      case 'voz':
        return <PantallaVoz modo={modo} alElegir={cambiarModo} alSeguir={seguir} />;
      case 'trabajo':
        return (
          <PantallaTrabajo
            alElegirArchivo={() => {
              setTrabajo({ nombre: actividad.trabajo.archivo });
              irA('archivo');
            }}
            alPegarTexto={() => {
              setTrabajo({ nombre: 'Texto pegado' });
              irA('entregado');
            }}
          />
        );
      case 'archivo':
        return (
          <PantallaArchivo trabajo={actividad.trabajo} alCambiar={() => irA('trabajo', { direccion: 'izq' })} alEntregar={seguir} />
        );
      case 'entregado':
        return (
          <PantallaEntregado
            actividad={actividad}
            nombreDelTrabajo={trabajo.nombre}
            alCambiar={() => irA('trabajo', { direccion: 'izq' })}
            alSeguir={seguir}
          />
        );
      case 'hola':
        return (
          <PantallaHola
            alEscribir={() => {
              cambiarModo('escrito');
              irA('respira');
            }}
            alSeguir={seguir}
          />
        );
      case 'respira':
        return (
          <PantallaRespira
            alEnsayar={() => {
              cambiarEnsayo(true);
              irA('pregunta');
            }}
            alEmpezar={() => {
              cambiarEnsayo(false);
              irA('pregunta');
            }}
          />
        );
      case 'pregunta':
      case 'silencio':
        return (
          <PantallaPregunta
            pregunta={primeraPregunta}
            enSilencio={paso === 'silencio'}
            modo={modo}
            ensayo={ensayo}
            textoEscrito={respuestasEscritas[primeraPregunta.id] ?? ''}
            alCambiarTexto={(texto) => setRespuestasEscritas((previas) => ({ ...previas, [primeraPregunta.id]: texto }))}
            alEscribir={() => cambiarModo('escrito')}
            alHablar={() => cambiarModo('voz')}
            alRepetir={() => {
              setReinicioSilencio((valor) => valor + 1);
              if (paso === 'silencio') irA('pregunta', { reemplazar: true, direccion: 'ninguna' });
            }}
            alListo={seguir}
          />
        );
      case 'aclaracion':
        return (
          <PantallaAclaracion
            aclaracion={actividad.aclaracion}
            textoEscrito={aclaracionEscrita}
            alCambiarTexto={setAclaracionEscrita}
            alListo={seguir}
          />
        );
      case 'revisar':
        return (
          <PantallaRevisar
            actividad={actividad}
            modo={modo}
            marcas={marcas}
            alAlternarMarca={alternarMarca}
            respuestasEscritas={respuestasEscritas}
            aclaracionEscrita={aclaracionEscrita}
          />
        );
      case 'estres':
        return <PantallaEstres alElegir={() => irA('listo')} />;
      case 'listo':
      default:
        return <PantallaListo actividad={actividad} />;
    }
  })();

  // Las dos caras de la pregunta (escuchando / sin prisa) comparten pantalla y esfera.
  const clavePantalla = paso === 'silencio' ? 'pregunta' : paso;

  return (
    <MotionConfig reducedMotion="user">
      <MarcoAlumno
        direccion={direccion}
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
