/** Velocidades de reproducción, de la más lenta a la más rápida. */
export const VELOCIDADES = [0.25, 0.5, 1, 2, 4] as const;
export type Velocidad = (typeof VELOCIDADES)[number];
export const VELOCIDAD_INICIAL: Velocidad = 1;

export function esVelocidad(valor: unknown): valor is Velocidad {
  return typeof valor === 'number' && (VELOCIDADES as readonly number[]).includes(valor);
}

/** Fracción del periodo que dibuja la estela. */
export const LONGITUD_ESTELA = { minima: 0.05, maxima: 1, paso: 0.05, inicial: 0.5 } as const;

/** Atributos del deslizador de posición (fracción del periodo). */
export const POSICION = { minima: 0, maxima: 0.999, paso: 0.001 } as const;

const PASOS_POR_UNIDAD = Math.round(1 / POSICION.paso);

/** Valor del deslizador para una posición: la envuelve a [0, 1), la redondea al paso y la limita a 0,999. */
export function valorDeDeslizador(u: number): number {
  if (!Number.isFinite(u)) return POSICION.minima;
  const envuelta = ((u % 1) + 1) % 1;
  return Math.min(POSICION.maxima, Math.round(envuelta * PASOS_POR_UNIDAD) / PASOS_POR_UNIDAD);
}

/** Posición que corresponde al valor del deslizador, limitada a [0, 0,999]; lo no finito vale 0. */
export function posicionDeDeslizador(valor: number): number {
  if (!Number.isFinite(valor)) return POSICION.minima;
  return Math.min(POSICION.maxima, Math.max(POSICION.minima, valor));
}
