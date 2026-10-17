import { Mic, MicOff } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './AvisoDeMicrofono.module.css';

interface AvisoDeMicrofonoProps {
  /** Por qué no se puede hablar y qué hacer, en español y sin culpa (ver `mensajeDeMicrofono`). */
  mensaje: string;
  /** Cuántas veces se intentó hablar otra vez sin que funcionara: al subir, el aviso lo hace notar. */
  reintentos: number;
  /** Se está pidiendo el micrófono (el navegador puede estar mostrando su ventana de permiso). */
  probando: boolean;
  alProbar: () => void;
}

/**
 * Lo que ve quien eligió hablar pero responde escribiendo porque el micrófono falló: por qué pasó y
 * un toque para volver a la voz. No bloquea nada; la respuesta escrita sigue en la misma pantalla.
 *
 * El texto es una región de estado: si el intento no funciona, el cambio ("Sigue sin abrir.") se anuncia
 * y el icono hace un pequeño rebote, para que se note que el toque sí se recibió.
 */
export function AvisoDeMicrofono({ mensaje, reintentos, probando, alProbar }: AvisoDeMicrofonoProps) {
  return (
    <div className={styles.aviso}>
      <p role="status" className={styles.texto}>
        <MicOff
          key={reintentos}
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className={`${styles.icono} ${reintentos > 0 ? animaciones.pop : ''}`}
          style={reintentos > 0 ? retraso(0, 0.4) : undefined}
        />
        <span>{reintentos > 0 ? `Sigue sin abrir. ${mensaje}` : mensaje}</span>
      </p>
      <Boton
        variante="tarjeta"
        tamano={44}
        icono={<Mic size={16} strokeWidth={2} />}
        aria-disabled={probando}
        aria-busy={probando}
        onClick={() => {
          if (!probando) alProbar();
        }}
      >
        {probando ? 'Probando…' : 'Probar el micrófono otra vez'}
      </Boton>
    </div>
  );
}
