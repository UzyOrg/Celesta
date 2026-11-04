'use client';

import { useId } from 'react';
import { X } from 'lucide-react';
import { Boton } from '@/components/celeste/Boton';
import { Dialogo } from '@/components/celeste/Dialogo';
import styles from './DialogoPrivacidad.module.css';

interface DialogoPrivacidadProps {
  abierto: boolean;
  alCerrar: () => void;
}

/**
 * Datos del responsable (art. 15 de la Ley). Mientras tengan corchetes el aviso es un borrador:
 * no uses datos reales. Se llenan aquí, en un solo lugar (ver `docs/legal/`).
 */
const RESPONSABLE = '[NOMBRE LEGAL DEL RESPONSABLE]';
const DOMICILIO = '[DOMICILIO]';
const CORREO_PRIVACIDAD = '[CORREO DE PRIVACIDAD]';
const AVISO_INTEGRAL = '[URL DEL AVISO INTEGRAL]';

/**
 * Aviso simplificado, en lenguaje llano (`docs/legal/aviso-privacidad-simplificado.md`).
 * Borrador pendiente de revisión legal: al cambiar el texto, sube `AVISO_PRIVACIDAD_VERSION`.
 */
const PUNTOS: readonly { titulo: string; texto: string }[] = [
  {
    titulo: 'Quién trata tus datos',
    texto: `Celestea, de ${RESPONSABLE}, con domicilio en ${DOMICILIO}.`,
  },
  {
    titulo: 'Qué datos',
    texto:
      'Tu nombre y matrícula, tu trabajo, tu voz si eliges hablar, tus respuestas y, si quieres, cuánto estrés te dio. No usamos cámara. No te pedimos datos sensibles (salud, religión, política): no los pongas si no hacen falta. Si aparecen, los tratamos solo para tu defensa.',
  },
  {
    titulo: 'Para qué',
    texto: 'Para hacer tu defensa y preparar el reporte de tu profesor. Nada más: sin publicidad. No hay ninguna finalidad que necesite un permiso extra.',
  },
  {
    titulo: 'Quién lo recibe',
    texto:
      'Tu profesor y tu universidad reciben tu reporte, tu transcripción y tu trabajo, y el audio solo de lo que marques. Proveedores de IA, voz y almacenamiento, muchos en EE. UU., tratan los datos por nuestra cuenta. Celestea no vende tus datos ni entrena IA con ellos.',
  },
  {
    titulo: 'Cuánto tiempo',
    texto: 'Tu audio se borra a los 7 días. Lo demás, hasta 90 días después de que cierre el grupo.',
  },
  {
    titulo: 'Esto es una IA',
    texto: 'Hablas con una inteligencia artificial. No te califica: decide tu profesor. Tu trabajo cuenta como entregado desde que llega.',
  },
  {
    titulo: 'Tus derechos',
    texto: `Puedes pedir ver, corregir, cancelar u oponerte al uso de tus datos, y retirar tu permiso, escribiendo a ${CORREO_PRIVACIDAD}. Es gratis. Puedes escribir en vez de hablar y omitir la pregunta del estrés. Si no aceptas, tu trabajo cuenta igual y tu profesor te ofrece otra forma de mostrar lo que sabes.`,
  },
  {
    titulo: 'Aviso completo',
    texto: AVISO_INTEGRAL,
  },
];

/** Hoja con el aviso de privacidad resumido (se abre desde "Tres sí y seguimos"). */
export function DialogoPrivacidad({ abierto, alCerrar }: DialogoPrivacidadProps) {
  const idTitulo = useId();

  return (
    <Dialogo abierto={abierto} alCerrar={alCerrar} etiquetadoPor={idTitulo} forma="hoja">
      <div className={styles.contenido}>
        <div className={styles.encabezado}>
          <h2 id={idTitulo} className={styles.titulo}>
            Aviso de privacidad
          </h2>
          <button type="button" className={styles.cerrar} aria-label="Cerrar aviso" onClick={alCerrar}>
            <X size={22} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>

        <dl className={styles.lista}>
          {PUNTOS.map((punto) => (
            <div key={punto.titulo} className={styles.punto}>
              <dt className={styles.puntoTitulo}>{punto.titulo}</dt>
              <dd className={styles.puntoTexto}>{punto.texto}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.nota}>Borrador pendiente de revisión legal: úsalo solo con datos ficticios.</p>

        <Boton tamano={64} onClick={alCerrar}>
          Entendido
        </Boton>
      </div>
    </Dialogo>
  );
}
