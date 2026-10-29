import { describe, expect, it } from 'vitest';
import { ORBITAS, SLUGS, type Slug } from '@/lib/fisica';
import {
  ORDENES,
  ORDEN_INICIAL,
  avisoDeOrden,
  esOrden,
  ordenarGaleria,
  type ResumenOrbita,
} from '@/lib/galeria/orden';
import { energiaDe } from '../fisica/ayudas';

/** Resumen de las seis órbitas con la energía calculada aquí, con la fórmula independiente de las pruebas. */
const RESUMENES: readonly ResumenOrbita[] = ORBITAS.map((orbita) => ({
  slug: orbita.slug,
  nombre: orbita.nombre,
  periodo: orbita.periodo,
  energia: energiaDe(orbita.estadoInicial),
}));

const CATALOGO: Slug[] = [
  'lagrange',
  'figura-de-ocho',
  'butterfly-i',
  'goggles',
  'moth-i',
  'yin-yang-i',
];
const POR_PERIODO: Slug[] = [
  'butterfly-i',
  'figura-de-ocho',
  'lagrange',
  'goggles',
  'moth-i',
  'yin-yang-i',
];
const POR_ENERGIA: Slug[] = [
  'goggles',
  'butterfly-i',
  'yin-yang-i',
  'moth-i',
  'figura-de-ocho',
  'lagrange',
];

const slugsDe = (items: readonly { slug: Slug }[]) => items.map((item) => item.slug);

/** Permutaciones fijas (sin azar) de la entrada: invertida, rotada y barajada a mano. */
const ENTRADAS: [string, readonly ResumenOrbita[]][] = [
  ['en orden de catálogo', RESUMENES],
  ['invertida', [...RESUMENES].reverse()],
  ['rotada', [...RESUMENES.slice(2), ...RESUMENES.slice(0, 2)]],
  ['barajada', [4, 1, 5, 0, 3, 2].map((i) => RESUMENES[i]!) as readonly ResumenOrbita[]],
];

