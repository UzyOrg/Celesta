/**
 * Reproductor de la voz de Celestea y del audio original.
 *
 * El audio solo empieza después de un toque (iOS lo exige): `desbloquear()` se llama
 * dentro del primer toque —"Empezar defensa", "Ensayar primero"— y, una vez desbloqueado,
 * ese mismo elemento puede reproducir las preguntas siguientes sin otro toque. Si el
 * navegador igual lo bloquea, la pregunta sigue escrita en pantalla y "Repetir pregunta"
 * (que es otro toque) la vuelve a decir.
 */

export type ResultadoReproduccion = 'termino' | 'bloqueado' | 'error' | 'detenido';

// Un WAV de una muestra en silencio: basta para que el navegador dé por iniciado el audio.
const SILENCIO =
  'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQIAAAAAAA==';

export class Reproductor {
  private elemento: HTMLAudioElement | null = null;
  private finalizar: ((resultado: ResultadoReproduccion) => void) | null = null;

  private obtener(): HTMLAudioElement {
    if (!this.elemento) {
      this.elemento = new Audio();
      this.elemento.preload = 'auto';
    }
    return this.elemento;
  }

  /** Llamar DENTRO de un toque del alumno. Devuelve si el navegador dejó empezar el audio. */
  async desbloquear(): Promise<boolean> {
    try {
      const elemento = this.obtener();
      elemento.src = SILENCIO;
      elemento.muted = true;
      await elemento.play();
      elemento.pause();
      elemento.muted = false;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Reproduce una dirección; termina cuando acaba el audio, falla o se llama a `detener()`.
   * `alSonar` avisa cuando el sonido de verdad empieza (con red lenta, pedirlo y oírlo no son lo mismo).
   */
  reproducir(url: string, tramo?: { desdeMs: number; hastaMs: number }, alSonar?: () => void): Promise<ResultadoReproduccion> {
    this.detener();
    const elemento = this.obtener();
    return new Promise((resolver) => {
      let resuelto = false;
      const terminar = (resultado: ResultadoReproduccion) => {
        if (resuelto) return;
        resuelto = true;
        elemento.removeEventListener('ended', alTerminar);
        elemento.removeEventListener('error', alFallar);
        elemento.removeEventListener('timeupdate', alAvanzar);
        elemento.removeEventListener('loadedmetadata', alCargar);
        elemento.removeEventListener('playing', alEmpezar);
        this.finalizar = null;
        if (resultado !== 'termino') elemento.pause();
        resolver(resultado);
      };
      const alTerminar = () => terminar('termino');
      const alFallar = () => terminar('error');
      const alEmpezar = () => {
        elemento.removeEventListener('playing', alEmpezar);
        if (!resuelto) alSonar?.();
      };
      const alAvanzar = () => {
        if (tramo && elemento.currentTime * 1000 >= tramo.hastaMs) {
          elemento.pause();
          terminar('termino');
        }
      };
      const arrancar = () => {
        elemento.play().catch((error: unknown) => {
          const nombre = error instanceof DOMException ? error.name : '';
          terminar(nombre === 'NotAllowedError' ? 'bloqueado' : 'error');
        });
      };
      const alCargar = () => {
        if (tramo) elemento.currentTime = Math.max(0, tramo.desdeMs) / 1000;
        arrancar();
      };

      this.finalizar = terminar;
      elemento.addEventListener('ended', alTerminar);
      elemento.addEventListener('error', alFallar);
      if (alSonar) elemento.addEventListener('playing', alEmpezar);
      if (tramo) elemento.addEventListener('timeupdate', alAvanzar);
      elemento.muted = false;
      elemento.src = url;
      if (tramo) {
        elemento.addEventListener('loadedmetadata', alCargar, { once: true });
        elemento.load();
      } else {
        arrancar();
      }
    });
  }

  detener(): void {
    this.finalizar?.('detenido');
    this.elemento?.pause();
  }

  liberar(): void {
    this.detener();
    if (this.elemento) {
      this.elemento.removeAttribute('src');
      this.elemento.load();
      this.elemento = null;
    }
  }
}
