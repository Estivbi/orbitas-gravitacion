import { trazarMiniatura, type TrazadoMiniatura } from '@/lib/escena/miniatura';
import {
  SLUGS,
  energia,
  integrarPeriodo,
  obtenerOrbita,
  type Orbita,
  type Slug,
} from '@/lib/fisica';
import type { ResumenOrbita } from './orden';
import { leerTelemetria, type LecturaTelemetria } from './telemetria';

export interface FichaOrbita {
  orbita: Orbita;
  miniatura: TrazadoMiniatura;
  energiaInicial: number;
  /** Extremos del periodo, de la `Trayectoria`. */
  distanciaMinima: number;
  velocidadMaxima: number;
  /** Lectura en u = 0. */
  lecturaInicial: LecturaTelemetria;
}

const fichas = new Map<Slug, FichaOrbita>();

function orbitaDe(slug: Slug): Orbita {
  const orbita = obtenerOrbita(slug);
  if (!orbita) throw new Error(`La órbita ${slug} no está en el catálogo`);
  return orbita;
}

function crearFicha(slug: Slug): FichaOrbita {
  const orbita = orbitaDe(slug);
  const trayectoria = integrarPeriodo(orbita);
  const estadoInicial = Float64Array.from(orbita.estadoInicial);
  return {
    orbita,
    miniatura: trazarMiniatura(trayectoria),
    energiaInicial: energia(estadoInicial),
    distanciaMinima: trayectoria.distanciaMinima,
    velocidadMaxima: trayectoria.velocidadMaxima,
    lecturaInicial: leerTelemetria(estadoInicial, 0, orbita.periodo),
  };
}

/** Solo servidor. Memoizada por proceso: dos llamadas devuelven la misma referencia. */
export function fichaDeOrbita(slug: Slug): FichaOrbita {
  let ficha = fichas.get(slug);
  if (!ficha) {
    ficha = crearFicha(slug);
    fichas.set(slug, ficha);
  }
  return ficha;
}

/** Periodo y energía de las seis órbitas, en orden de catálogo, sin integrar nada. */
export function resumirCatalogo(): readonly ResumenOrbita[] {
  return SLUGS.map((slug) => {
    const orbita = orbitaDe(slug);
    return {
      slug,
      nombre: orbita.nombre,
      periodo: orbita.periodo,
      energia: energia(Float64Array.from(orbita.estadoInicial)),
    };
  });
}
