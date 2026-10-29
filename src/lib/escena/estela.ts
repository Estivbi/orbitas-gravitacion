import { VALORES_POR_ESTADO, estadoEn, muestrear, type Trayectoria } from '@/lib/fisica';
import { limitar } from './numeros';
import { envolverPosicion } from './reloj';

/** Las marcas se anclan a una rejilla fija: u_k = k / MARCAS_POR_PERIODO. */
export const MARCAS_POR_PERIODO = 240;

const LONGITUD_MINIMA = 0.05;
const LONGITUD_MAXIMA = 1;
const EXPONENTE_ALFA = 1.6;

export interface DatosCuerpo {
  /** 3 valores por vértice (z = 0). */
  linea: Float32Array;
  lineaAlfa: Float32Array;
  /** 3 valores por marca (z = 0). */
  marcas: Float32Array;
  marcasAlfa: Float32Array;
}

export type DatosEstelas = [DatosCuerpo, DatosCuerpo, DatosCuerpo];

/** La rejilla se calcula una vez por trayectoria con `muestrear`. */
const rejillas = new WeakMap<Trayectoria, Float64Array>();

function rejillaDe(t: Trayectoria): Float64Array {
  let rejilla = rejillas.get(t);
  if (!rejilla) {
    rejilla = muestrear(t, MARCAS_POR_PERIODO);
    rejillas.set(t, rejilla);
  }
  return rejilla;
}

/** Opacidad según la edad relativa (0 = cabeza, 1 = cola): (1 − e)^1,6. */
export function alfaDeEdad(edadRelativa: number): number {
  return Math.pow(1 - limitar(edadRelativa, 0, 1), EXPONENTE_ALFA);
}

function crearDatosCuerpo(vertices: number, marcas: number): DatosCuerpo {
  return {
    linea: new Float32Array(3 * vertices),
    lineaAlfa: new Float32Array(vertices),
    marcas: new Float32Array(3 * marcas),
    marcasAlfa: new Float32Array(marcas),
  };
}

/** Capacidad: n + 1 vértices por cuerpo (los n nodos menos el último, más los dos extremos). */
export function crearDatosEstelas(t: Trayectoria): DatosEstelas {
  rejillaDe(t);
  const vertices = t.tiempos.length + 1;
  const marcas = MARCAS_POR_PERIODO + 1;
  return [
    crearDatosCuerpo(vertices, marcas),
    crearDatosCuerpo(vertices, marcas),
    crearDatosCuerpo(vertices, marcas),
  ];
}

function validar(u: number, longitud: number): void {
  if (!Number.isFinite(u)) {
    throw new RangeError(`u debe ser un número finito (recibido: ${u})`);
  }
  if (!(longitud >= LONGITUD_MINIMA && longitud <= LONGITUD_MAXIMA)) {
    throw new RangeError(
      `La longitud debe estar entre ${LONGITUD_MINIMA} y ${LONGITUD_MAXIMA} (recibida: ${longitud})`,
    );
  }
}

/** Ventana de la estela en tiempo desenvuelto: (inicio, fin], con `fin` en [0, T). */
interface Ventana {
  inicio: number;
  fin: number;
  duracion: number;
}

/** Escribe un vértice por cuerpo; `posiciones` guarda x e y de cada cuerpo desde `desde`. */
function escribirVertice(
  destino: DatosEstelas,
  indice: number,
  posiciones: ArrayLike<number>,
  desde: number,
  alfa: number,
): void {
  for (let b = 0; b < 3; b++) {
    const cuerpo = destino[b]!;
    cuerpo.linea[3 * indice] = posiciones[desde + 2 * b]!;
    cuerpo.linea[3 * indice + 1] = posiciones[desde + 2 * b + 1]!;
    cuerpo.lineaAlfa[indice] = alfa;
  }
}

const estadoTemporal = new Float64Array(VALORES_POR_ESTADO);

function escribirEstadoEn(
  t: Trayectoria,
  destino: DatosEstelas,
  indice: number,
  fraccion: number,
  alfa: number,
): void {
  estadoEn(t, fraccion, estadoTemporal);
  escribirVertice(destino, indice, estadoTemporal, 0, alfa);
}

/** Vértices: el estado en el inicio, los nodos estrictamente dentro de la ventana y el estado en el fin. */
function construirLinea(t: Trayectoria, ventana: Ventana, destino: DatosEstelas): number {
  const { inicio, fin, duracion } = ventana;
  const edad = (tiempo: number) => alfaDeEdad((fin - tiempo) / duracion);
  let vertices = 0;
  escribirEstadoEn(t, destino, vertices++, inicio / t.periodo, edad(inicio));
  // El último nodo repite el primero un periodo después: nunca se incluye.
  const nodos = t.tiempos.length - 1;
  for (const vuelta of [-1, 0]) {
    for (let j = 0; j < nodos; j++) {
      const tiempo = t.tiempos[j]! + vuelta * t.periodo;
      if (tiempo >= fin) break;
      if (tiempo > inicio) {
        escribirVertice(destino, vertices++, t.estados, j * VALORES_POR_ESTADO, edad(tiempo));
      }
    }
  }
  escribirEstadoEn(t, destino, vertices++, fin / t.periodo, edad(fin));
  return vertices;
}

/** Marcas: los puntos de la rejilla cuyo tiempo desenvuelto cae en (inicio, fin]. */
function construirMarcas(
  t: Trayectoria,
  u: number,
  longitud: number,
  destino: DatosEstelas,
): number {
  const rejilla = rejillaDe(t);
  const primera = Math.floor((u - longitud) * MARCAS_POR_PERIODO) + 1;
  const ultima = Math.floor(u * MARCAS_POR_PERIODO);
  for (let k = primera; k <= ultima; k++) {
    const indice = k - primera;
    const celda = ((k % MARCAS_POR_PERIODO) + MARCAS_POR_PERIODO) % MARCAS_POR_PERIODO;
    const alfa = alfaDeEdad((u - k / MARCAS_POR_PERIODO) / longitud);
    for (let b = 0; b < 3; b++) {
      const cuerpo = destino[b]!;
      cuerpo.marcas[3 * indice] = rejilla[celda * VALORES_POR_ESTADO + 2 * b]!;
      cuerpo.marcas[3 * indice + 1] = rejilla[celda * VALORES_POR_ESTADO + 2 * b + 1]!;
      cuerpo.marcasAlfa[indice] = alfa;
    }
  }
  return ultima - primera + 1;
}

/**
 * Rellena `destino` con la estela que termina en la fracción `u` y dura `longitud` periodos
 * (entre 0,05 y 1). Devuelve cuántos vértices y marcas se han escrito.
 */
export function construirEstelas(
  t: Trayectoria,
  u: number,
  longitud: number,
  destino: DatosEstelas,
): { vertices: number; marcas: number } {
  validar(u, longitud);
  const fraccion = envolverPosicion(u);
  const duracion = longitud * t.periodo;
  const fin = fraccion * t.periodo;
  return {
    vertices: construirLinea(t, { inicio: fin - duracion, fin, duracion }, destino),
    marcas: construirMarcas(t, fraccion, longitud, destino),
  };
}
