'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { VistaCamara } from '@/lib/escena/camara';
import { debeActualizar } from '@/lib/galeria/telemetria';
import type { PuntoDeReanudacion } from '@/store/almacenInterfaz';

interface OpcionesSesionVisor {
  /** Dónde retomar la órbita en esta sesión: se lee al montar. */
  reanudacion: PuntoDeReanudacion | undefined;
  reproduciendo: boolean;
  /** Al montar el detalle. */
  alMontar: () => void;
  /** Al desmontarlo, solo si la escena llegó a dibujar un fotograma. */
  alSalir: (punto: PuntoDeReanudacion) => void;
}

/**
 * Estado de la sesión del visor, fuera de React: posición y vista de salida, y el ritmo con que se
 * escriben las cifras. Nada de esto provoca un repintado.
 */
export function useSesionVisor({
  reanudacion,
  reproduciendo,
  alMontar,
  alSalir,
}: OpcionesSesionVisor) {
  const [inicio] = useState(() => reanudacion);
  const ultimaPosicion = useRef<number | null>(null);
  const ultimaVista = useRef<VistaCamara | null>(inicio?.vista ?? null);
  const escritura = useRef({ ms: -Infinity, u: NaN });
  const reproduciendoActual = useRef(reproduciendo);
  const llamadas = useRef({ alMontar, alSalir });
  useEffect(() => {
    reproduciendoActual.current = reproduciendo;
    llamadas.current = { alMontar, alSalir };
  });

  useEffect(() => {
    llamadas.current.alMontar();
    return () => {
      const vista = ultimaVista.current;
      if (ultimaPosicion.current !== null && vista) {
        llamadas.current.alSalir({ posicion: ultimaPosicion.current, vista });
      }
    };
  }, []);

  /** Guarda la vista objetivo (la de `alCambiarVista`), no la suavizada. */
  const alCambiarVista = useCallback((vista: Readonly<VistaCamara>) => {
    ultimaVista.current = { ...vista };
  }, []);

  /**
   * Anota la posición del fotograma y decide si toca escribir las cifras: una sola decisión de
   * ritmo por fotograma, para que telemetría y deslizador se escriban juntos.
   */
  const registrarFotograma = useCallback((u: number): boolean => {
    ultimaPosicion.current = u;
    const enMarcha = reproduciendoActual.current;
    const ahora = performance.now();
    if (!debeActualizar(ahora, escritura.current.ms, enMarcha)) return false;
    if (!enMarcha && u === escritura.current.u) return false;
    escritura.current = { ms: ahora, u };
    return true;
  }, []);

  return { inicio, alCambiarVista, registrarFotograma };
}
