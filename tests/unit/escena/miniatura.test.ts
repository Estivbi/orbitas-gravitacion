import { describe, expect, it } from 'vitest';
import type { Trayectoria } from '@/lib/fisica';
import { trazarMiniatura } from '@/lib/escena/miniatura';
import { TODAS, trayectoriaDe } from '../fisica/ayudas';

type Punto = [number, number];

const NUMERO = '-?\\d+(?:\\.\\d{1,3})?';
/** `M x y L x y …`: comandos absolutos, como máximo 3 decimales, un espacio entre los dos números. */
const FORMATO_D = new RegExp(`^M ${NUMERO} ${NUMERO}(?: L ${NUMERO} ${NUMERO})*$`);

/** Lee las coordenadas de un trazo `M x y L x y …`, tras comprobar su formato. */
function puntosDe(trazo: string): Punto[] {
  expect(trazo).toMatch(FORMATO_D);
  return trazo
    .split(/[ML]/)
    .filter((tramo) => tramo.trim() !== '')
    .map((tramo) => {
      const [x, y] = tramo.trim().split(' ').map(Number);
      return [x!, y!];
    });
}

/**
 * Reconstrucción independiente del diezmado: el primer nodo, cada nodo que dista más de
 * radioMaximo / 25 del último conservado, y siempre el último nodo. La y va invertida.
 */
function puntosEsperados(t: Trayectoria, cuerpo: number): Punto[] {
  const n = t.tiempos.length;
  const umbral = t.radioMaximo / 25;
  const nodo = (i: number): Punto => [
    t.estados[i * 12 + 2 * cuerpo]!,
    -t.estados[i * 12 + 2 * cuerpo + 1]!,
  ];
  const conservados: Punto[] = [nodo(0)];
  for (let i = 1; i < n; i++) {
    const [x, y] = nodo(i);
    const [ax, ay] = conservados[conservados.length - 1]!;
    if (i === n - 1 || Math.hypot(x - ax, y - ay) > umbral) conservados.push([x, y]);
  }
  return conservados;
}

const REDONDEO = 0.0005 + 1e-9;

function comprobarPuntos(t: Trayectoria): void {
  trazarMiniatura(t).trazos.forEach((trazo, cuerpo) => {
    const obtenidos = puntosDe(trazo);
    const esperados = puntosEsperados(t, cuerpo);
    expect(obtenidos).toHaveLength(esperados.length);
    esperados.forEach(([x, y], i) => {
      expect(Math.abs(obtenidos[i]![0] - x)).toBeLessThanOrEqual(REDONDEO);
      expect(Math.abs(obtenidos[i]![1] - y)).toBeLessThanOrEqual(REDONDEO);
    });
  });
}

/** El viewBox rodea la caja de los puntos esperados (calculada aquí) con un margen razonable. */
function comprobarViewBox(t: Trayectoria): void {
  const { viewBox } = trazarMiniatura(t);
  expect(viewBox).toMatch(new RegExp(`^${NUMERO} ${NUMERO} ${NUMERO} ${NUMERO}$`));
  const [minX, minY, ancho, alto] = viewBox.split(' ').map(Number) as [
    number,
    number,
    number,
    number,
  ];
  expect(ancho).toBeGreaterThan(0);
  expect(alto).toBeGreaterThan(0);

  const todos = [0, 1, 2].flatMap((cuerpo) => puntosEsperados(t, cuerpo));
  const xs = todos.map(([x]) => x);
  const ys = todos.map(([, y]) => y);
  const [bx0, bx1] = [Math.min(...xs), Math.max(...xs)];
  const [by0, by1] = [Math.min(...ys), Math.max(...ys)];
  const lado = Math.max(bx1 - bx0, by1 - by0);

  const margenes = [bx0 - minX, minX + ancho - bx1, by0 - minY, minY + alto - by1];
  for (const margen of margenes) {
    expect(margen).toBeGreaterThanOrEqual(0.01 * lado);
    expect(margen).toBeLessThanOrEqual(0.3 * lado);
  }
}

