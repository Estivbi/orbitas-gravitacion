import { describe, expect, it } from 'vitest';
import { SLUGS, type Slug } from '@/lib/fisica';
import {
  ETIQUETA_SOLUCION,
  FRASE_ORBITA,
  RUTA_GALERIA,
  rutaDeOrbita,
  vecinas,
} from '@/lib/galeria/navegacion';

describe('GRV-04 · criterio 2: navegación y etiquetas', () => {
  it('vecinas de Lagrange, Goggles y Yin-Yang I (los extremos son cíclicos)', () => {
    expect(vecinas('lagrange')).toEqual({ anterior: 'yin-yang-i', siguiente: 'figura-de-ocho' });
    expect(vecinas('yin-yang-i')).toEqual({ anterior: 'moth-i', siguiente: 'lagrange' });
    expect(vecinas('goggles')).toEqual({ anterior: 'butterfly-i', siguiente: 'moth-i' });
  });

  it('vecinas de las otras tres siguen el orden del catálogo', () => {
    expect(vecinas('figura-de-ocho')).toEqual({ anterior: 'lagrange', siguiente: 'butterfly-i' });
    expect(vecinas('butterfly-i')).toEqual({ anterior: 'figura-de-ocho', siguiente: 'goggles' });
    expect(vecinas('moth-i')).toEqual({ anterior: 'goggles', siguiente: 'yin-yang-i' });
  });

  it.each([...SLUGS])(
    '%s: la siguiente de la anterior y la anterior de la siguiente son ella',
    (slug) => {
      const { anterior, siguiente } = vecinas(slug);
      expect(vecinas(anterior).siguiente).toBe(slug);
      expect(vecinas(siguiente).anterior).toBe(slug);
      expect(anterior).not.toBe(slug);
      expect(siguiente).not.toBe(slug);
    },
  );

  it('recorrer las siguientes desde cualquier órbita pasa por las seis y vuelve', () => {
    let actual: Slug = 'lagrange';
    const vistas: Slug[] = [];
    for (let i = 0; i < 6; i++) {
      vistas.push(actual);
      actual = vecinas(actual).siguiente;
    }
    expect(vistas).toEqual([...SLUGS]);
    expect(actual).toBe('lagrange');
  });

  it('las rutas son /orbitas/<slug> y la de la galería es /#galeria', () => {
    expect(rutaDeOrbita('figura-de-ocho')).toBe('/orbitas/figura-de-ocho');
    for (const slug of SLUGS) {
      expect(rutaDeOrbita(slug)).toBe(`/orbitas/${slug}`);
    }
    expect(RUTA_GALERIA).toBe('/#galeria');
  });

  it('la etiqueta de la solución: exacta, estable o hallada en 2013', () => {
    expect(ETIQUETA_SOLUCION.lagrange).toBe('Solución exacta');
    expect(ETIQUETA_SOLUCION['figura-de-ocho']).toBe('Estable');
    for (const slug of ['butterfly-i', 'goggles', 'moth-i', 'yin-yang-i'] as const) {
      expect(ETIQUETA_SOLUCION[slug]).toBe('Hallada en 2013');
    }
    expect(Object.keys(ETIQUETA_SOLUCION).sort()).toEqual([...SLUGS].sort());
  });

  it('cada órbita tiene una frase llana para su tarjeta', () => {
    expect(Object.keys(FRASE_ORBITA).sort()).toEqual([...SLUGS].sort());
    expect(FRASE_ORBITA.lagrange).toBe('Tres cuerpos en un triángulo que gira.');
    expect(FRASE_ORBITA['figura-de-ocho']).toBe('Se persiguen formando un 8.');
    for (const slug of SLUGS) {
      expect(FRASE_ORBITA[slug]).toMatch(/\.$/);
    }
  });
});
