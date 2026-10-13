/**
 * Cola de subida de las partes de audio, tolerante a una red que se cae.
 *
 * Sube de una en una y en orden. Si una subida falla por la red la reintenta con espera
 * creciente (1 s, 2 s, 4 s... hasta 30 s) y vuelve a intentar apenas el navegador avisa
 * que hay conexión; lo que el servidor rechaza de verdad (sesión vencida, turno
 * cerrado) no se reintenta. Las partes ya subidas se conservan en memoria hasta que la
 * respuesta se entrega, por si el servidor pide alguna otra vez.
 *
 * Es lógica pura, sin DOM: el envío y la espera se inyectan, y hay pruebas.
 */

export type ResultadoDeSubida = 'listo' | 'reintentar' | 'descartar';

export interface OpcionesCola {
  /** Sube una parte. Debe distinguir una falla de red (`reintentar`) de un rechazo (`descartar`). */
  subir: (indice: number, parte: Blob) => Promise<ResultadoDeSubida>;
  espera?: (ms: number) => Promise<void>;
  /** Espera inicial y tope entre reintentos. */
  esperaBaseMs?: number;
  esperaMaximaMs?: number;
  alCambiar?: () => void;
}

export class ColaSubida {
  private pendientes: Array<{ indice: number; parte: Blob; fallos: number }> = [];
  private readonly retenidas = new Map<number, Blob>();
  private descartadas = 0;
  private corriendo = false;
  private despertar: (() => void) | null = null;
  private generacion = 0;
  private readonly espera: (ms: number) => Promise<void>;

  constructor(private readonly opciones: OpcionesCola) {
    this.espera =
      opciones.espera ??
      ((ms) =>
        new Promise<void>((resolver) => {
          const temporizador = setTimeout(resolver, ms);
          // Si vuelve la red mientras se espera, se despierta antes.
          this.despertar = () => {
            clearTimeout(temporizador);
            resolver();
          };
        }));
  }

  /** Cuántas partes faltan por subir. */
  get faltan(): number {
    return this.pendientes.length;
  }

  /** Cuántas partes el servidor rechazó de verdad (no se van a reintentar). */
  get rechazadas(): number {
    return this.descartadas;
  }

  encolar(indice: number, parte: Blob): void {
    this.retenidas.set(indice, parte);
    this.pendientes.push({ indice, parte, fallos: 0 });
    this.opciones.alCambiar?.();
    void this.procesar();
  }

  /** Vuelve a subir partes que el servidor dijo que le faltan. */
  reenviar(indices: readonly number[]): number {
    let reenviadas = 0;
    for (const indice of indices) {
      const parte = this.retenidas.get(indice);
      if (parte && !this.pendientes.some((p) => p.indice === indice)) {
        this.pendientes.push({ indice, parte, fallos: 0 });
        reenviadas += 1;
      }
    }
    if (reenviadas > 0) void this.procesar();
    return reenviadas;
  }

  /** Avisa que hay conexión otra vez: reintenta ya, sin esperar el resto de la pausa. */
  hayRed(): void {
    this.despertar?.();
  }

  /** Espera a que no quede nada por subir. `false` si pasó el tiempo y siguen faltando partes. */
  async vaciar(timeoutMs: number): Promise<boolean> {
    const limite = Date.now() + timeoutMs;
    while (this.pendientes.length > 0 || this.corriendo) {
      if (Date.now() >= limite) return false;
      await new Promise<void>((resolver) => setTimeout(resolver, 50));
    }
    return true;
  }

  /** Se acabó la respuesta (se entregó o se descartó): suelta todo. */
  limpiar(): void {
    this.generacion += 1;
    this.pendientes = [];
    this.retenidas.clear();
    this.descartadas = 0;
    this.despertar?.();
    this.opciones.alCambiar?.();
  }

  private async procesar(): Promise<void> {
    if (this.corriendo) return;
    this.corriendo = true;
    const generacion = this.generacion;
    try {
      while (this.pendientes.length > 0 && generacion === this.generacion) {
        const siguiente = this.pendientes[0] as { indice: number; parte: Blob; fallos: number };
        let resultado: ResultadoDeSubida;
        try {
          resultado = await this.opciones.subir(siguiente.indice, siguiente.parte);
        } catch {
          resultado = 'reintentar';
        }
        if (generacion !== this.generacion) return;
        if (resultado === 'listo') {
          this.pendientes.shift();
        } else if (resultado === 'descartar') {
          this.pendientes.shift();
          this.descartadas += 1;
        } else {
          siguiente.fallos += 1;
          const base = this.opciones.esperaBaseMs ?? 1_000;
          const tope = this.opciones.esperaMaximaMs ?? 30_000;
          await this.espera(Math.min(tope, base * 2 ** Math.min(siguiente.fallos - 1, 10)));
        }
        this.opciones.alCambiar?.();
      }
    } finally {
      this.corriendo = false;
    }
  }
}
