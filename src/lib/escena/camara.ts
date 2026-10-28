import { limitar, recortarDt } from './numeros';

/** `distancia` es un múltiplo de la distancia inicial. */
export interface VistaCamara {
  acimut: number;
  polar: number;
  distancia: number;
}

export const VISTA_INICIAL: VistaCamara = { acimut: 0.6, polar: 1.0, distancia: 1 };

export const POLAR_MINIMO = 0.12;
export const POLAR_MAXIMO = Math.PI - 0.12;
export const DISTANCIA_MINIMA = 1.6 / 3.3;
export const DISTANCIA_MAXIMA = 10 / 3.3;
export const VELOCIDAD_GIRO_AUTOMATICO = 0.06;

const VUELTA = 2 * Math.PI;
const RADIANES_POR_PIXEL = 0.008;
const SENSIBILIDAD_RUEDA = 0.0012;

export type OrdenCamara =
  | { tipo: 'girar'; dAcimut: number; dPolar: number }
  | { tipo: 'acercar'; factor: number }
  | { tipo: 'restablecer' };

export interface Modificadores {
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
}

const SIN_MODIFICADORES: Modificadores = { ctrl: false, meta: false, alt: false };

function girar(dAcimut: number, dPolar: number): OrdenCamara {
  return { tipo: 'girar', dAcimut, dPolar };
}

function acercar(factor: number): OrdenCamara {
  return { tipo: 'acercar', factor };
}

/** Órdenes del teclado; `'alternar'` pausa o reanuda y no es una orden de cámara. */
export function ordenDeTecla(
  tecla: string,
  modificadores: Modificadores = SIN_MODIFICADORES,
): OrdenCamara | 'alternar' | null {
  if (modificadores.ctrl || modificadores.meta || modificadores.alt) return null;
  switch (tecla) {
    case 'ArrowLeft':
      return girar(-0.14, 0);
    case 'ArrowRight':
      return girar(0.14, 0);
    case 'ArrowUp':
      return girar(0, -0.1);
    case 'ArrowDown':
      return girar(0, 0.1);
    case '+':
    case '=':
      return acercar(0.88);
    case '-':
      return acercar(1.14);
    case 'Home':
      return { tipo: 'restablecer' };
    case ' ':
      return 'alternar';
    default:
      return null;
  }
}

export function ordenDeArrastre(dx: number, dy: number): OrdenCamara {
  return girar(-dx * RADIANES_POR_PIXEL, -dy * RADIANES_POR_PIXEL);
}

export function ordenDeRueda(deltaY: number): OrdenCamara {
  return acercar(Math.exp(deltaY * SENSIBILIDAD_RUEDA));
}

/** Acerca cuando los dedos se separan; `null` si alguna separación no es positiva. */
export function ordenDePellizco(
  separacionAnterior: number,
  separacionActual: number,
): OrdenCamara | null {
  if (separacionAnterior <= 0 || separacionActual <= 0) return null;
  return acercar(separacionAnterior / separacionActual);
}

/** Acimut en [0, 2π): un valor que redondea a 2π (por ejemplo −1e-17) vale 0. */
function normalizarAcimut(acimut: number): number {
  const resto = acimut % VUELTA;
  const positivo = resto < 0 ? resto + VUELTA : resto;
  return positivo >= VUELTA ? 0 : positivo;
}

export function girarAutomaticamente(vista: VistaCamara, dt: number): VistaCamara {
  const acimut = vista.acimut + VELOCIDAD_GIRO_AUTOMATICO * recortarDt(dt);
  return { ...vista, acimut: normalizarAcimut(acimut) };
}

export function aplicarOrden(vista: VistaCamara, orden: OrdenCamara): VistaCamara {
  switch (orden.tipo) {
    case 'girar':
      return {
        ...vista,
        acimut: normalizarAcimut(vista.acimut + orden.dAcimut),
        polar: limitar(vista.polar + orden.dPolar, POLAR_MINIMO, POLAR_MAXIMO),
      };
    case 'acercar':
      return {
        ...vista,
        distancia: limitar(vista.distancia * orden.factor, DISTANCIA_MINIMA, DISTANCIA_MAXIMA),
      };
    case 'restablecer':
      return { ...VISTA_INICIAL };
  }
}

/** Distancia que encuadra toda la órbita; en pantallas verticales se aleja para que quepa a lo ancho. */
export function distanciaInicial(radioMaximo: number, relacionAspecto: number): number {
  const ajusteVertical = relacionAspecto < 1 ? 1 / Math.max(relacionAspecto, 0.55) : 1;
  return 3.3 * radioMaximo * ajusteVertical;
}

/** Esféricas con z arriba, a `vista.distancia · distanciaBase` del origen. */
export function posicionCamara(
  vista: VistaCamara,
  distanciaBase: number,
): [number, number, number] {
  const d = vista.distancia * distanciaBase;
  const radioHorizontal = d * Math.sin(vista.polar);
  return [
    radioHorizontal * Math.cos(vista.acimut),
    radioHorizontal * Math.sin(vista.acimut),
    d * Math.cos(vista.polar),
  ];
}
