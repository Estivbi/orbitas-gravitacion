'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { prefiereMovimientoReducido } from './movimiento';

export interface Reproduccion {
  reproduciendo: boolean;
  alternar(): void;
  /** Fija el estado de reproducción (`true` = en marcha), respetando el movimiento reducido. */
  fijar(valor: boolean): void;
}

function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    () => () => {},
    prefiereMovimientoReducido,
    () => false,
  );
}

/**
 * Estado de reproducción de la escena. Con movimiento reducido empieza pausado (la preferencia
 * se lee en el cliente; en el servidor y en la hidratación se asume movimiento normal).
 */
export function useReproduccion(): Reproduccion {
  const reducido = useMovimientoReducido();
  // `alternada` es la desviación respecto al estado inicial: en marcha salvo movimiento reducido.
  const [alternada, setAlternada] = useState(false);
  const reproduciendo = reducido ? alternada : !alternada;

  const alternar = useCallback(() => setAlternada((valor) => !valor), []);
  const fijar = useCallback(
    (valor: boolean) => setAlternada(reducido ? valor : !valor),
    [reducido],
  );
  return { reproduciendo, alternar, fijar };
}
