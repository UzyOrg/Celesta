import 'server-only';
import { obtenerAlmacen } from '../almacen';
import type { AlmacenDefensa } from '../almacen/tipos';
import { crearEmisor, type EmisorEventos } from '../eventos';
import { crearProveedores, type Proveedores } from '../providers';

/**
 * Todo lo que un servicio necesita del mundo exterior, reunido en un objeto para
 * poder cambiarlo en las pruebas: el almacén (base y archivos), los proveedores
 * (modelo, transcripción y voz), el reloj y el emisor de eventos.
 */
export interface Ctx extends AlmacenDefensa {
  proveedores: Proveedores;
  ahora: () => Date;
  eventos: EmisorEventos;
}

export function crearContexto(parcial: Partial<Ctx> = {}): Ctx {
  const almacen = parcial.repo && parcial.archivos ? { repo: parcial.repo, archivos: parcial.archivos } : obtenerAlmacen();
  const ahora = parcial.ahora ?? (() => new Date());
  return {
    repo: almacen.repo,
    archivos: almacen.archivos,
    proveedores: parcial.proveedores ?? crearProveedores(),
    ahora,
    eventos: parcial.eventos ?? crearEmisor(almacen.repo, ahora),
  };
}

/** El contexto de este proceso; los proveedores se leen de las variables de entorno en cada solicitud. */
export function contextoDeSolicitud(): Ctx {
  return crearContexto();
}
