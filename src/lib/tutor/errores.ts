export const MENSAJES = {
  clave: 'El tutor no está disponible: la clave del modelo no es válida.',
  cuota: 'Límite de uso del modelo alcanzado: modo reducido.',
  red: 'No se pudo conectar con el modelo de lenguaje. Inténtalo de nuevo en un momento.',
  otro: 'El tutor no pudo responder. Inténtalo de nuevo.',
  limite: 'Demasiadas peticiones. Espera un poco antes de volver a preguntar.',
  reducido: 'No hay modelo de lenguaje disponible: modo reducido.',
} as const;

function estado(causa: unknown): number | undefined {
  for (let actual = causa, i = 0; actual && typeof actual === 'object' && i < 4; i++) {
    const o = actual as { statusCode?: unknown; lastError?: unknown; cause?: unknown };
    if (typeof o.statusCode === 'number') return o.statusCode;
    actual = o.lastError ?? o.cause;
  }
  return undefined;
}

function esDeRed(causa: unknown): boolean {
  const texto = causa instanceof Error ? `${causa.name} ${causa.message}` : '';
  return /fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|timeout/i.test(texto);
}

/** Texto en castellano para el cliente; nunca incluye el mensaje original. */
export function mensajeDeError(causa: unknown): string {
  const codigo = estado(causa);
  if (codigo === 401 || codigo === 403) return MENSAJES.clave;
  if (codigo === 429) return MENSAJES.cuota;
  if (codigo === undefined && esDeRed(causa)) return MENSAJES.red;
  return MENSAJES.otro;
}

/** El cliente la usa con el texto de un error del chat para pasar a modo reducido. */
export function senalaModoReducido(texto: string): boolean {
  return [MENSAJES.cuota, MENSAJES.limite, MENSAJES.reducido].some((m) => texto.includes(m));
}
