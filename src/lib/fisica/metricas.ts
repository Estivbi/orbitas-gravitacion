import type { Estado } from './tipos';

// Los índices están acotados por construcción (un estado tiene siempre 12 valores).

export interface Metricas {
  energia: number;
  /** Módulo del momento lineal total. */
  momentoLineal: number;
  momentoAngular: number;
  distanciaMinima: number;
  velocidadMaxima: number;
}

/** Distancia entre los cuerpos `a` y `b` de un estado que empieza en `d` dentro de `e`. */
function distancia(e: ArrayLike<number>, d: number, a: number, b: number): number {
  const dx = e[d + 2 * a]! - e[d + 2 * b]!;
  const dy = e[d + 2 * a + 1]! - e[d + 2 * b + 1]!;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distanciaMinimaEn(e: ArrayLike<number>, d = 0): number {
  return Math.min(distancia(e, d, 0, 1), distancia(e, d, 0, 2), distancia(e, d, 1, 2));
}

export function velocidadMaximaEn(e: ArrayLike<number>, d = 0): number {
  let maxima = 0;
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    const vx = e[d + 6 + 2 * cuerpo]!;
    const vy = e[d + 7 + 2 * cuerpo]!;
    maxima = Math.max(maxima, Math.sqrt(vx * vx + vy * vy));
  }
  return maxima;
}

export function radioMaximoEn(e: ArrayLike<number>, d = 0): number {
  let maximo = 0;
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    const x = e[d + 2 * cuerpo]!;
    const y = e[d + 2 * cuerpo + 1]!;
    maximo = Math.max(maximo, Math.sqrt(x * x + y * y));
  }
  return maximo;
}

export function energia(e: Estado): number {
  let cinetica = 0;
  for (let i = 6; i < 12; i++) {
    cinetica += 0.5 * e[i]! * e[i]!;
  }
  const potencial = -(
    1 / distancia(e, 0, 0, 1) +
    1 / distancia(e, 0, 0, 2) +
    1 / distancia(e, 0, 1, 2)
  );
  return cinetica + potencial;
}

export function momentoAngular(e: Estado): number {
  let total = 0;
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    total += e[2 * cuerpo]! * e[7 + 2 * cuerpo]! - e[2 * cuerpo + 1]! * e[6 + 2 * cuerpo]!;
  }
  return total;
}

export function metricas(e: Estado): Metricas {
  const px = e[6]! + e[8]! + e[10]!;
  const py = e[7]! + e[9]! + e[11]!;
  return {
    energia: energia(e),
    momentoLineal: Math.sqrt(px * px + py * py),
    momentoAngular: momentoAngular(e),
    distanciaMinima: distanciaMinimaEn(e),
    velocidadMaxima: velocidadMaximaEn(e),
  };
}
