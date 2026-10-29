import { derivada } from './fuerzas';
import { distanciaMinimaEn, radioMaximoEn, velocidadMaximaEn } from './metricas';
import {
  VALORES_POR_ESTADO,
  type OpcionesIntegracion,
  type Orbita,
  type Trayectoria,
} from './tipos';

// Los índices están acotados por construcción (un estado tiene siempre 12 valores).

const N = VALORES_POR_ESTADO;
const TOLERANCIA_POR_DEFECTO = 1e-10;
const TOLERANCIA_MINIMA = 1e-14;
const PASOS_MAXIMOS_POR_DEFECTO = 200_000;
const DIVISIONES_DEL_PERIODO = 720;
const SEGURIDAD = 0.9;
const FACTOR_MINIMO = 0.3;
const FACTOR_MAXIMO = 2;

type PasoRk4 = (y: Float64Array, h: number) => void;

/** Un paso de Runge-Kutta de cuarto orden. Cada llamada a esta función crea su propio espacio de trabajo. */
function crearPasoRk4(): PasoRk4 {
  const k1 = new Float64Array(N);
  const k2 = new Float64Array(N);
  const k3 = new Float64Array(N);
  const k4 = new Float64Array(N);
  const s = new Float64Array(N);

  return (y, h) => {
    derivada(y, 0, k1);
    for (let i = 0; i < N; i++) s[i] = y[i]! + 0.5 * h * k1[i]!;
    derivada(s, 0, k2);
    for (let i = 0; i < N; i++) s[i] = y[i]! + 0.5 * h * k2[i]!;
    derivada(s, 0, k3);
    for (let i = 0; i < N; i++) s[i] = y[i]! + h * k3[i]!;
    derivada(s, 0, k4);
    for (let i = 0; i < N; i++) {
      y[i] = y[i]! + (h / 6) * (k1[i]! + 2 * k2[i]! + 2 * k3[i]! + k4[i]!);
    }
  };
}

interface Configuracion {
  periodo: number;
  tolerancia: number;
  pasoMaximo: number;
  pasosMaximos: number;
  estado: Float64Array<ArrayBuffer>;
}

function validar(
  orbita: Pick<Orbita, 'periodo' | 'estadoInicial'>,
  opciones: OpcionesIntegracion,
): Configuracion {
  const { periodo, estadoInicial } = orbita;
  const tolerancia = opciones.tolerancia ?? TOLERANCIA_POR_DEFECTO;

  if (!Number.isFinite(periodo) || periodo <= 0) {
    throw new RangeError(`El periodo debe ser un número finito mayor que 0 (recibido: ${periodo})`);
  }
  if (!Number.isFinite(tolerancia) || tolerancia < TOLERANCIA_MINIMA) {
    throw new RangeError(
      `La tolerancia debe ser un número finito mayor o igual que ${TOLERANCIA_MINIMA} (recibida: ${tolerancia})`,
    );
  }
  const pasoMaximo = opciones.pasoMaximo ?? periodo / DIVISIONES_DEL_PERIODO;
  if (!Number.isFinite(pasoMaximo) || pasoMaximo <= 0) {
    throw new RangeError(
      `El paso máximo debe ser un número finito mayor que 0 (recibido: ${pasoMaximo})`,
    );
  }
  const pasosMaximos = opciones.pasosMaximos ?? PASOS_MAXIMOS_POR_DEFECTO;
  if (!Number.isInteger(pasosMaximos) || pasosMaximos < 1) {
    throw new RangeError(
      `El tope de pasos debe ser un entero mayor o igual que 1 (recibido: ${pasosMaximos})`,
    );
  }

  if (estadoInicial.length !== N) {
    throw new Error(
      `El estado inicial debe tener ${N} valores (recibidos: ${estadoInicial.length})`,
    );
  }
  const estado = Float64Array.from(estadoInicial);
  if (!estado.every(Number.isFinite)) {
    throw new Error('El estado inicial contiene valores no finitos (NaN o infinito)');
  }
  for (const [a, b] of [
    [0, 1],
    [0, 2],
    [1, 2],
  ] as const) {
    if (estado[2 * a] === estado[2 * b] && estado[2 * a + 1] === estado[2 * b + 1]) {
      throw new Error(
        `Los cuerpos ${a + 1} y ${b + 1} coinciden en la misma posición inicial: la fuerza no está definida`,
      );
    }
  }

  return { periodo, tolerancia, pasoMaximo, pasosMaximos, estado };
}

