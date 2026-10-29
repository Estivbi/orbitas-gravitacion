import { describe, expect, it } from 'vitest';
import { avanzarPosicion, envolverPosicion } from '@/lib/escena/reloj';

describe('GRV-03 · criterio 9: reloj de la órbita', () => {
  it('avanza u + dt · velocidad / periodo', () => {
    expect(avanzarPosicion(0.5, 0.1, 1, 10)).toBeCloseTo(0.51, 12);
    expect(avanzarPosicion(0.25, 0.2, 2, 4)).toBeCloseTo(0.35, 12);
  });

  it('envuelve en [0, 1)', () => {
    expect(avanzarPosicion(0.995, 0.1, 1, 10)).toBeCloseTo(0.005, 12);
  });

  it('una velocidad negativa retrocede con envoltura', () => {
    expect(avanzarPosicion(0.005, 0.1, -1, 10)).toBeCloseTo(0.995, 12);
    expect(avanzarPosicion(0.5, 0.1, -1, 10)).toBeCloseTo(0.49, 12);
  });

  it('recorta dt a [0, 0,25]', () => {
    expect(avanzarPosicion(0, 5, 1, 1)).toBeCloseTo(0.25, 12);
    expect(avanzarPosicion(0.4, -1, 1, 1)).toBe(0.4);
    expect(avanzarPosicion(0.4, -0.3, 1, 1)).toBe(0.4);
  });

  it('el recorte actúa sobre dt, no sobre el incremento: con velocidad 2 y periodo 10', () => {
    expect(avanzarPosicion(0, 5, 2, 10)).toBeCloseTo(0.05, 12);
    expect(avanzarPosicion(0, 0.25, 2, 10)).toBeCloseTo(0.05, 12);
    expect(avanzarPosicion(0.2, 9, 100, 10)).toBeCloseTo(0.7, 12);
    expect(avanzarPosicion(0.2, 9, -100, 10)).toBeCloseTo(0.7, 12);
  });

  it('el periodo escala el avance', () => {
    expect(avanzarPosicion(0, 0.25, 1, 10)).toBeCloseTo(0.025, 12);
    expect(avanzarPosicion(0, 0.25, 1, 5)).toBeCloseTo(0.05, 12);
  });

  it('un retroceso minúsculo desde 0 envuelve a un valor menor que 1', () => {
    const resultado = avanzarPosicion(0, 1e-17, -1, 1);
    expect(resultado).toBeGreaterThanOrEqual(0);
    expect(resultado).toBeLessThan(1);
  });

  it('nunca devuelve 1 ni NaN, tampoco en los bordes', () => {
    const casos: [number, number, number, number][] = [
      [0, 0, 1, 1],
      [0.75, 0.25, 1, 1],
      [0.999999999999, 1e-9, 1, 1],
      [0, 0.25, -1, 1],
      [1e-17, 0.001, -1, 1],
    ];
    for (const [u, dt, velocidad, periodo] of casos) {
      const resultado = avanzarPosicion(u, dt, velocidad, periodo);
      expect(Number.isNaN(resultado)).toBe(false);
      expect(resultado).toBeGreaterThanOrEqual(0);
      expect(resultado).toBeLessThan(1);
    }
  });

  describe('envolverPosicion', () => {
    it.each([
      [0.25, 0.25],
      [1.25, 0.25],
      [-0.25, 0.75],
      [-3.75, 0.25],
      [7, 0],
      [2, 0],
      [1, 0],
      [0, 0],
    ])('envolverPosicion(%d) = %d', (entrada, esperado) => {
      expect(envolverPosicion(entrada)).toBeCloseTo(esperado, 12);
    });

    it('un valor negativo diminuto vale 0 y no 1', () => {
      expect(envolverPosicion(-1e-17)).toBeCloseTo(0, 12);
      expect(envolverPosicion(-1e-17)).toBeLessThan(1);
    });
  });
});
