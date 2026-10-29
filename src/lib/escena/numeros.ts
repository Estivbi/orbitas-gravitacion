/** Mayor `dt` que aceptan el reloj y el giro automático: tras una pausa larga no hay saltos. */
const DT_MAXIMO = 0.25;

export function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

export function recortarDt(dt: number): number {
  return limitar(dt, 0, DT_MAXIMO);
}
