import type { Nivel } from './tipos';

/** `racha` > 0 son aciertos seguidos y < 0 son fallos seguidos. */
export interface EstadoNivel {
  nivel: Nivel;
  racha: number;
}

export const ESTADO_NIVEL_INICIAL: EstadoNivel = { nivel: 1, racha: 0 };

const SEGUIDAS = 2;

function acotar(n: number): Nivel {
  return Math.min(3, Math.max(1, n)) as Nivel;
}

export function siguienteNivel(e: EstadoNivel, acierto: boolean): EstadoNivel {
  const racha = acierto ? Math.max(e.racha, 0) + 1 : Math.min(e.racha, 0) - 1;
  if (Math.abs(racha) < SEGUIDAS) return { nivel: e.nivel, racha };
  return { nivel: acotar(e.nivel + (acierto ? 1 : -1)), racha: 0 };
}
