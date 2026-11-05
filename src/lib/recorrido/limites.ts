/** Número de pasos de la visita y su límite, aparte de los textos para no cargarlos con el almacén. */
export const TOTAL_PASOS = 6;

/** Entero entre 0 y el último paso; lo que no es un número pasa al primero. */
export function limitarPaso(paso: number): number {
  if (!Number.isFinite(paso)) return 0;
  return Math.min(TOTAL_PASOS - 1, Math.max(0, Math.floor(paso)));
}
