'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import type { VistaCamara } from '@/lib/escena/camara';
import type { TrazadoMiniatura } from '@/lib/escena/miniatura';
import type { Slug, Trayectoria } from '@/lib/fisica';
import { calcularTrayectoria } from '@/workers/clienteFisica';
import { MiniaturaOrbita } from './MiniaturaOrbita';
import { prefiereMovimientoReducido } from './movimiento';

// three viaja en un chunk aparte que no entra en la primera pintura.
const EscenaOrbita = dynamic(() => import('./EscenaOrbita').then((modulo) => modulo.EscenaOrbita), {
  ssr: false,
});

type EstadoEscena = 'cargando' | 'lista' | 'sin-webgl' | 'error';

interface PropsVisorOrbita {
  slug: Slug;
  miniatura: TrazadoMiniatura;
  titulo: string;
  controlAnimacion?: boolean;
}

const INTERVALO_DATOS_MS = 100;

const AVISOS: Partial<Record<EstadoEscena, string>> = {
  'sin-webgl':
    'No se puede mostrar la escena 3D porque este navegador no admite WebGL2. Se muestra un dibujo de la órbita.',
  error: 'No se pudo calcular la órbita. Se muestra un dibujo de la figura.',
};

const INSTRUCCIONES =
  'Arrastra para girar la escena. Con el teclado: flechas para girar, + y − para acercar, Inicio para volver a la vista inicial y espacio para pausar.';

function formatearVista({ acimut, polar, distancia }: Readonly<VistaCamara>): string {
  return `${acimut.toFixed(3)} ${polar.toFixed(3)} ${distancia.toFixed(3)}`;
}

/** Tres decimales sin redondear hacia arriba: la fracción del periodo nunca llega a 1,000. */
function formatearPosicion(u: number): string {
  return (Math.floor(u * 1000) / 1000).toFixed(3);
}

function useMovimientoReducido(): boolean {
  return useSyncExternalStore(
    () => () => {},
    prefiereMovimientoReducido,
    () => false,
  );
}

/** Pide la trayectoria al Worker; si falla, el estado pasa a `error`. */
function useTrayectoria(slug: Slug, alFallar: () => void): Trayectoria | null {
  const [trayectoria, setTrayectoria] = useState<Trayectoria | null>(null);
  useEffect(() => {
    let vigente = true;
    calcularTrayectoria(slug).then(
      (calculada) => {
        if (vigente) setTrayectoria(calculada);
      },
      () => {
        if (vigente) alFallar();
      },
    );
    return () => {
      vigente = false;
    };
  }, [slug, alFallar]);
  return trayectoria;
}

/**
 * Miniatura SVG al instante, escena 3D y trayectoria sin bloquear la primera pintura. Los atributos
 * `data-vista`, `data-posicion` y `data-fotogramas` se escriben directamente en el DOM, sin pasar
 * por el estado de React, para que la vista se actualice de forma síncrona con cada orden.
 */
export function VisorOrbita({
  slug,
  miniatura,
  titulo,
  controlAnimacion = true,
}: PropsVisorOrbita) {
  const [estado, setEstado] = useState<EstadoEscena>('cargando');
  const [alternada, setAlternada] = useState(false);
  const reproduciendo = useMovimientoReducido() ? alternada : !alternada;
  const contenedor = useRef<HTMLDivElement>(null);
  const fotogramas = useRef(0);
  const ultimaEscritura = useRef(0);
  const descripcionId = useId();

  const alFallarElCalculo = useCallback(() => setEstado('error'), []);
  const trayectoria = useTrayectoria(slug, alFallarElCalculo);

  const alCambiarVista = useCallback((vista: Readonly<VistaCamara>) => {
    contenedor.current?.setAttribute('data-vista', formatearVista(vista));
  }, []);

  const reproduciendoActual = useRef(reproduciendo);
  useEffect(() => {
    reproduciendoActual.current = reproduciendo;
  });

  const alFotograma = useCallback((u: number) => {
    fotogramas.current += 1;
    const ahora = performance.now();
    if (reproduciendoActual.current && ahora - ultimaEscritura.current < INTERVALO_DATOS_MS) return;
    ultimaEscritura.current = ahora;
    contenedor.current?.setAttribute('data-posicion', formatearPosicion(u));
    contenedor.current?.setAttribute('data-fotogramas', String(fotogramas.current));
  }, []);

  const alternar = useCallback(() => setAlternada((valor) => !valor), []);
  const fallo = estado === 'sin-webgl' || estado === 'error';

  return (
    <div
      ref={contenedor}
      data-estado-escena={estado}
      data-reproduciendo={String(reproduciendo)}
      className="flex h-full flex-col"
    >
      <div className="relative min-h-60 flex-1 max-columnas:aspect-square max-columnas:max-h-96">
        <MiniaturaOrbita
          trazado={miniatura}
          className={estado === 'lista' ? 'hidden' : 'absolute inset-0 size-full p-8'}
        />
        {trayectoria && !fallo && (
          <EscenaOrbita
            trayectoria={trayectoria}
            etiqueta={`Simulación en 3D de la órbita «${titulo}»: tres cuerpos con su estela de triángulos.`}
            descripcionId={descripcionId}
            reproduciendo={reproduciendo}
            alAlternarReproduccion={alternar}
            giroAutomatico
            alListo={() => setEstado('lista')}
            alFotograma={alFotograma}
            alCambiarVista={alCambiarVista}
            alError={() => setEstado('sin-webgl')}
          />
        )}
      </div>
      {!fallo && (
        <p id={descripcionId} className="text-ash-gray text-etiqueta mt-3 font-light">
          {INSTRUCCIONES}
        </p>
      )}
      <div role="status" className={fallo ? 'text-saffron-spark mt-3' : undefined}>
        {AVISOS[estado]}
      </div>
      {!fallo && (
        <div className="mt-3 min-h-9">
          {estado === 'lista' && controlAnimacion && (
            <button
              type="button"
              onClick={alternar}
              className="bg-electric-iris text-bone-white text-etiqueta min-h-8 min-w-8 cursor-pointer rounded-boton px-6 font-semibold uppercase"
            >
              {reproduciendo ? 'Pausar animación' : 'Reproducir animación'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
