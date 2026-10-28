import { describe, expect, it } from 'vitest';
import { estadoEn, indiceEn, integrarPeriodo, muestrear } from '@/lib/fisica';
import { diferenciaMaxima, en, nodo, numeroDeNodos, orbita, TODAS, trayectoriaDe } from './ayudas';

describe('GRV-02 · criterio 10: interpolación', () => {
  it.each(TODAS)('%s: en u = 0 devuelve el estado inicial exactamente', (slug) => {
    const t = trayectoriaDe(slug);
    expect(diferenciaMaxima(estadoEn(t, 0), orbita(slug).estadoInicial)).toBe(0);
  });

  it.each(TODAS)('%s: en cada nodo, salvo el último, devuelve ese nodo', (slug) => {
    const t = trayectoriaDe(slug);
    const periodo = orbita(slug).periodo;
    let peor = 0;
    for (let i = 0; i < numeroDeNodos(t) - 1; i++) {
      peor = Math.max(peor, diferenciaMaxima(estadoEn(t, en(t.tiempos, i) / periodo), nodo(t, i)));
    }
    expect(peor).toBeLessThanOrEqual(1e-12);
  });

  it('devuelve la instancia de salida cuando se le pasa una', () => {
    const salida = new Float64Array(12);
    expect(estadoEn(trayectoriaDe('lagrange'), 0.3, salida)).toBe(salida);
  });

  it.each(TODAS)('%s: posiciones y velocidades coinciden con una referencia fina', (slug) => {
    const o = orbita(slug);
    const t = trayectoriaDe(slug);
    const referencia = integrarPeriodo(o, { tolerancia: 1e-12, pasoMaximo: o.periodo / 7200 });

    let errorPosicion = 0;
    let errorVelocidad = 0;
    for (let k = 0; k < 7200; k++) {
      const u = (k + 0.37) / 7200;
      const a = estadoEn(t, u);
      const b = estadoEn(referencia, u);
      errorPosicion = Math.max(errorPosicion, diferenciaMaxima(a.subarray(0, 6), b.subarray(0, 6)));
      errorVelocidad = Math.max(errorVelocidad, diferenciaMaxima(a.subarray(6), b.subarray(6)));
    }
    expect(errorPosicion).toBeLessThan(1e-6);
    expect(errorVelocidad).toBeLessThan(5e-4);
  });
});

describe('GRV-02 · criterio 11: envoltura, muestreo e índice', () => {
  const t = trayectoriaDe('figura-de-ocho');

  it.each([
    [1.25, 0.25],
    [-0.75, 0.25],
    [1, 0],
  ])('u = %s equivale a u = %s', (u, equivalente) => {
    expect(diferenciaMaxima(estadoEn(t, u), estadoEn(t, equivalente))).toBeLessThanOrEqual(1e-14);
  });

  it('muestrear devuelve n estados en u = k / n, idénticos a estadoEn', () => {
    const n = 720;
    const muestras = muestrear(t, n);
    expect(muestras).toHaveLength(n * 12);
    for (let k = 0; k < n; k++) {
      const esperado = estadoEn(t, k / n);
      expect(diferenciaMaxima(muestras.subarray(k * 12, k * 12 + 12), esperado)).toBe(0);
    }
  });

  it.each([0, 0.1, 0.37, 0.5, 0.999])(
    'indiceEn(u = %s) devuelve el segmento que contiene u',
    (u) => {
      const i = indiceEn(t, u);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(numeroDeNodos(t) - 2);
      expect(en(t.tiempos, i)).toBeLessThanOrEqual(u * t.periodo);
      expect(u * t.periodo).toBeLessThan(en(t.tiempos, i + 1));
    },
  );
});
