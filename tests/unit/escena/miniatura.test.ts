import { describe, expect, it } from 'vitest';
import { trazarMiniatura } from '@/lib/escena/miniatura';
import { TODAS, trayectoriaDe } from '../fisica/ayudas';

type Punto = [number, number];

/** Lee las coordenadas absolutas de un trazo `M x y L x y …`. */
function puntosDe(trazo: string): Punto[] {
  expect(trazo.trim().startsWith('M')).toBe(true);
  const numeros = (trazo.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
  expect(numeros.length % 2).toBe(0);
  const puntos: Punto[] = [];
  for (let i = 0; i < numeros.length; i += 2) {
    puntos.push([numeros[i]!, numeros[i + 1]!]);
  }
  return puntos;
}

describe('GRV-03 · criterio 7: miniatura', () => {
  it.each(TODAS)('%s: tres trazos de como mucho 400 puntos finitos', (slug) => {
    const { trazos } = trazarMiniatura(trayectoriaDe(slug));
    expect(trazos).toHaveLength(3);
    for (const trazo of trazos) {
      const puntos = puntosDe(trazo);
      expect(puntos.length).toBeGreaterThan(2);
      expect(puntos.length).toBeLessThanOrEqual(400);
      expect(puntos.flat().every(Number.isFinite)).toBe(true);
    }
  });

  it.each(TODAS)('%s: la y está invertida respecto al estado inicial', (slug) => {
    const t = trayectoriaDe(slug);
    const { trazos } = trazarMiniatura(t);
    trazos.forEach((trazo, cuerpo) => {
      const [x, y] = puntosDe(trazo)[0]!;
      expect(x).toBeCloseTo(t.estados[2 * cuerpo]!, 2);
      expect(y).toBeCloseTo(-t.estados[2 * cuerpo + 1]!, 2);
    });
  });

  it.each(TODAS)('%s: el viewBox contiene todos los puntos con un margen', (slug) => {
    const { viewBox, trazos } = trazarMiniatura(trayectoriaDe(slug));
    const [minX, minY, ancho, alto] = viewBox.split(/\s+/).map(Number) as [
      number,
      number,
      number,
      number,
    ];
    expect([minX, minY, ancho, alto].every(Number.isFinite)).toBe(true);
    expect(ancho).toBeGreaterThan(0);
    expect(alto).toBeGreaterThan(0);
    for (const trazo of trazos) {
      for (const [x, y] of puntosDe(trazo)) {
        expect(x).toBeGreaterThan(minX);
        expect(x).toBeLessThan(minX + ancho);
        expect(y).toBeGreaterThan(minY);
        expect(y).toBeLessThan(minY + alto);
      }
    }
  });

  it.each(TODAS)('%s: el diezmado separa los puntos más de radioMaximo / 200', (slug) => {
    const t = trayectoriaDe(slug);
    const { trazos } = trazarMiniatura(t);
    for (const trazo of trazos) {
      const puntos = puntosDe(trazo);
      // El último punto se conserva siempre y puede quedar más cerca que el umbral.
      for (let i = 1; i < puntos.length - 1; i++) {
        const distancia = Math.hypot(
          puntos[i]![0] - puntos[i - 1]![0],
          puntos[i]![1] - puntos[i - 1]![1],
        );
        expect(distancia).toBeGreaterThan(t.radioMaximo / 200 - 0.002);
      }
    }
  });

  it.each(TODAS)('%s: los tres trazos ocupan menos de 12 KB', (slug) => {
    const { trazos } = trazarMiniatura(trayectoriaDe(slug));
    expect(trazos.join('').length).toBeLessThan(12_000);
  });

  it.each(TODAS)('%s: dos llamadas dan el mismo resultado', (slug) => {
    const t = trayectoriaDe(slug);
    expect(trazarMiniatura(t)).toEqual(trazarMiniatura(t));
  });
});
