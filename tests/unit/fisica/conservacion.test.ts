import { describe, expect, it } from 'vitest';
import { integrarPeriodo } from '@/lib/fisica';
import {
  diferenciaMaxima,
  energiaDe,
  LAGRANGE,
  momentoAngularDe,
  momentoLinealDe,
  nodo,
  numeroDeNodos,
  ORBITAS_CON_PARAMETROS,
  orbita,
  TODAS,
  trayectoriaDe,
} from './ayudas';

const CIERRES = [
  { slug: LAGRANGE.slug, tolerancia: LAGRANGE.cierre },
  ...ORBITAS_CON_PARAMETROS.map(({ slug, cierre }) => ({ slug, tolerancia: cierre })),
];

describe('GRV-02 · criterio 4: momento lineal', () => {
  it.each(TODAS)('%s conserva el momento lineal en todos los nodos', (slug) => {
    const t = trayectoriaDe(slug);
    for (let i = 0; i < numeroDeNodos(t); i++) {
      expect(momentoLinealDe(nodo(t, i))).toBeLessThanOrEqual(1e-12);
    }
  });
});

describe('GRV-02 · criterio 5: energía', () => {
  it.each(TODAS)('%s conserva la energía en todos los nodos', (slug) => {
    const t = trayectoriaDe(slug);
    const inicial = energiaDe(nodo(t, 0));
    let deriva = 0;
    for (let i = 0; i < numeroDeNodos(t); i++) {
      deriva = Math.max(deriva, Math.abs(energiaDe(nodo(t, i)) - inicial));
    }
    expect(deriva).toBeLessThanOrEqual(1e-6);
  });

  it.each(ORBITAS_CON_PARAMETROS)(
    'la energía inicial de $slug coincide con la tabla',
    ({ slug, energia }) => {
      expect(
        Math.abs(energiaDe(trayectoriaDe(slug).estados.subarray(0, 12)) - energia),
      ).toBeLessThanOrEqual(1e-5);
    },
  );

  it('la energía de Lagrange es −√3/2', () => {
    const e = trayectoriaDe('lagrange').estados.subarray(0, 12);
    expect(Math.abs(energiaDe(e) - LAGRANGE.energia)).toBeLessThanOrEqual(1e-12);
  });
});

describe('GRV-02 · criterio 6: momento angular', () => {
  it.each(ORBITAS_CON_PARAMETROS)('$slug parte con momento angular nulo', ({ slug }) => {
    expect(
      Math.abs(momentoAngularDe(trayectoriaDe(slug).estados.subarray(0, 12))),
    ).toBeLessThanOrEqual(1e-12);
  });

  it('Lagrange parte con momento angular 3 · 3^(−1/4)', () => {
    const l = momentoAngularDe(trayectoriaDe('lagrange').estados.subarray(0, 12));
    expect(Math.abs(l - LAGRANGE.momentoAngular)).toBeLessThanOrEqual(1e-12);
  });

  it.each(TODAS)('%s conserva el momento angular en todos los nodos', (slug) => {
    const t = trayectoriaDe(slug);
    const inicial = momentoAngularDe(nodo(t, 0));
    let deriva = 0;
    for (let i = 0; i < numeroDeNodos(t); i++) {
      deriva = Math.max(deriva, Math.abs(momentoAngularDe(nodo(t, i)) - inicial));
    }
    expect(deriva).toBeLessThanOrEqual(1e-9);
  });
});

describe('GRV-02 · criterio 7: cierre tras un periodo', () => {
  it.each(CIERRES)(
    '$slug vuelve al estado inicial dentro de $tolerancia',
    ({ slug, tolerancia }) => {
      const t = trayectoriaDe(slug);
      const final = nodo(t, numeroDeNodos(t) - 1);
      expect(diferenciaMaxima(final, orbita(slug).estadoInicial)).toBeLessThanOrEqual(tolerancia);
    },
  );
});

describe('GRV-02 · criterio 8: determinismo', () => {
  const bytes = (a: Float64Array) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);

  it('dos integraciones idénticas dan los mismos bits, también en otro orden', () => {
    const [a, b] = [orbita('goggles'), orbita('moth-i')];
    const primera = [integrarPeriodo(a), integrarPeriodo(b)];
    const segunda = [integrarPeriodo(b), integrarPeriodo(a)].reverse();

    primera.forEach((t, i) => {
      const otra = segunda[i];
      if (!otra) {
        throw new Error('Falta la segunda trayectoria');
      }
      expect(bytes(otra.tiempos).equals(bytes(t.tiempos))).toBe(true);
      expect(bytes(otra.estados).equals(bytes(t.estados))).toBe(true);
    });
  });
});
