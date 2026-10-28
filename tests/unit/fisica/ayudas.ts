import {
  integrarPeriodo,
  obtenerOrbita,
  type Orbita,
  type Slug,
  type Trayectoria,
} from '@/lib/fisica';

/** Datos de la spec (tabla «Datos del catálogo»). Las tolerancias de cierre son las del criterio 7. */
export const ORBITAS_CON_PARAMETROS = [
  {
    slug: 'figura-de-ocho',
    vx: 0.34711689,
    vy: 0.53272494,
    periodo: 6.32591398,
    energia: -1.287142,
    cierre: 1e-6,
  },
  {
    slug: 'butterfly-i',
    vx: 0.30689,
    vy: 0.12551,
    periodo: 6.2356,
    energia: -2.170197,
    cierre: 3e-3,
  },
  { slug: 'goggles', vx: 0.0833, vy: 0.12789, periodo: 10.4668, energia: -2.430116, cierre: 5e-3 },
  { slug: 'moth-i', vx: 0.46444, vy: 0.39606, periodo: 14.8939, energia: -1.382296, cierre: 1e-3 },
  {
    slug: 'yin-yang-i',
    vx: 0.51394,
    vy: 0.30474,
    periodo: 17.3284,
    energia: -1.428998,
    cierre: 3e-3,
  },
] as const satisfies readonly {
  slug: Slug;
  vx: number;
  vy: number;
  periodo: number;
  energia: number;
  cierre: number;
}[];

export const LAGRANGE = {
  slug: 'lagrange',
  omega: Math.pow(3, -0.25),
  periodo: 2 * Math.PI * Math.pow(3, 0.25),
  energia: -Math.sqrt(3) / 2,
  momentoAngular: 3 * Math.pow(3, -0.25),
  cierre: 1e-9,
} as const;

export const TODAS: readonly Slug[] = [
  'lagrange',
  'figura-de-ocho',
  'butterfly-i',
  'goggles',
  'moth-i',
  'yin-yang-i',
];

export function orbita(slug: Slug): Orbita {
  const encontrada = obtenerOrbita(slug);
  if (!encontrada) {
    throw new Error(`La órbita ${slug} no está en el catálogo`);
  }
  return encontrada;
}

const memoria = new Map<Slug, Trayectoria>();

/** Trayectoria de solo lectura, compartida entre pruebas que no dependen de integrar de nuevo. */
export function trayectoriaDe(slug: Slug): Trayectoria {
  let trayectoria = memoria.get(slug);
  if (!trayectoria) {
    trayectoria = integrarPeriodo(orbita(slug));
    memoria.set(slug, trayectoria);
  }
  return trayectoria;
}

export function en(valores: ArrayLike<number>, indice: number): number {
  const valor = valores[indice];
  if (valor === undefined) {
    throw new Error(`Índice ${indice} fuera de rango`);
  }
  return valor;
}

export function nodo(trayectoria: Trayectoria, indice: number): Float64Array {
  return trayectoria.estados.subarray(indice * 12, indice * 12 + 12);
}

export function numeroDeNodos(trayectoria: Trayectoria): number {
  return trayectoria.tiempos.length;
}

export function diferenciaMaxima(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let maxima = 0;
  for (let i = 0; i < a.length; i++) {
    maxima = Math.max(maxima, Math.abs(en(a, i) - en(b, i)));
  }
  return maxima;
}

// Fórmulas independientes de la implementación: las pruebas no usan las métricas de la librería.

export function energiaDe(e: ArrayLike<number>): number {
  let cinetica = 0;
  for (let i = 6; i < 12; i++) {
    cinetica += 0.5 * en(e, i) ** 2;
  }
  let potencial = 0;
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
  ] as const) {
    const dx = en(e, 2 * a) - en(e, 2 * b);
    const dy = en(e, 2 * a + 1) - en(e, 2 * b + 1);
    potencial -= 1 / Math.sqrt(dx * dx + dy * dy);
  }
  return cinetica + potencial;
}

export function momentoLinealDe(e: ArrayLike<number>): number {
  const px = en(e, 6) + en(e, 8) + en(e, 10);
  const py = en(e, 7) + en(e, 9) + en(e, 11);
  return Math.sqrt(px * px + py * py);
}

export function momentoAngularDe(e: ArrayLike<number>): number {
  let total = 0;
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    total +=
      en(e, 2 * cuerpo) * en(e, 6 + 2 * cuerpo + 1) - en(e, 2 * cuerpo + 1) * en(e, 6 + 2 * cuerpo);
  }
  return total;
}
