import { Info, Mic, Pencil } from 'lucide-react';
import { Fragment } from 'react';
import { Avatar } from '../celeste/Avatar';
import { Chip } from '../celeste/Chip';
import { ETIQUETA_NIVEL, IconoNivel } from '../celeste/IconoNivel';
import { LogoCelestea } from '../celeste/LogoCelestea';
import { ParteParaOir } from './ParteParaOir';
import type { Alumno, BloqueReporte, FragmentoReporte, ParteParaOir as DatosParteParaOir } from './types';
import styles from './BloqueDeObjetivo.module.css';

interface BloqueDeObjetivoProps {
  bloque: BloqueReporte;
  alumno: Alumno;
  /** Destello breve cuando se llega desde el resumen o desde una respuesta de Celestea. */
  resaltado: boolean;
  /** Qué parte para oír suena ahora (simulado), si alguna. */
  sonando: DatosParteParaOir['id'] | null;
  alTocarParte: (parte: DatosParteParaOir) => void;
}

function Fragmentos({ fragmentos }: { fragmentos: readonly FragmentoReporte[] }) {
  return (
    <>
      {fragmentos.map((fragmento, indice) => {
        const llave = `${indice}-${fragmento.texto}`;
        if (fragmento.resalte === 'subrayado') {
          return (
            <mark key={llave} className={styles.subrayado}>
              {fragmento.texto}
            </mark>
          );
        }
        if (fragmento.resalte === 'recuadro') {
          return (
            <mark key={llave} className={styles.recuadro}>
              {fragmento.texto}
            </mark>
          );
        }
        return <Fragment key={llave}>{fragmento.texto}</Fragment>;
      })}
    </>
  );
}

/**
 * Un objetivo del reporte: lo que se buscaba, la pregunta que hizo Celestea y
 * lo que respondió el alumno (transcripción o texto), con el audio original de
 * lo que marcó o aclaró cuando existe.
 */
export function BloqueDeObjetivo({ bloque, alumno, resaltado, sonando, alTocarParte }: BloqueDeObjetivoProps) {
  const { objetivo, nivel, pregunta, respuesta } = bloque;
  const numero = pregunta.numero;
  const idBloque = `p${numero}`;
  const idPregunta = `p${numero}-q`;
  const clases = resaltado ? `${styles.bloque} ${styles.destello}` : styles.bloque;

  return (
    <article id={idBloque} aria-labelledby={idPregunta} className={clases}>
      <div className={styles.franja}>
        <span className={styles.objetivo}>
          <span className={styles.objetivoNumero}>{`Objetivo ${objetivo.id}`}</span>
          {objetivo.texto}
        </span>
        {nivel ? (
          <Chip tono={nivel} tamano={28} icono={<IconoNivel nivel={nivel} tamano={11} />}>
            {ETIQUETA_NIVEL[nivel]}
          </Chip>
        ) : (
          <Chip tono="contorno" tamano={24}>
            Sin dato
          </Chip>
        )}
      </div>

      <div className={styles.cuerpo}>
        <div className={styles.fila}>
          <span className={styles.avatarPregunta} aria-hidden="true">
            <LogoCelestea tamano={20} />
          </span>
          <div className={styles.textos}>
            <span className={styles.numeroPregunta}>{`Pregunta ${numero}`}</span>
            <p id={idPregunta} className={styles.pregunta}>
              {`${pregunta.contexto} ${pregunta.pregunta}`}
            </p>
          </div>
        </div>

        <div className={styles.fila}>
          <Avatar iniciales={alumno.iniciales} nombre={alumno.nombre} tamano={34} />
          <div className={styles.respuesta}>
            <div className={styles.encabezadoRespuesta}>
              <span className={styles.autor}>
                {`Respuesta de ${alumno.primerNombre}`}
                {respuesta ? (
                  <Chip
                    tono="tenue"
                    icono={
                      respuesta.modo === 'voz' ? (
                        <Mic size={12} strokeWidth={2.2} aria-hidden="true" />
                      ) : (
                        <Pencil size={12} strokeWidth={2.2} aria-hidden="true" />
                      )
                    }
                  >
                    {respuesta.modo === 'voz' ? 'Voz' : 'Por escrito'}
                  </Chip>
                ) : null}
              </span>
              {respuesta ? (
                <Chip tono="contorno" tamano={24}>
                  {respuesta.calidad}
                </Chip>
              ) : null}
            </div>

            {respuesta?.lineas ? (
              <div className={styles.transcripcion}>
                {respuesta.lineas.map((linea) => (
                  <div key={linea.tiempo} className={styles.linea}>
                    <span className={styles.tiempo}>{linea.tiempo}</span>
                    <span className={styles.texto}>
                      <Fragmentos fragmentos={linea.fragmentos} />
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {respuesta?.textoEscrito ? (
              <div className={styles.escrito}>
                <span className={styles.texto}>{respuesta.textoEscrito}</span>
              </div>
            ) : null}

            {!respuesta ? (
              <div className={styles.escrito}>
                <span className={styles.sinTranscripcion}>
                  {`La transcripción de ${alumno.primerNombre} no está en esta demostración.`}
                </span>
              </div>
            ) : null}

            {respuesta?.parteParaOir ? (
              <ParteParaOir
                parte={respuesta.parteParaOir}
                sonando={sonando === respuesta.parteParaOir.id}
                alTocar={() => {
                  if (respuesta.parteParaOir) alTocarParte(respuesta.parteParaOir);
                }}
              />
            ) : null}

            {respuesta?.faltante ? (
              <p className={styles.faltante}>
                <Info size={16} strokeWidth={2} aria-hidden="true" className={styles.faltanteIcono} />
                <span>
                  <span className={styles.faltanteRotulo}>Faltó:</span>
                  {` ${respuesta.faltante}`}
                </span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