/**
 * Tres cuerpos que no son simétricos respecto al eje x: con las órbitas del catálogo, que sí lo
 * son, un viewBox calculado con la y sin invertir daría la misma caja y pasaría desapercibido.
 */
function trayectoriaAsimetrica(): Trayectoria {
  const n = 60;
  const estados = new Float64Array(n * 12);
  for (let i = 0; i < n; i++) {
    const posiciones = [
      [0.1 * i, 1 + 0.05 * i],
      [-0.08 * i, 2 + 0.5 * Math.sin(i / 5)],
      [3 + 0.05 * i, 5 + 0.1 * i],
    ];
    posiciones.forEach(([x, y], cuerpo) => {
      estados[i * 12 + 2 * cuerpo] = x!;
      estados[i * 12 + 2 * cuerpo + 1] = y!;
    });
  }
  return {
    periodo: 1,
    tiempos: Float64Array.from({ length: n }, (_, i) => i / (n - 1)),
    estados,
    radioMaximo: 12,
    distanciaMinima: 1,
    velocidadMaxima: 1,
  };
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

  it.each(TODAS)('%s: el diezmado conserva los mismos puntos que la reconstrucción', (slug) => {
    comprobarPuntos(trayectoriaDe(slug));
  });

  it.each(TODAS)(
    '%s: empieza en el nodo 0, acaba en el último nodo y la y está invertida',
    (slug) => {
      const t = trayectoriaDe(slug);
      const ultimo = t.tiempos.length - 1;
      const { trazos } = trazarMiniatura(t);
      trazos.forEach((trazo, cuerpo) => {
        const puntos = puntosDe(trazo);
        const [x0, y0] = puntos[0]!;
        expect(Math.abs(x0 - t.estados[2 * cuerpo]!)).toBeLessThanOrEqual(REDONDEO);
        expect(Math.abs(y0 + t.estados[2 * cuerpo + 1]!)).toBeLessThanOrEqual(REDONDEO);
        const [xn, yn] = puntos[puntos.length - 1]!;
        expect(Math.abs(xn - t.estados[ultimo * 12 + 2 * cuerpo]!)).toBeLessThanOrEqual(REDONDEO);
        expect(Math.abs(yn + t.estados[ultimo * 12 + 2 * cuerpo + 1]!)).toBeLessThanOrEqual(
          REDONDEO,
        );
      });
    },
  );

  it.each(TODAS)('%s: el viewBox contiene todos los puntos con un margen razonable', (slug) => {
    comprobarViewBox(trayectoriaDe(slug));
  });

  it.each(TODAS)('%s: el viewBox contiene los puntos del resultado', (slug) => {
    const { viewBox, trazos } = trazarMiniatura(trayectoriaDe(slug));
    const [minX, minY, ancho, alto] = viewBox.split(' ').map(Number) as [
      number,
      number,
      number,
      number,
    ];
    for (const trazo of trazos) {
      for (const [x, y] of puntosDe(trazo)) {
        expect(x).toBeGreaterThan(minX);
        expect(x).toBeLessThan(minX + ancho);
        expect(y).toBeGreaterThan(minY);
        expect(y).toBeLessThan(minY + alto);
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

  it('cada cuerpo tiene su propio trazo, en orden', () => {
    const { trazos } = trazarMiniatura(trayectoriaDe('figura-de-ocho'));
    const iniciales = trazos.map((trazo) => puntosDe(trazo)[0]!);
    expect(new Set(iniciales.map(([x, y]) => `${x},${y}`)).size).toBe(3);
  });

  it('una trayectoria asimétrica en y: diezmado, y invertida y viewBox correctos', () => {
    const t = trayectoriaAsimetrica();
    comprobarPuntos(t);
    comprobarViewBox(t);
    const { trazos } = trazarMiniatura(t);
    expect(puntosDe(trazos[0]).length).toBeLessThan(30);
    expect(puntosDe(trazos[0])[0]![1]).toBeCloseTo(-1, 3);
  });
});
