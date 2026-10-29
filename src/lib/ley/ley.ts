/** Ley de gravitación universal con G = 1 (unidades arbitrarias). TypeScript puro, sin React. */

export const LIMITES = {
  masa: { min: 1, max: 10 },
  distancia: { min: 1, max: 10 },
  paso: 0.5,
} as const;

export interface Ley {
  m1: number;
  m2: number;
  r: number;
}

export const LEY_INICIAL: Readonly<Ley> = Object.freeze({ m1: 4, m2: 2, r: 4 });

/** Correspondencia lineal entre la distancia r y la coordenada x del dibujo: x = x0 + r·pxPorUnidad. */
export interface Geometria {
  x0: number;
  pxPorUnidad: number;
}

const TOLERANCIA = 1e-9;

export function fuerza(m1: number, m2: number, r: number): number {
  if (!Number.isFinite(r) || r <= 0) {
    throw new RangeError('La distancia debe ser un número finito mayor que cero');
  }
  return (m1 * m2) / (r * r);
}

function limitar(valor: number, min: number, max: number, inicial: number): number {
  if (Number.isNaN(valor)) return inicial;
  const redondeado = Math.round(valor / LIMITES.paso) * LIMITES.paso;
  return Math.min(max, Math.max(min, redondeado));
}

/** Recorta cada magnitud a sus límites y la redondea al paso de 0,5; NaN pasa al valor inicial. */
export function limitarLey(l: Ley): Ley {
  const { masa, distancia } = LIMITES;
  return {
    m1: limitar(l.m1, masa.min, masa.max, LEY_INICIAL.m1),
    m2: limitar(l.m2, masa.min, masa.max, LEY_INICIAL.m2),
    r: limitar(l.r, distancia.min, distancia.max, LEY_INICIAL.r),
  };
}

export function razonAlDuplicarDistancia(l: Ley): number {
  return fuerza(l.m1, l.m2, 2 * l.r) / fuerza(l.m1, l.m2, l.r);
}

export function formatearNumero(valor: number, decimales: number): string {
  return valor.toFixed(decimales).replace('.', ',');
}

export function describirRazon(razon: number): string {
  if (Math.abs(razon - 0.5) < TOLERANCIA) return 'la mitad';
  if (Math.abs(razon - 0.25) < TOLERANCIA) return 'la cuarta parte';
  return `${formatearNumero(razon, 2)} veces`;
}

export function fraseDuplicar(l: Ley): string {
  return `A doble distancia la fuerza sería ${describirRazon(razonAlDuplicarDistancia(l))}.`;
}

export function xARadio(x: number, g: Geometria): number {
  const r = (x - g.x0) / g.pxPorUnidad;
  return Math.min(LIMITES.distancia.max, Math.max(LIMITES.distancia.min, r));
}

export function radioAX(r: number, g: Geometria): number {
  const limitado = Math.min(LIMITES.distancia.max, Math.max(LIMITES.distancia.min, r));
  return g.x0 + limitado * g.pxPorUnidad;
}
