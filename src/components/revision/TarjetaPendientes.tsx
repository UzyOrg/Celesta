import { AlertCircle, ArrowRight, Clock, Headphones, Link2, Loader } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PropsTarjetaPendientes } from './catalogo';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaPendientesProps {
  datos: PropsTarjetaPendientes;
  /** El primer reporte de la cola de revisión. */
  rutaPrimero: string | null;
}

interface Pendiente {
  clave: string;
  icono: ReactNode;
  texto: string;
}

const ICONO = { size: 17, strokeWidth: 2, 'aria-hidden': true } as const;

function plural(cantidad: number, uno: string, varios: string): string {
  return cantidad === 1 ? `1 ${uno}` : `${cantidad} ${varios}`;
}

/** Lo que le queda al profesor en esta actividad: reportes, análisis, audio que se borra y el enlace. */
export function TarjetaPendientes({ datos, rutaPrimero }: TarjetaPendientesProps) {
  const { porRevisar, conPartesParaOir, reportesPreparando, reportesConError, audioPorBorrar, enlace } = datos;

  const pendientes: Pendiente[] = [];
  if (conPartesParaOir > 0) {
    pendientes.push({
      clave: 'oir',
      icono: <Headphones {...ICONO} />,
      texto: `${plural(conPartesParaOir, 'reporte trae', 'reportes traen')} algo para oír.`,
    });
  }
  if (audioPorBorrar) {
    pendientes.push({
      clave: 'audio',
      icono: <Clock {...ICONO} />,
      texto: `El audio de ${plural(audioPorBorrar.reportes, 'reporte', 'reportes')} por revisar se borra el ${audioPorBorrar.dia}.`,
    });
  }
  if (reportesPreparando > 0) {
    pendientes.push({
      clave: 'preparando',
      icono: <Loader {...ICONO} />,
      texto: `${plural(reportesPreparando, 'análisis se está', 'análisis se están')} preparando.`,
    });
  }
  if (reportesConError > 0) {
    pendientes.push({
      clave: 'error',
      icono: <AlertCircle {...ICONO} />,
      texto: `${plural(reportesConError, 'análisis no se pudo', 'análisis no se pudieron')} preparar; puedes leer lo que respondieron.`,
    });
  }
  pendientes.push({
    clave: 'enlace',
    icono: <Link2 {...ICONO} />,
    texto: enlace.activo
      ? `El enlace del grupo sigue abierto: ${enlace.enviosUsados} de ${enlace.limiteEnvios} envíos.`
      : 'El enlace del grupo está desactivado: nadie nuevo puede entrar ni entregar.',
  });

  return (
    <TarjetaDeCelestea etiqueta="Lo que te falta" titulo="Lo que te falta">
      <div className={styles.cuerpo}>
        <div className={styles.cifra}>
          <span className={styles.numero}>{porRevisar}</span>
          <span className={styles.numeroTexto}>{porRevisar === 1 ? 'reporte por revisar' : 'reportes por revisar'}</span>
        </div>
        <ul className={styles.pendientes}>
          {pendientes.map((pendiente) => (
            <li key={pendiente.clave} className={styles.pendiente}>
              <span className={styles.pendienteIcono}>{pendiente.icono}</span>
              <span>{pendiente.texto}</span>
            </li>
          ))}
        </ul>
        {porRevisar > 0 && rutaPrimero ? (
          <div>
            <Pildora
              href={rutaPrimero}
              alto={44}
              relleno={20}
              letra={15}
              peso={600}
              espacio={8}
              icono={<ArrowRight size={17} strokeWidth={2.2} aria-hidden="true" />}
              iconoAlFinal
            >
              Revisar uno por uno
            </Pildora>
          </div>
        ) : null}
      </div>
    </TarjetaDeCelestea>
  );
}
