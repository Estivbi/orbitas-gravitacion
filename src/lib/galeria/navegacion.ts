import { SLUGS, type Slug } from '@/lib/fisica/tipos';

export const RUTA_GALERIA = '/#galeria';

export function rutaDeOrbita(slug: Slug): string {
  return `/orbitas/${slug}`;
}

/** Órbita anterior y siguiente en el orden del catálogo, de forma cíclica. */
export function vecinas(slug: Slug): { anterior: Slug; siguiente: Slug } {
  const indice = SLUGS.indexOf(slug);
  const total = SLUGS.length;
  return {
    anterior: SLUGS[(indice - 1 + total) % total]!,
    siguiente: SLUGS[(indice + 1) % total]!,
  };
}

export const ETIQUETA_SOLUCION: Readonly<Record<Slug, string>> = {
  lagrange: 'Solución exacta',
  'figura-de-ocho': 'Estable',
  'butterfly-i': 'Hallada en 2013',
  goggles: 'Hallada en 2013',
  'moth-i': 'Hallada en 2013',
  'yin-yang-i': 'Hallada en 2013',
};
