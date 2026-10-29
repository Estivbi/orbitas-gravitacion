import { SLUGS, type Slug } from '@/lib/fisica/tipos';

/** `etiqueta` es el texto llano del selector; `aviso` lo anuncia a los lectores de pantalla. */
export const ORDENES = [
  { id: 'catalogo', etiqueta: 'Catálogo', aviso: 'Galería ordenada por catálogo.' },
  {
    id: 'periodo',
    etiqueta: 'Duración de la vuelta',
    aviso: 'Galería ordenada por duración de la vuelta.',
  },
  {
    id: 'energia',
    etiqueta: 'Más ligadas',
    aviso: 'Galería ordenada con las órbitas más ligadas primero.',
  },
] as const;

export type OrdenGaleria = (typeof ORDENES)[number]['id'];

export const ORDEN_INICIAL: OrdenGaleria = 'catalogo';

export function esOrden(valor: unknown): valor is OrdenGaleria {
  return ORDENES.some((orden) => orden.id === valor);
}

export interface ClaveDeOrden {
  slug: Slug;
  periodo: number;
  energia: number;
}

export interface ResumenOrbita extends ClaveDeOrden {
  nombre: string;
}

const indiceEnCatalogo = (slug: Slug): number => SLUGS.indexOf(slug);

/**
 * Ordena sin mutar la entrada (que puede estar congelada). `catalogo` sigue el orden de `SLUGS`;
 * `periodo` y `energia` son ascendentes (la más ligada primero) y los empates se resuelven por
 * el índice en `SLUGS`.
 */
export function ordenarGaleria<T extends ClaveDeOrden>(
  orden: OrdenGaleria,
  items: readonly T[],
): T[] {
  const porCatalogo = (a: T, b: T) => indiceEnCatalogo(a.slug) - indiceEnCatalogo(b.slug);
  const comparar =
    orden === 'catalogo' ? porCatalogo : (a: T, b: T) => a[orden] - b[orden] || porCatalogo(a, b);
  return [...items].sort(comparar);
}

/** «Galería ordenada por duración de la vuelta.» */
export function avisoDeOrden(orden: OrdenGaleria): string {
  return ORDENES.find((o) => o.id === orden)?.aviso ?? '';
}
