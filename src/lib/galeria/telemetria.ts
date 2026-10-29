import { metricas } from '@/lib/fisica/metricas';
import type { Estado } from '@/lib/fisica/tipos';
import { formatearCifra, formatearPorcentaje, formatearTiempo } from './formato';

export interface LecturaTelemetria {
  /** `u · periodo`. */
  tiempo: number;
  /** `u`, en [0, 1). */
  fase: number;
  energia: number;
  momentoLineal: number;
  /** Instantánea: el par más cercano ahora. */
  distanciaMinima: number;
  /** Instantánea: el cuerpo más rápido ahora. */
  velocidadMaxima: number;
}

export interface TextosTelemetria {
  tiempo: string;
  fase: string;
  energia: string;
  momento: string;
  distanciaMinima: string;
  velocidadMaxima: string;
}

/** Ritmo máximo de escritura de la telemetría mientras se reproduce (≈10 Hz). */
export const INTERVALO_TELEMETRIA_MS = 100;

/** Lectura de un estado entregado por la escena (un `Float64Array`) en la fracción `u` del periodo. */
export function leerTelemetria(
  estado: Readonly<Estado>,
  u: number,
  periodo: number,
): LecturaTelemetria {
  const m = metricas(estado);
  return {
    tiempo: u * periodo,
    fase: u,
    energia: m.energia,
    momentoLineal: m.momentoLineal,
    distanciaMinima: m.distanciaMinima,
    velocidadMaxima: m.velocidadMaxima,
  };
}

export function formatearLectura(lectura: LecturaTelemetria): TextosTelemetria {
  return {
    tiempo: formatearTiempo(lectura.tiempo),
    fase: formatearPorcentaje(lectura.fase),
    energia: formatearCifra(lectura.energia, 3),
    momento: formatearCifra(lectura.momentoLineal, 3),
    distanciaMinima: formatearCifra(lectura.distanciaMinima, 3),
    velocidadMaxima: formatearCifra(lectura.velocidadMaxima, 3),
  };
}

/** Reproduciendo: solo si pasó el intervalo (límite inclusivo). En pausa siempre, para reflejar el último valor. */
export function debeActualizar(
  ahoraMs: number,
  ultimaMs: number,
  reproduciendo: boolean,
  intervaloMs: number = INTERVALO_TELEMETRIA_MS,
): boolean {
  return !reproduciendo || ahoraMs - ultimaMs >= intervaloMs;
}

/** Fase con tres decimales truncados, para el atributo `data-valor` de la barra. */
export function valorDeFase(fase: number): string {
  if (!Number.isFinite(fase)) return '0.000';
  return (Math.min(Math.floor(Math.max(fase, 0) * 1000 + 1e-9), 999) / 1000).toFixed(3);
}
