/**
 * Grabación de la respuesta por partes.
 *
 * MediaRecorder corta el audio cada pocos segundos; cada parte se sube sola, en
 * cuanto sale, así que una red mala no obliga a repetir toda la respuesta y, al
 * pulsar "Listo", casi todo el audio ya está en el servidor. Las partes, juntas y
 * en orden, forman el archivo completo (webm/opus en Android, mp4/aac en iPhone).
 */

export interface ResultadoGrabacion {
  totalPartes: number;
  mime: string;
  duracionMs: number;
}

export interface OpcionesGrabador {
  alParte: (indice: number, parte: Blob) => void;
  alError: (causa: Error) => void;
  /** Cada cuántos milisegundos sale una parte. */
  parteMs?: number;
}

const CANDIDATOS = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus'];

export function mimeDeGrabacion(): string | null {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const candidato of CANDIDATOS) {
    if (MediaRecorder.isTypeSupported(candidato)) return candidato;
  }
  return '';
}

export class Grabador {
  private recorder: MediaRecorder | null = null;
  private indice = 0;
  private inicio = 0;
  private mime = '';
  private terminado = false;

  constructor(
    private readonly stream: MediaStream,
    private readonly opciones: OpcionesGrabador,
  ) {}

  get activo(): boolean {
    return this.recorder !== null && this.recorder.state === 'recording';
  }

  iniciar(): void {
    const preferido = mimeDeGrabacion();
    if (preferido === null) {
      this.opciones.alError(new Error('sin_mediarecorder'));
      return;
    }
    try {
      // 32 kb/s alcanza de sobra para voz y cada parte pesa unos 16 KB: cabe en datos móviles.
      this.recorder = new MediaRecorder(this.stream, {
        ...(preferido ? { mimeType: preferido } : {}),
        audioBitsPerSecond: 32_000,
      });
    } catch (error) {
      this.opciones.alError(error instanceof Error ? error : new Error('no_se_pudo_grabar'));
      return;
    }
    this.mime = this.recorder.mimeType || preferido || 'audio/webm';
    this.recorder.ondataavailable = (evento) => {
      if (evento.data.size === 0) return;
      this.opciones.alParte(this.indice, evento.data);
      this.indice += 1;
    };
    this.recorder.onerror = () => this.opciones.alError(new Error('error_de_grabacion'));
    // Si el micrófono se desconecta o el permiso se revoca, la pista termina.
    this.stream.getAudioTracks().forEach((pista) => {
      pista.onended = () => {
        if (!this.terminado) this.opciones.alError(new Error('microfono_perdido'));
      };
    });
    this.inicio = performance.now();
    this.recorder.start(this.opciones.parteMs ?? 4_000);
  }

  /** Termina la grabación y avisa cuántas partes salieron (la última sale justo al parar). */
  detener(): Promise<ResultadoGrabacion> {
    const recorder = this.recorder;
    this.terminado = true;
    if (!recorder || recorder.state === 'inactive') {
      return Promise.resolve({ totalPartes: this.indice, mime: this.mime, duracionMs: this.duracion() });
    }
    return new Promise((resolver) => {
      recorder.onstop = () => resolver({ totalPartes: this.indice, mime: this.mime, duracionMs: this.duracion() });
      try {
        recorder.stop();
      } catch {
        resolver({ totalPartes: this.indice, mime: this.mime, duracionMs: this.duracion() });
      }
    });
  }

  /** Descarta la grabación en curso sin entregar nada. */
  cancelar(): void {
    this.terminado = true;
    const recorder = this.recorder;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onerror = null;
      recorder.onstop = null;
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Ya estaba parada.
        }
      }
    }
    this.recorder = null;
  }

  private duracion(): number {
    return this.inicio > 0 ? Math.round(performance.now() - this.inicio) : 0;
  }
}
