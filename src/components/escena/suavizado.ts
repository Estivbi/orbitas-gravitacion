import { recortarDt } from '@/lib/escena/numeros';
import type { VistaCamara } from '@/lib/escena/camara';

/** Rapidez de aproximación a la vista objetivo, en 1/s. */
const RAPIDEZ = 8;
/** Por debajo de esta diferencia la vista llega al objetivo de golpe. */
const UMBRAL = 1e-4;
const VUELTA = 2 * Math.PI;

/** Diferencia con signo más corta entre dos ángulos, en [−π, π). */
function diferenciaAngular(desde: number, hasta: number): number {
  return ((((hasta - desde + Math.PI) % VUELTA) + VUELTA) % VUELTA) - Math.PI;
}

function acercar(actual: number, diferencia: number, objetivo: number, paso: number): number {
  return Math.abs(diferencia) < UMBRAL ? objetivo : actual + diferencia * paso;
}

export function vistasIguales(a: VistaCamara, b: VistaCamara): boolean {
  return a.acimut === b.acimut && a.polar === b.polar && a.distancia === b.distancia;
}

/** La vista dibujada persigue a la vista objetivo; el acimut toma el camino más corto. */
export function suavizarVista(actual: VistaCamara, objetivo: VistaCamara, dt: number): VistaCamara {
  const paso = 1 - Math.exp(-RAPIDEZ * recortarDt(dt));
  return {
    acimut: acercar(
      actual.acimut,
      diferenciaAngular(actual.acimut, objetivo.acimut),
      objetivo.acimut,
      paso,
    ),
    polar: acercar(actual.polar, objetivo.polar - actual.polar, objetivo.polar, paso),
    distancia: acercar(
      actual.distancia,
      objetivo.distancia - actual.distancia,
      objetivo.distancia,
      paso,
    ),
  };
}
