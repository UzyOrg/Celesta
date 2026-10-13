import { Personaje } from '@/components/celeste/Personaje';
import { retraso } from '@/components/celeste/variablesCss';
import animaciones from '@/components/celeste/animaciones.module.css';
import styles from './EnlaceNoEncontrado.module.css';

/**
 * Lo que ve el alumno si el enlace de su grupo no existe o ya no está activo.
 * Sin culpas: no dice qué hizo mal, solo qué hacer.
 */
export function EnlaceNoEncontrado() {
  return (
    <main className={styles.raiz} id="contenido-defensa">
      <Personaje tamano={96} expresion="confundido" movimiento="flotar" ritmoParpadeo={4.5} />
      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.2)}>
        No encontramos este enlace
      </h1>
      <p className={`${styles.texto} ${animaciones.entra}`} style={retraso(0.3)}>
        Puede que esté incompleto o que tu profesor ya no lo tenga activo. Pídele uno nuevo y vuelve a abrirlo.
      </p>
    </main>
  );
}
