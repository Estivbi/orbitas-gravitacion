import { esSlug, integrarPeriodo, obtenerOrbita, type Slug, type Trayectoria } from '@/lib/fisica';

export type Peticion = { tipo: 'calcular'; id: number; slug: Slug };

export type Respuesta =
  | { tipo: 'resultado'; id: number; slug: Slug; trayectoria: Trayectoria }
  | { tipo: 'error'; id: number | null; mensaje: string };

function error(id: number | null, mensaje: string): Respuesta {
  return { tipo: 'error', id, mensaje };
}

/**
 * Atiende una petición del hilo principal. Es pura y no lanza: ante una petición mal formada
 * o un fallo de cálculo devuelve una respuesta de error con el `id` si se conoce.
 */
export function manejarPeticion(peticion: unknown): Respuesta {
  if (typeof peticion !== 'object' || peticion === null) {
    return error(null, 'La petición debe ser un objeto');
  }
  const { tipo, id, slug } = peticion as Record<string, unknown>;
  const idConocido = typeof id === 'number' && Number.isFinite(id) ? id : null;

  if (idConocido === null) {
    return error(null, 'La petición no trae un id numérico');
  }
  if (tipo !== 'calcular') {
    return error(idConocido, `Tipo de petición desconocido: ${String(tipo)}`);
  }
  if (typeof slug !== 'string') {
    return error(idConocido, 'El slug de la órbita debe ser una cadena');
  }
  const orbita = esSlug(slug) ? obtenerOrbita(slug) : undefined;
  if (!orbita) {
    return error(idConocido, `La órbita «${slug}» no existe en el catálogo`);
  }

  try {
    return {
      tipo: 'resultado',
      id: idConocido,
      slug: orbita.slug,
      trayectoria: integrarPeriodo(orbita),
    };
  } catch (causa) {
    return error(
      idConocido,
      causa instanceof Error ? causa.message : 'Error desconocido al calcular',
    );
  }
}
