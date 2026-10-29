import { describe, expect, it } from 'vitest';
import { estadoEn, indiceEn, integrarPeriodo } from '@/lib/fisica';
import { diferenciaMaxima, en, numeroDeNodos, orbita, trayectoriaDe } from './ayudas';

describe('GRV-02 · criterio 11: bordes de la envoltura y del índice', () => {
  const t = trayectoriaDe('figura-de-ocho');

  it('indiceEn devuelve el segmento correcto también en cada nodo exacto', () => {
    for (let i = 0; i < numeroDeNodos(t) - 1; i++) {
      const u = en(t.tiempos, i) / t.periodo;
      const indice = indiceEn(t, u);
      expect(en(t.tiempos, indice)).toBeLessThanOrEqual(u * t.periodo);
      expect(u * t.periodo).toBeLessThan(en(t.tiempos, indice + 1));
    }
  });

  it('indiceEn funciona cerca del final del periodo', () => {
    const indice = indiceEn(t, 1 - 1e-12);
    expect(indice).toBe(numeroDeNodos(t) - 2);
  });

  it('un valor negativo minúsculo equivale a 0, no al final del periodo', () => {
    expect(diferenciaMaxima(estadoEn(t, -1e-17), estadoEn(t, 0))).toBe(0);
    expect(indiceEn(t, -1e-17)).toBe(0);
  });
});

describe('GRV-02 · criterio 15: más entradas inválidas y el tope de intentos', () => {
  it('estadoEn rechaza una salida que no tiene 12 valores', () => {
    expect(() => estadoEn(trayectoriaDe('lagrange'), 0.5, new Float64Array(3))).toThrow(/12/);
  });

  it('el tope cuenta los intentos, no solo los pasos aceptados', () => {
    // Con un paso máximo enorme el primer paso es demasiado grande y se rechaza varias veces.
    const goggles = orbita('goggles');
    const pasoMaximo = goggles.periodo;
    const nodos = numeroDeNodos(integrarPeriodo(goggles, { pasoMaximo }));

    expect(() => integrarPeriodo(goggles, { pasoMaximo, pasosMaximos: nodos })).toThrow(
      'La integración no converge',
    );
    expect(() => integrarPeriodo(goggles, { pasoMaximo, pasosMaximos: 2 * nodos })).not.toThrow();
  });
});
