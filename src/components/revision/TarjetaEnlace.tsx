'use client';

import { useState } from 'react';
import type { PropsTarjetaEnlace } from './catalogo';
import { Pildora } from './Pildora';
import { TarjetaDeCelestea } from './TarjetaDeCelestea';
import styles from './TarjetasDelAsistente.module.css';

interface TarjetaEnlaceProps {
  datos: PropsTarjetaEnlace;
  /** Se llama solo después de que el profesor confirma con un toque; Celestea nunca lo cambia sola. */
  alCambiar: (activo: boolean) => void;
  /** Se está guardando el cambio. */
  guardando?: boolean;
  error?: string | null;
}

/** El enlace del grupo: si deja entrar, cuántos envíos lleva y cómo desactivarlo o reactivarlo. */
export function TarjetaEnlace({ datos, alCambiar, guardando = false, error = null }: TarjetaEnlaceProps) {
  const { activo, enviosUsados, limiteEnvios } = datos;
  const [confirmando, setConfirmando] = useState(false);

  const efecto = activo
    ? 'Si lo desactivas, nadie nuevo podrá entrar ni entregar. Quien ya estaba defendiendo puede terminar.'
    : 'Si lo reactivas, el grupo vuelve a poder entrar y entregar con el mismo enlace.';

  return (
    <TarjetaDeCelestea etiqueta="Enlace del grupo" titulo="Enlace del grupo">
      <div className={styles.cuerpo}>
        <p className={styles.estadoEnlace}>
          <span className={activo ? styles.puntoActivo : styles.puntoInactivo} aria-hidden="true" />
          {activo ? 'Abierto' : 'Desactivado'}
          <span className={styles.detalle}>{`${enviosUsados} de ${limiteEnvios} envíos`}</span>
        </p>
        <p className={styles.detalle}>{efecto}</p>
        {error ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        {confirmando ? (
          <div className={styles.acciones}>
            <Pildora
              alto={44}
              relleno={20}
              letra={15}
              peso={600}
              disabled={guardando}
              onClick={() => {
                alCambiar(!activo);
                setConfirmando(false);
              }}
            >
              {activo ? 'Sí, desactivarlo' : 'Sí, reactivarlo'}
            </Pildora>
            <Pildora variante="contorno" alto={44} relleno={18} letra={15} peso={600} onClick={() => setConfirmando(false)}>
              Cancelar
            </Pildora>
          </div>
        ) : (
          <div className={styles.acciones}>
            <Pildora variante="contorno" alto={44} relleno={20} letra={15} peso={600} disabled={guardando} onClick={() => setConfirmando(true)}>
              {guardando ? 'Guardando…' : activo ? 'Desactivar el enlace' : 'Reactivar el enlace'}
            </Pildora>
          </div>
        )}
      </div>
    </TarjetaDeCelestea>
  );
}
