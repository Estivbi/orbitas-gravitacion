'use client';

import { useEffect, useRef } from 'react';
import { montarEscena } from './montarEscena';
import type { PropsEscenaOrbita } from './tipos';

export type { ApiEscena, PropsEscenaOrbita } from './tipos';

const PARTICULAS_POR_DEFECTO = 300;

function comoError(causa: unknown): Error {
  return causa instanceof Error ? causa : new Error(String(causa));
}

/**
 * Escena 3D de una órbita. El lienzo lo crea three en cada montaje; las props que cambian con el
 * tiempo (reproducción, velocidad, estela…) se leen dentro del bucle sin recrear el renderer.
 */
export function EscenaOrbita(props: PropsEscenaOrbita) {
  const anfitrion = useRef<HTMLDivElement>(null);
  const propsActuales = useRef(props);
  useEffect(() => {
    propsActuales.current = props;
  });

  const { trayectoria, etiqueta, descripcionId } = props;
  const particulas = props.particulasAmbientales ?? PARTICULAS_POR_DEFECTO;
  useEffect(() => {
    const host = anfitrion.current;
    if (!host) return;
    try {
      return montarEscena(
        host,
        { trayectoria, etiqueta, descripcionId, particulas },
        () => propsActuales.current,
      );
    } catch (causa) {
      propsActuales.current.alError?.(comoError(causa));
    }
  }, [trayectoria, etiqueta, descripcionId, particulas]);

  return <div ref={anfitrion} className="absolute inset-0" />;
}
