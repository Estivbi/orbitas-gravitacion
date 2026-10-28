import type { Orbita } from './tipos';

/** Estado de las órbitas con parámetros: cuerpos en (−1, 0), (1, 0) y (0, 0), con v1 = v2 y v3 = −2 v1. */
function conVelocidad(vx: number, vy: number): readonly number[] {
  return Object.freeze([-1, 0, 1, 0, 0, 0, vx, vy, vx, vy, -2 * vx, -2 * vy]);
}

/** Tres cuerpos a radio 1 en 90°, 210° y 330°, con velocidad tangencial ω = 3^(−1/4). */
function lagrange(): readonly number[] {
  const omega = Math.pow(3, -0.25);
  const estado: number[] = new Array<number>(12).fill(0);
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    const angulo = Math.PI / 2 + (cuerpo * 2 * Math.PI) / 3;
    estado[2 * cuerpo] = Math.cos(angulo);
    estado[2 * cuerpo + 1] = Math.sin(angulo);
    estado[6 + 2 * cuerpo] = -omega * Math.sin(angulo);
    estado[7 + 2 * cuerpo] = omega * Math.cos(angulo);
  }
  return Object.freeze(estado);
}

const ARTICULO = 'Šuvakov y Dmitrašinović, 2013';

export const ORBITAS: readonly Orbita[] = Object.freeze([
  {
    slug: 'lagrange',
    nombre: 'Lagrange',
    periodo: 2 * Math.PI * Math.pow(3, 0.25),
    estadoInicial: lagrange(),
    descripcion:
      'Los tres cuerpos forman un triángulo equilátero que gira como un sólido rígido. Es una de las pocas soluciones con fórmula exacta.',
    credito: 'Lagrange, 1772',
  },
  {
    slug: 'figura-de-ocho',
    nombre: 'Figura de ocho',
    periodo: 6.32591398,
    estadoInicial: conVelocidad(0.34711689, 0.53272494),
    descripcion:
      'Los tres cuerpos recorren la misma curva en forma de ocho, uno detrás de otro. La halló Moore por ordenador en 1993 y la demostraron Chenciner y Montgomery en 2000.',
    credito: 'Moore, 1993 · Chenciner y Montgomery, 2000',
  },
  {
    slug: 'butterfly-i',
    nombre: 'Butterfly I',
    periodo: 6.2356,
    estadoInicial: conVelocidad(0.30689, 0.12551),
    descripcion:
      'Lazos que recuerdan a las alas de una mariposa. Pertenece a la familia de órbitas halladas numéricamente en 2013.',
    credito: `${ARTICULO} (Tabla I, I.A.1)`,
  },
  {
    slug: 'goggles',
    nombre: 'Goggles',
    periodo: 10.4668,
    estadoInicial: conVelocidad(0.0833, 0.12789),
    descripcion:
      'Dos lóbulos que recuerdan a unas gafas de buceo. Hallada en 2013 con el mismo método de búsqueda numérica.',
    credito: `${ARTICULO} (Tabla I, I.B.5)`,
  },
  {
    slug: 'moth-i',
    nombre: 'Moth I',
    periodo: 14.8939,
    estadoInicial: conVelocidad(0.46444, 0.39606),
    descripcion:
      'Un recorrido largo y entrelazado que recuerda a una polilla. Es de las de periodo más largo de la galería.',
    credito: `${ARTICULO} (Tabla I, I.B.1)`,
  },
  {
    slug: 'yin-yang-i',
    nombre: 'Yin-Yang I',
    periodo: 17.3284,
    estadoInicial: conVelocidad(0.51394, 0.30474),
    descripcion:
      'Trayectorias que se cruzan como el símbolo del yin y el yang. Es la variante a de la familia hallada en 2013; la variante b es la misma órbita a otra escala de espacio y tiempo.',
    credito: `${ARTICULO} (Tabla I, II.C.2a)`,
  },
]);

export function obtenerOrbita(slug: string): Orbita | undefined {
  return ORBITAS.find((orbita) => orbita.slug === slug);
}
