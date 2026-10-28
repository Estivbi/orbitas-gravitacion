export const SLUGS = [
  'lagrange',
  'figura-de-ocho',
  'butterfly-i',
  'goggles',
  'moth-i',
  'yin-yang-i',
] as const;

export type Slug = (typeof SLUGS)[number];

export function esSlug(valor: unknown): valor is Slug {
  return typeof valor === 'string' && (SLUGS as readonly string[]).includes(valor);
}

/** Posiciones x1, y1, x2, y2, x3, y3 y después velocidades vx1, vy1, vx2, vy2, vx3, vy3. */
export const VALORES_POR_ESTADO = 12;

export type Estado = Float64Array;

export interface Orbita {
  slug: Slug;
  nombre: string;
  periodo: number;
  /** 12 valores, congelado: se serializa tal cual y no se puede modificar por error. */
  estadoInicial: readonly number[];
  descripcion: string;
  credito: string;
}

export interface Trayectoria {
  periodo: number;
  /** Nodos de la trayectoria: tiempos[0] = 0 < … < tiempos[n - 1] = periodo. */
  tiempos: Float64Array<ArrayBuffer>;
  /** 12 valores por nodo. Cada array tiene su propio buffer, listo para transferir. */
  estados: Float64Array<ArrayBuffer>;
  /** Mayor distancia al origen entre los nodos, como mínimo 1. */
  radioMaximo: number;
  /** Mínima distancia entre dos cuerpos sobre los nodos (cota superior del mínimo real). */
  distanciaMinima: number;
  /** Máximo módulo de velocidad sobre los nodos (cota inferior del máximo real). */
  velocidadMaxima: number;
}

export interface OpcionesIntegracion {
  /** Error absoluto máximo por paso. Por defecto 1e-10; no puede ser menor que 1e-14. */
  tolerancia?: number;
  /** Mayor duración de un paso. Por defecto periodo / 720. */
  pasoMaximo?: number;
  /** Tope de intentos de paso, aceptados o rechazados. Por defecto 200 000. */
  pasosMaximos?: number;
}
