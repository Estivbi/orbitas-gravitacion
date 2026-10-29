/** Reglas del cliente del tutor (puras, sin React). */
export const COOLDOWN_MS = 2000;
export const MAX_MENSAJES = 20;

export interface EstadoEnvio {
  enviando: boolean;
  ultimoEnvio: number | null;
  mensajes: number;
}

export type ResultadoEnvio = { ok: true } | { ok: false; motivo: 'enviando' | 'espera' | 'lleno' };

/** Decide si se puede enviar un mensaje. Prioridad: lleno, enviando, espera. */
export function puedeEnviar(estado: EstadoEnvio, ahora: number): ResultadoEnvio {
  if (estado.mensajes >= MAX_MENSAJES) return { ok: false, motivo: 'lleno' };
  if (estado.enviando) return { ok: false, motivo: 'enviando' };
  if (estado.ultimoEnvio !== null && ahora - estado.ultimoEnvio < COOLDOWN_MS) {
    return { ok: false, motivo: 'espera' };
  }
  return { ok: true };
}
