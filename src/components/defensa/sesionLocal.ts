/**
 * La sesión del alumno guardada en su teléfono, para retomar la defensa si se cae la
 * red, se cierra la pestaña o se recarga la página.
 *
 * Solo guarda la sesión firmada (que caduca a las 48 horas) y el modo que eligió, por
 * actividad. No guarda el trabajo, las respuestas ni la transcripción: eso vive en el
 * servidor. Todo está envuelto en try/catch porque el almacenamiento puede estar
 * bloqueado (navegación privada, "borrar datos"): sin él, la defensa funciona igual y
 * solo se pierde el atajo de retomar sin volver a poner nombre y matrícula.
 */

export interface SesionGuardada {
  sesion: string;
  expiraEn: number;
  nombre: string;
  matricula: string;
  modo: 'voz' | 'escrito';
}

const clave = (token: string) => `celestea-defensa-sesion-${token}`;

export function leerSesion(token: string, ahora: number = Date.now()): SesionGuardada | null {
  try {
    const crudo = window.localStorage.getItem(clave(token));
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as Partial<SesionGuardada>;
    if (
      typeof dato.sesion !== 'string' ||
      typeof dato.expiraEn !== 'number' ||
      typeof dato.nombre !== 'string' ||
      typeof dato.matricula !== 'string' ||
      (dato.modo !== 'voz' && dato.modo !== 'escrito') ||
      dato.expiraEn <= ahora
    ) {
      borrarSesion(token);
      return null;
    }
    return dato as SesionGuardada;
  } catch {
    return null;
  }
}

export function guardarSesion(token: string, dato: SesionGuardada): void {
  try {
    window.localStorage.setItem(clave(token), JSON.stringify(dato));
  } catch {
    // Sin almacenamiento: la defensa sigue, solo que no se podrá retomar sola.
  }
}

export function borrarSesion(token: string): void {
  try {
    window.localStorage.removeItem(clave(token));
  } catch {
    // Nada que borrar.
  }
}
