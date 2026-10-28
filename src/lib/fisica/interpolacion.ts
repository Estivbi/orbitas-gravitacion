import { derivada } from './fuerzas';
import { VALORES_POR_ESTADO, type Estado, type Trayectoria } from './tipos';

// Los índices están acotados por construcción (un estado tiene siempre 12 valores).

const N = VALORES_POR_ESTADO;

// Espacio de trabajo para las aceleraciones de los dos extremos de un segmento.
const aceleracionesIzquierda = new Float64Array(N);
const aceleracionesDerecha = new Float64Array(N);

function validarFraccion(u: number): void {
  if (!Number.isFinite(u)) {
    throw new RangeError(`u debe ser un número finito (recibido: ${u})`);
  }
}

/** Fracción del periodo envuelta a [0, 1): 1,25 y −0,75 equivalen a 0,25. */
function envolver(u: number): number {
  return u - Math.floor(u);
}

function buscarSegmento(t: Trayectoria, tiempo: number): number {
  let bajo = 0;
  let alto = t.tiempos.length - 1;
  while (alto - bajo > 1) {
    const medio = (bajo + alto) >> 1;
    if (t.tiempos[medio]! <= tiempo) {
      bajo = medio;
    } else {
      alto = medio;
    }
  }
  return bajo;
}

/** Índice del nodo izquierdo del segmento que contiene la fracción `u` del periodo. */
export function indiceEn(t: Trayectoria, u: number): number {
  validarFraccion(u);
  return buscarSegmento(t, envolver(u) * t.periodo);
}

/**
 * Estado en la fracción `u` del periodo (envuelta módulo 1), por Hermite cúbico entre los dos
 * nodos vecinos. Las posiciones usan las velocidades como derivadas; las velocidades usan las
 * aceleraciones, recalculadas con la misma función de fuerzas en los extremos del segmento.
 */
export function estadoEn(t: Trayectoria, u: number, salida: Estado = new Float64Array(N)): Estado {
  validarFraccion(u);
  const tiempo = envolver(u) * t.periodo;
  const i = buscarSegmento(t, tiempo);

  const t0 = t.tiempos[i]!;
  const duracion = t.tiempos[i + 1]! - t0;
  const s = (tiempo - t0) / duracion;
  const s2 = s * s;
  const s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1;
  const h10 = s3 - 2 * s2 + s;
  const h01 = -2 * s3 + 3 * s2;
  const h11 = s3 - s2;

  const e = t.estados;
  const izquierda = i * N;
  const derecha = izquierda + N;
  derivada(e, izquierda, aceleracionesIzquierda);
  derivada(e, derecha, aceleracionesDerecha);

  for (let k = 0; k < 6; k++) {
    salida[k] =
      h00 * e[izquierda + k]! +
      h10 * duracion * e[izquierda + 6 + k]! +
      h01 * e[derecha + k]! +
      h11 * duracion * e[derecha + 6 + k]!;
    salida[6 + k] =
      h00 * e[izquierda + 6 + k]! +
      h10 * duracion * aceleracionesIzquierda[6 + k]! +
      h01 * e[derecha + 6 + k]! +
      h11 * duracion * aceleracionesDerecha[6 + k]!;
  }
  return salida;
}

/** `n` estados equiespaciados en el tiempo, en u = k / n con k = 0 … n − 1 (el periodo no repite el primero). */
export function muestrear(t: Trayectoria, n: number): Float64Array {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`n debe ser un entero mayor o igual que 1 (recibido: ${n})`);
  }
  const muestras = new Float64Array(n * N);
  const estado = new Float64Array(N);
  for (let k = 0; k < n; k++) {
    estadoEn(t, k / n, estado);
    muestras.set(estado, k * N);
  }
  return muestras;
}