/**
 * Integra exactamente un periodo con Runge-Kutta de cuarto orden y duplicación de paso.
 *
 * Cada paso `h` se calcula dos veces: una de golpe (`yA`) y otra en dos mitades (`yB`). El error
 * es la mayor diferencia absoluta entre ambas. Si no supera la tolerancia se acepta `yB`; en
 * cualquier caso el paso siguiente se ajusta al error observado. Los pasos aceptados son los nodos
 * de la trayectoria, así que son más densos donde el movimiento es más rápido.
 */
export function integrarPeriodo(
  orbita: Pick<Orbita, 'periodo' | 'estadoInicial'>,
  opciones: OpcionesIntegracion = {},
): Trayectoria {
  const { periodo, tolerancia, pasoMaximo, pasosMaximos, estado } = validar(orbita, opciones);
  const rk4 = crearPasoRk4();
  const yA = new Float64Array(N);
  const yB = new Float64Array(N);

  let capacidad = 1024;
  let tiempos = new Float64Array(capacidad);
  let estados = new Float64Array(capacidad * N);
  let nodos = 0;

  const guardar = (tiempo: number): void => {
    if (nodos === capacidad) {
      capacidad *= 2;
      const masTiempos = new Float64Array(capacidad);
      masTiempos.set(tiempos);
      tiempos = masTiempos;
      const masEstados = new Float64Array(capacidad * N);
      masEstados.set(estados);
      estados = masEstados;
    }
    tiempos[nodos] = tiempo;
    estados.set(estado, nodos * N);
    nodos++;
  };

  guardar(0);

  let t = 0;
  let h = pasoMaximo / 8;
  let intentos = 0;

  while (t < periodo) {
    if (++intentos > pasosMaximos) {
      throw new Error(
        `La integración no converge: se superó el tope de ${pasosMaximos} pasos en t = ${t}`,
      );
    }

    const restante = periodo - t;
    const esUltimo = h >= restante;
    const paso = esUltimo ? restante : h;

    yA.set(estado);
    rk4(yA, paso);
    yB.set(estado);
    rk4(yB, paso / 2);
    rk4(yB, paso / 2);

    let error = 0;
    for (let i = 0; i < N; i++) {
      error = Math.max(error, Math.abs(yA[i]! - yB[i]!));
    }
    if (!Number.isFinite(error)) {
      throw new Error(
        `La integración no converge: el error no es finito en t = ${t} (¿encuentro casi colisional?)`,
      );
    }

    if (error <= tolerancia) {
      const siguiente = esUltimo ? periodo : t + paso;
      if (!(siguiente > t)) {
        throw new Error(`La integración no converge: el paso no avanza en t = ${t}`);
      }
      t = siguiente;
      estado.set(yB);
      guardar(t);
    }

    const factor = Math.min(
      FACTOR_MAXIMO,
      Math.max(FACTOR_MINIMO, SEGURIDAD * Math.pow(tolerancia / Math.max(error, 1e-300), 0.2)),
    );
    h = Math.min(paso * factor, pasoMaximo);
  }

  // `slice` copia a un buffer propio y de tamaño exacto, listo para transferir a otro hilo.
  const tiemposFinales = tiempos.slice(0, nodos);
  const estadosFinales = estados.slice(0, nodos * N);

  let radioMaximo = 1;
  let distanciaMinima = Infinity;
  let velocidadMaxima = 0;
  for (let i = 0; i < nodos; i++) {
    radioMaximo = Math.max(radioMaximo, radioMaximoEn(estadosFinales, i * N));
    distanciaMinima = Math.min(distanciaMinima, distanciaMinimaEn(estadosFinales, i * N));
    velocidadMaxima = Math.max(velocidadMaxima, velocidadMaximaEn(estadosFinales, i * N));
  }

  return {
    periodo,
    tiempos: tiemposFinales,
    estados: estadosFinales,
    radioMaximo,
    distanciaMinima,
    velocidadMaxima,
  };
}
