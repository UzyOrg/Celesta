import { Check, MicOff, Volume1 } from 'lucide-react';
import { BarrasDeVoz } from '@/components/celeste/BarrasDeVoz';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaHola.module.css';

/** Cómo va la prueba de cinco segundos. */
export type EstadoPruebaMicrofono = 'escuchando' | 'bien' | 'poco_volumen' | 'ruido' | 'sin_microfono';

interface PantallaHolaProps {
  estado: EstadoPruebaMicrofono;
  /** Las preguntas todavía se están armando. */
  preparandoPreguntas: boolean;
  alEscribir: () => void;
  alSeguir: () => void;
}

export const MENSAJE_DE_LA_PRUEBA: Readonly<Record<Exclude<EstadoPruebaMicrofono, 'escuchando'>, string>> = {
  bien: 'Te oigo bien',
  poco_volumen: 'Te oigo muy bajito. Acércate o escribe.',
  ruido: 'Hay mucho ruido. Busca un lugar más callado o escribe.',
  sin_microfono: 'No pude usar el micrófono. Seguimos por escrito.',
};

/**
 * Paso 8: prueba de micrófono. Se oye cinco segundos y, si hay ruido o poco volumen,
 * avisa con calma y deja escribir. Nada de esto es obligatorio: escribir siempre se puede.
 */
export function PantallaHola({ estado, preparandoPreguntas, alEscribir, alSeguir }: PantallaHolaProps) {
  const mensaje = estado === 'escuchando' ? null : MENSAJE_DE_LA_PRUEBA[estado];
  const aviso = estado !== 'escuchando' && estado !== 'bien';
  const Icono = estado === 'bien' ? Check : estado === 'sin_microfono' ? MicOff : Volume1;

  return (
    <div className={styles.raiz}>
      <Personaje
        tamano={172}
        expresion="escucha"
        movimiento="latir"
        ondas={3}
        ritmoOndas={2.4}
        layoutId="orbe"
      />

      <BarrasDeVoz preset="hola" className={styles.barras} />

      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.2, 0.7)}>
        Di «hola».
      </h1>

      <div role="status" className={styles.estado}>
        {mensaje ? (
          <span key={estado} className={`${styles.oigo} ${aviso ? styles.aviso : ''} ${animaciones.pop}`} style={retraso(0, 0.6)}>
            <Icono size={16} strokeWidth={2.5} aria-hidden="true" />
            {mensaje}
          </span>
        ) : null}
      </div>

      {preparandoPreguntas ? (
        <span className={styles.preparando}>
          Preparando tus preguntas
          <span className={styles.puntos} aria-hidden="true">
            <span className={styles.punto} />
            <span className={styles.punto} style={{ animationDelay: '0.2s' }} />
            <span className={styles.punto} style={{ animationDelay: '0.4s' }} />
          </span>
        </span>
      ) : (
        <span className={styles.preparando}>Tus preguntas están listas</span>
      )}

      <div className={styles.relleno} />

      <div className={styles.acciones}>
        <Boton variante={aviso ? 'primario' : 'contorno'} tamano={56} onClick={alEscribir}>
          Prefiero escribir
        </Boton>
        <Boton variante={aviso ? 'contorno' : 'primario'} tamano={64} onClick={alSeguir}>
          Seguir
        </Boton>
      </div>
    </div>
  );
}
