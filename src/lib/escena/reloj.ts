import { recortarDt } from './numeros';

/** Fracción del periodo envuelta a [0, 1): −1e-17 vale 0 y nunca 1. */
export function envolverPosicion(u: number): number {
  const fraccion = u - Math.floor(u);
  return fraccion >= 1 ? 0 : fraccion;
}

/** Avanza la fracción del periodo `dt · velocidad / periodo`; `dt` se recorta a [0, 0,25] s. */
export function avanzarPosicion(u: number, dt: number, velocidad: number, periodo: number): number {
  return envolverPosicion(u + (recortarDt(dt) * velocidad) / periodo);
}
