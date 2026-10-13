import { Check } from 'lucide-react';
import { BarrasDeVoz } from '@/components/celeste/BarrasDeVoz';
import { Boton } from '@/components/celeste/Boton';
import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './PantallaHola.module.css';

interface PantallaHolaProps {
  alEscribir: () => void;
  alSeguir: () => void;
}

/**
 * Paso 8: prueba de micrófono. En este prototipo es una escena: no se pide ni
 * se usa el micrófono (el encabezado de permisos de la app lo bloquea).
 */
export function PantallaHola({ alEscribir, alSeguir }: PantallaHolaProps) {
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
        <span className={`${styles.oigo} ${animaciones.pop}`} style={retraso(1.4, 0.6)}>
          <Check size={16} strokeWidth={2.5} aria-hidden="true" />
          Te oigo bien
        </span>
      </div>

      <span className={styles.preparando}>
        Preparando tus preguntas
        <span className={styles.puntos} aria-hidden="true">
          <span className={styles.punto} />
          <span className={styles.punto} style={{ animationDelay: '0.2s' }} />
          <span className={styles.punto} style={{ animationDelay: '0.4s' }} />
        </span>
      </span>

      <div className={styles.relleno} />

      <div className={styles.acciones}>
        <Boton variante="contorno" tamano={56} onClick={alEscribir}>
          Prefiero escribir
        </Boton>
        <Boton tamano={64} onClick={alSeguir}>
          Seguir
        </Boton>
      </div>
    </div>
  );
}
