import type { Velocidad } from './controles';

const MENOS = '−';
/** Espacio duro: el «%» nunca queda solo en la línea siguiente. */
const ESPACIO_DURO = ' ';
const SIN_DATO = '—';

/** Margen para que 0,29 (que en binario es 0,28999…) no se trunque a 0,28. */
const TOLERANCIA = 1e-9;

/** Cifra con coma decimal y signo menos U+2212; un valor que redondea a cero no lleva signo. */
export function formatearCifra(valor: number, decimales: number): string {
  if (!Number.isFinite(valor)) return SIN_DATO;
  const texto = valor.toFixed(decimales);
  const sinSigno = /^-0(\.0+)?$/.test(texto) ? texto.slice(1) : texto;
  return sinSigno.replace('-', MENOS).replace('.', ',');
}

/** Parte entera y décimas de un número de décimas ya truncado. */
function componerDecimas(decimas: number): string {
  return `${Math.floor(decimas / 10)},${decimas % 10}`;
}

/** Fase en porcentaje con un decimal, truncada y sin llegar nunca a 100,0 %. */
export function formatearPorcentaje(u: number): string {
  if (!Number.isFinite(u)) return SIN_DATO;
  const decimas = Math.min(Math.floor(Math.max(u, 0) * 1000 + TOLERANCIA), 999);
  return `${componerDecimas(decimas)}${ESPACIO_DURO}%`;
}

/** Tiempo con dos decimales, truncado (nunca alcanza el valor siguiente). */
export function formatearTiempo(tiempo: number): string {
  if (!Number.isFinite(tiempo)) return SIN_DATO;
  const centesimas = Math.floor(Math.max(tiempo, 0) * 100 + TOLERANCIA);
  const decimales = String(centesimas % 100).padStart(2, '0');
  return `${Math.floor(centesimas / 100)},${decimales}`;
}

/** Texto del deslizador de posición, p. ej. «50,0 % del periodo (t = 3,16 de 6,33)». */
export function textoPosicion(u: number, periodo: number): string {
  return `${formatearPorcentaje(u)} del periodo (t = ${formatearTiempo(u * periodo)} de ${formatearCifra(periodo, 2)})`;
}

/** Texto del deslizador de estela, p. ej. «50 % del periodo» (espacio normal antes de «%»). */
export function textoEstela(longitud: number): string {
  return `${Math.round(longitud * 100)} % del periodo`;
}

/** «0,25×», «0,5×», «1×», «2×», «4×». */
export function textoVelocidad(velocidad: Velocidad): string {
  return `${String(velocidad).replace('.', ',')}×`;
}