describe('GRV-04 · criterio 1: orden de la galería', () => {
  it('el catálogo del que parten las pruebas tiene el orden esperado', () => {
    expect([...SLUGS]).toEqual(CATALOGO);
    expect(slugsDe(RESUMENES)).toEqual(CATALOGO);
  });

  it.each(ENTRADAS)('catalogo ordena como SLUGS con la entrada %s', (_, entrada) => {
    expect(slugsDe(ordenarGaleria('catalogo', entrada))).toEqual(CATALOGO);
  });

  it.each(ENTRADAS)('periodo ordena de menor a mayor con la entrada %s', (_, entrada) => {
    expect(slugsDe(ordenarGaleria('periodo', entrada))).toEqual(POR_PERIODO);
  });

  it.each(ENTRADAS)(
    'energia ordena de la más ligada a la menos con la entrada %s',
    (_, entrada) => {
      expect(slugsDe(ordenarGaleria('energia', entrada))).toEqual(POR_ENERGIA);
    },
  );

  it('los órdenes por periodo y energía son ascendentes en el valor, no solo en los nombres', () => {
    const periodos = ordenarGaleria('periodo', RESUMENES).map((r) => r.periodo);
    expect(periodos).toEqual([...periodos].sort((a, b) => a - b));
    const energias = ordenarGaleria('energia', RESUMENES).map((r) => r.energia);
    expect(energias).toEqual([...energias].sort((a, b) => a - b));
    expect(energias[0]).toBeLessThan(energias[5]!);
  });

  it('conserva los demás campos de cada elemento y devuelve los mismos objetos', () => {
    const ordenados = ordenarGaleria('energia', RESUMENES);
    for (const item of ordenados) {
      expect(RESUMENES).toContain(item);
    }
    expect(ordenados.map((item) => item.nombre)).toEqual(
      POR_ENERGIA.map((slug) => RESUMENES.find((r) => r.slug === slug)!.nombre),
    );
  });

  it.each(['catalogo', 'periodo', 'energia'] as const)(
    'con %s, los empates se resuelven por el índice en SLUGS aunque entren al revés',
    (orden) => {
      const iguales = [...CATALOGO].reverse().map((slug) => ({ slug, periodo: 7, energia: -1 }));
      expect(slugsDe(ordenarGaleria(orden, iguales))).toEqual(CATALOGO);

      const dos = [
        { slug: 'figura-de-ocho' as const, periodo: 5, energia: -2 },
        { slug: 'lagrange' as const, periodo: 5, energia: -2 },
      ];
      expect(slugsDe(ordenarGaleria(orden, dos))).toEqual(['lagrange', 'figura-de-ocho']);
    },
  );

  it('un empate no altera el orden respecto a los que no empatan', () => {
    const entrada = [
      { slug: 'yin-yang-i' as const, periodo: 5, energia: -1 },
      { slug: 'moth-i' as const, periodo: 9, energia: -1 },
      { slug: 'goggles' as const, periodo: 5, energia: -1 },
      { slug: 'lagrange' as const, periodo: 1, energia: -1 },
    ];
    expect(slugsDe(ordenarGaleria('periodo', entrada))).toEqual([
      'lagrange',
      'goggles',
      'yin-yang-i',
      'moth-i',
    ]);
    expect(slugsDe(ordenarGaleria('energia', entrada))).toEqual([
      'lagrange',
      'goggles',
      'moth-i',
      'yin-yang-i',
    ]);
  });

  it.each(['catalogo', 'periodo', 'energia'] as const)(
    'con %s no muta la entrada, ni congelada, y devuelve un array distinto',
    (orden) => {
      const barajada = [3, 0, 5, 2, 4, 1].map((i) => RESUMENES[i]!);
      const copia = [...barajada];
      const congelada = Object.freeze([...barajada]);

      const resultado = ordenarGaleria(orden, congelada);
      expect(resultado).not.toBe(congelada);
      expect(resultado).toHaveLength(6);
      expect(congelada).toEqual(copia);

      const sinCongelar = [...barajada];
      const otro = ordenarGaleria(orden, sinCongelar);
      expect(otro).not.toBe(sinCongelar);
      expect(sinCongelar).toEqual(copia);
      expect(sinCongelar.map((item) => item.slug)).toEqual(copia.map((item) => item.slug));
    },
  );

  it('con la entrada ya ordenada devuelve igualmente un array nuevo', () => {
    for (const orden of ['catalogo', 'periodo', 'energia'] as const) {
      const ya = ordenarGaleria(orden, RESUMENES);
      const otra = ordenarGaleria(orden, ya);
      expect(otra).not.toBe(ya);
      expect(otra).toEqual(ya);
    }
  });

  it('una entrada vacía da un array vacío', () => {
    expect(ordenarGaleria('periodo', [])).toEqual([]);
  });

  it('ORDENES tiene exactamente los tres órdenes, con sus etiquetas', () => {
    expect(ORDENES.map((o) => o.id)).toEqual(['catalogo', 'periodo', 'energia']);
    expect(ORDENES.map((o) => o.etiqueta)).toEqual([
      'Catálogo',
      'Duración de la vuelta',
      'Más ligadas',
    ]);
    expect(ORDENES).toHaveLength(3);
  });

  it('el orden inicial es el catálogo', () => {
    expect(ORDEN_INICIAL).toBe('catalogo');
  });

  it('avisoDeOrden anuncia el orden elegido con el texto llano del selector', () => {
    expect(avisoDeOrden('energia')).toBe('Galería ordenada con las órbitas más ligadas primero.');
    expect(avisoDeOrden('periodo')).toBe('Galería ordenada por duración de la vuelta.');
    expect(avisoDeOrden('catalogo')).toBe('Galería ordenada por catálogo.');
  });

  it('esOrden acepta solo los tres identificadores', () => {
    expect(esOrden('precio')).toBe(false);
    expect(esOrden('Periodo')).toBe(false);
    expect(esOrden('')).toBe(false);
    expect(esOrden(undefined)).toBe(false);
    expect(esOrden(null)).toBe(false);
    expect(esOrden(2)).toBe(false);
    expect(esOrden({ id: 'periodo' })).toBe(false);
    for (const id of ['catalogo', 'periodo', 'energia']) {
      expect(esOrden(id)).toBe(true);
    }
  });
});
