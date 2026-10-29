import { describe, expect, it } from 'vitest';
import {
  LEY_INICIAL,
  LIMITES,
  describirRazon,
  fraseDuplicar,
  fuerza,
  limitarLey,
  radioAX,
  razonAlDuplicarDistancia,
  xARadio,
  type Geometria,
} from '@/lib/ley/ley';

/** Generador con semilla fija (mulberry32) para que las leyes aleatorias sean reproducibles. */
function semilla(s: number): () => number {
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const paso = (a: () => number) => 1 + Math.floor(a() * 19) * LIMITES.paso;

describe('ley pura (GRV-05, criterio 1)', () => {
  it('fuerza vale m1·m2/r² y rechaza distancias no válidas', () => {
    expect(fuerza(4, 2, 4)).toBe(0.5);
    expect(fuerza(10, 10, 1)).toBe(100);
    for (const r of [0, -1, NaN, Infinity]) expect(() => fuerza(1, 1, r)).toThrow(RangeError);
  });

  it('al doblar r la fuerza es la cuarta parte, para cualquier ley válida', () => {
    const aleatorio = semilla(5);
    for (let i = 0; i < 20; i++) {
      const ley = { m1: paso(aleatorio), m2: paso(aleatorio), r: paso(aleatorio) };
      expect(Math.abs(razonAlDuplicarDistancia(ley) - 0.25)).toBeLessThan(1e-12);
      expect(fraseDuplicar(ley)).toContain('la cuarta parte');
    }
  });

  it('describe la razón en palabras', () => {
    expect(describirRazon(0.5)).toBe('la mitad');
    expect(describirRazon(0.25)).toBe('la cuarta parte');
    expect(describirRazon(0.125)).toBe('0,13 veces');
    expect(fraseDuplicar(LEY_INICIAL)).toBe('A doble distancia la fuerza sería la cuarta parte.');
  });

  it('limitarLey recorta, redondea a 0,5 y trata NaN', () => {
    expect(limitarLey({ m1: 0, m2: 99, r: 3.3 })).toEqual({ m1: 1, m2: 10, r: 3.5 });
    expect(limitarLey({ m1: NaN, m2: NaN, r: NaN })).toEqual(LEY_INICIAL);
  });

  it('xARadio y radioAX son inversas y no salen de [1, 10]', () => {
    const g: Geometria = { x0: 100, pxPorUnidad: 30 };
    for (const r of [1, 2.5, 7, 10]) expect(xARadio(radioAX(r, g), g)).toBeCloseTo(r, 12);
    expect(xARadio(-1000, g)).toBe(1);
    expect(xARadio(1e6, g)).toBe(10);
    expect(radioAX(50, g)).toBe(radioAX(10, g));
    expect(radioAX(-3, g)).toBe(radioAX(1, g));
  });
});
