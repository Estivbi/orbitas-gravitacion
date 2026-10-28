/** Preferencia del sistema; el estado inicial de la escena se decide al cargar. */
export function prefiereMovimientoReducido(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
