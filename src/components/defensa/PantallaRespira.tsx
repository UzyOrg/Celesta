import { Check, HelpCircle } from 'lucide-react';
import type { EstadoPlanCliente, ResumenPracticaCliente } from './contrato';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import { AvisoDeError } from './AvisoDeError';
import styles from './PantallaRespira.module.css';

interface PantallaRespiraProps {
  /** Cómo van las preguntas: mientras no estén listas no se puede empezar. */
  plan: EstadoPlanCliente;
  /** Ya hay una defensa empezada: el botón la retoma en el mismo turno. */
  defensaEnCurso: boolean;
  /** Qué explicó bien y dónde dudó en el ensayo que acaba de terminar. Solo lo ve quien ensayó. */
  resumenPractica: readonly ResumenPracticaCliente[] | null;
  /** Empieza un ensayo privado: se ve igual que la defensa, pero nadie lo ve y no se entrega. */
  alEnsayar: () => void;
  /** Empieza la defensa de verdad. */
  alEmpezar: () => void;
  /** Vuelve a pedir las preguntas cuando no se pudieron armar. */
  alReintentarPlan: () => void;
  /** Cambia el archivo cuando no corresponde a la tarea. */
  alCambiarArchivo: () => void;
  ocupado?: boolean;
  error?: string | null;
}

/** Paso 9: "Cuando quieras". Nadie se apura; se puede ensayar en privado. */
export function PantallaRespira({
  plan,
  defensaEnCurso,
  resumenPractica,
  alEnsayar,
  alEmpezar,
  alReintentarPlan,
  alCambiarArchivo,
  ocupado = false,
  error = null,
}: PantallaRespiraProps) {
  const listo = plan === 'listo';
  const preparando = plan === 'generando' || plan === 'sin_entrega';
  const apoyo = preparando
    ? 'Preparando tus preguntas…'
    : plan === 'error'
      ? 'No pudimos preparar tus preguntas. Tu trabajo ya está entregado.'
      : plan === 'no_corresponde'
        ? 'Este archivo no parece ser de esta tarea. Puedes cambiarlo.'
        : '3 minutos, sin cámara y puedes escribir.';

  return (
    <div className={styles.raiz}>
      <Personaje tamano={190} expresion="neutro" movimiento="respira" mirada="alrededor" layoutId="orbe" />
      <span className={styles.sombra} aria-hidden="true" />

      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.2, 0.7)}>
        Cuando quieras.
      </h1>
      <p role="status" className={`${styles.apoyo} ${animaciones.entra}`} style={retraso(0.35, 0.7)}>
        {apoyo}
      </p>

      {resumenPractica && resumenPractica.length > 0 ? (
        <ul className={styles.resumen} aria-label="Cómo te fue en el ensayo">
          {resumenPractica.map((punto) => (
            <li key={punto.objetivoId} className={styles.punto}>
              {punto.resultado === 'explico' ? (
                <Check size={16} strokeWidth={2.4} aria-hidden="true" className={styles.puntoIcono} />
              ) : (
                <HelpCircle size={16} strokeWidth={2.2} aria-hidden="true" className={styles.puntoIcono} />
              )}
              <span>
                <span className={styles.puntoRotulo}>{punto.resultado === 'explico' ? 'Lo explicaste bien' : 'Aquí dudaste'}</span>
                {` · ${punto.texto}`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.relleno} />

      <AvisoDeError mensaje={error} />
      <div className={styles.acciones}>
        {plan === 'error' ? (
          <Boton tamano={64} aria-disabled={ocupado} onClick={alReintentarPlan}>
            Intentar de nuevo
          </Boton>
        ) : plan === 'no_corresponde' ? (
          <Boton tamano={64} onClick={alCambiarArchivo}>
            Cambiar archivo
          </Boton>
        ) : (
          <>
            {defensaEnCurso ? null : (
              <Boton
                variante="contorno"
                tamano={56}
                onClick={alEnsayar}
                className={styles.ensayo}
                aria-disabled={!listo || ocupado}
              >
                <span className={styles.ensayoTitulo}>Ensayar primero</span>
                <span className={styles.ensayoNota}>Privado y sin nota</span>
              </Boton>
            )}
            <Boton tamano={64} onClick={alEmpezar} aria-disabled={!listo || ocupado} aria-busy={ocupado}>
              {defensaEnCurso ? 'Continuar defensa' : 'Empezar defensa'}
            </Boton>
          </>
        )}
      </div>
    </div>
  );
}
