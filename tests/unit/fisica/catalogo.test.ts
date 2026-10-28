import { describe, expect, it } from 'vitest';
import { ORBITAS, obtenerOrbita } from '@/lib/fisica';
import { diferenciaMaxima, en, LAGRANGE, ORBITAS_CON_PARAMETROS, orbita, TODAS } from './ayudas';

const NOMBRES: Record<string, string> = {
  lagrange: 'Lagrange',
  'figura-de-ocho': 'Figura de ocho',
  'butterfly-i': 'Butterfly I',
  goggles: 'Goggles',
  'moth-i': 'Moth I',
  'yin-yang-i': 'Yin-Yang I',
};

describe('GRV-02 · criterio 1: catálogo completo', () => {
  it('lista exactamente las seis órbitas, en orden', () => {
    expect(ORBITAS.map((o) => o.slug)).toEqual(TODAS);
  });

  it.each(TODAS)('%s tiene nombre, descripción, crédito y periodo válidos', (slug) => {
    const o = orbita(slug);
    expect(o.nombre).toBe(NOMBRES[slug]);
    expect(o.descripcion.trim().length).toBeGreaterThan(0);
    expect(o.credito.trim().length).toBeGreaterThan(0);
    expect(o.periodo).toBeGreaterThan(0);
  });

  it('devuelve undefined para un slug que no existe', () => {
    expect(obtenerOrbita('no-existe')).toBeUndefined();
  });

  it.each(TODAS)('el estado inicial de %s está congelado y es serializable', (slug) => {
    const inicial = orbita(slug).estadoInicial;
    expect(Object.isFrozen(inicial)).toBe(true);
    expect(inicial).toHaveLength(12);
    expect(JSON.parse(JSON.stringify(inicial))).toEqual(Array.from(inicial));
  });
});

describe('GRV-02 · criterio 2: convención de estado', () => {
  it.each(ORBITAS_CON_PARAMETROS)(
    '$slug parte de (−1, 0), (1, 0), (0, 0) con v1 = v2 y v3 = −2 v1',
    ({ slug, vx, vy }) => {
      const e = orbita(slug).estadoInicial;
      const esperado = [-1, 0, 1, 0, 0, 0, vx, vy, vx, vy, -2 * vx, -2 * vy];
      expect(diferenciaMaxima(e, esperado)).toBe(0);
    },
  );

  it('Lagrange: tres cuerpos a radio 1 en 90°, 210° y 330°, con velocidad tangencial 3^(−1/4)', () => {
    const e = orbita('lagrange').estadoInicial;
    [90, 210, 330].forEach((grados, cuerpo) => {
      const angulo = (grados * Math.PI) / 180;
      const x = en(e, 2 * cuerpo);
      const y = en(e, 2 * cuerpo + 1);
      const vx = en(e, 6 + 2 * cuerpo);
      const vy = en(e, 7 + 2 * cuerpo);
      expect(Math.abs(x - Math.cos(angulo))).toBeLessThanOrEqual(1e-14);
      expect(Math.abs(y - Math.sin(angulo))).toBeLessThanOrEqual(1e-14);
      expect(Math.abs(Math.hypot(vx, vy) - LAGRANGE.omega)).toBeLessThanOrEqual(1e-15);
      expect(Math.abs(x * vx + y * vy)).toBeLessThanOrEqual(1e-14); // tangencial
    });
  });

  it('Lagrange: el periodo es 2π · 3^(1/4)', () => {
    const relativo = Math.abs(orbita('lagrange').periodo - LAGRANGE.periodo) / LAGRANGE.periodo;
    expect(relativo).toBeLessThanOrEqual(1e-15);
  });
});

describe('GRV-02 · criterio 3: datos de la tabla', () => {
  it.each(ORBITAS_CON_PARAMETROS)(
    '$slug coincide exactamente con la tabla',
    ({ slug, vx, vy, periodo }) => {
      const o = orbita(slug);
      expect(o.periodo).toBe(periodo);
      expect(en(o.estadoInicial, 6)).toBe(vx);
      expect(en(o.estadoInicial, 7)).toBe(vy);
    },
  );
});
