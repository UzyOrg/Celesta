import Link from 'next/link';
import { Personaje } from '../celeste/Personaje';
import { retraso } from '../celeste/variablesCss';
import animaciones from '../celeste/animaciones.module.css';
import styles from './ActividadNoEncontrada.module.css';

/**
 * Lo que ve el profesor si la actividad o el reporte que pidió no existe.
 * Sin tecnicismos: dice qué pasó y a dónde ir.
 */
export function ActividadNoEncontrada() {
  return (
    <main className={styles.raiz} id="contenido-revision">
      <Personaje tamano={96} expresion="confundido" movimiento="flotar" ritmoParpadeo={4.5} />
      <h1 className={`${styles.titulo} ${animaciones.entra}`} style={retraso(0.2)}>
        No encontramos esta página
      </h1>
      <p className={`${styles.texto} ${animaciones.entra}`} style={retraso(0.3)}>
        Puede que la dirección esté incompleta o que la actividad ya no exista. Vuelve a tus actividades y
        ábrela desde ahí.
      </p>
      <Link href="/revision/demo" className={`${styles.volver} ${animaciones.entra}`} style={retraso(0.4)}>
        Ir a mis actividades
      </Link>
    </main>
  );
}
