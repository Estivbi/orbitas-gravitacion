// Los índices están acotados por construcción (un estado tiene siempre 12 valores), así que
// el núcleo numérico usa `!` en lugar de comprobar `undefined` en cada lectura.

/**
 * Derivada temporal de un estado: las posiciones cambian con la velocidad y las velocidades
 * con la atracción newtoniana entre pares (masas 1, G = 1).
 *
 * `desplazamiento` permite leer un nodo dentro de un array grande sin copiarlo. La salida
 * tiene el mismo formato que un estado: velocidades en 0-5 y aceleraciones en 6-11.
 */
export function derivada(y: Float64Array, desplazamiento: number, salida: Float64Array): void {
  const d = desplazamiento;
  const x1 = y[d]!;
  const y1 = y[d + 1]!;
  const x2 = y[d + 2]!;
  const y2 = y[d + 3]!;
  const x3 = y[d + 4]!;
  const y3 = y[d + 5]!;

  let a1x = 0;
  let a1y = 0;
  let a2x = 0;
  let a2y = 0;
  let a3x = 0;
  let a3y = 0;

  let dx = x2 - x1;
  let dy = y2 - y1;
  let r2 = dx * dx + dy * dy;
  let k = 1 / (r2 * Math.sqrt(r2));
  a1x += dx * k;
  a1y += dy * k;
  a2x -= dx * k;
  a2y -= dy * k;

  dx = x3 - x1;
  dy = y3 - y1;
  r2 = dx * dx + dy * dy;
  k = 1 / (r2 * Math.sqrt(r2));
  a1x += dx * k;
  a1y += dy * k;
  a3x -= dx * k;
  a3y -= dy * k;

  dx = x3 - x2;
  dy = y3 - y2;
  r2 = dx * dx + dy * dy;
  k = 1 / (r2 * Math.sqrt(r2));
  a2x += dx * k;
  a2y += dy * k;
  a3x -= dx * k;
  a3y -= dy * k;

  for (let i = 0; i < 6; i++) {
    salida[i] = y[d + 6 + i]!;
  }
  salida[6] = a1x;
  salida[7] = a1y;
  salida[8] = a2x;
  salida[9] = a2y;
  salida[10] = a3x;
  salida[11] = a3y;
}
