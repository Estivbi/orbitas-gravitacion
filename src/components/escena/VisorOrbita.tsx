'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { VistaCamara } from '@/lib/escena/camara';
import type { TrazadoMiniatura } from '@/lib/escena/miniatura';
import type { Estado, Slug, Trayectoria } from '@/lib/fisica';
import { calcularTrayectoria } from '@/workers/clienteFisica';
import { BotonAnimacion } from '../comunes/BotonAnimacion';
import { MiniaturaOrbita } from './MiniaturaOrbita';
import type { ApiEscena } from './tipos';
import { useReproduccion } from './useReproduccion';

// three viaja en un chunk aparte que no entra en la primera pintura.
const EscenaOrbita = dynamic(() => import('./EscenaOrbita').then((modulo) => modulo.EscenaOrbita), {
  ssr: false,
});

export type EstadoEscena = 'cargando' | 'lista' | 'sin-webgl' | 'error';

interface PropsVisorOrbita {
  slug: Slug;
  miniatura: TrazadoMiniatura;
  titulo: string;
  /** Botón de pausa propio del visor. Por defecto `true`; `false` en el detalle, que lo reubica. */
  controlAnimacion?: boolean;
  /** Por defecto `true`; `false` en el detalle. */
  giroAutomatico?: boolean;
  /** Por defecto `compacto` (portada). */
  tamano?: 'compacto' | 'grande';
  /** Si se pasa, la reproducción la controla quien llama; si no, el visor tiene estado propio. */
  reproduciendo?: boolean;
  alAlternarReproduccion?: () => void;
  velocidad?: number;
  longitudEstela?: number;
  posicionInicial?: number;
  vistaInicial?: VistaCamara;
  vistaRestablecida?: VistaCamara;
  alCambiarEstado?: (estado: EstadoEscena) => void;
  /** Además de pasar a `lista`. */
  alListo?: (api: ApiEscena) => void;
  /** En cada fotograma, antes del filtro de 100 ms de los `data-*`. El buffer se reutiliza: no guardarlo. */
  alFotograma?: (u: number, estado: Readonly<Estado>) => void;
  /** Además de escribir `data-vista`. */
  alCambiarVista?: (vista: Readonly<VistaCamara>) => void;
}

const INTERVALO_DATOS_MS = 100;

const AVISOS: Partial<Record<EstadoEscena, string>> = {
  'sin-webgl':
    'No se puede mostrar la escena 3D porque este navegador no admite WebGL2. Se muestra un dibujo de la órbita.',
  error: 'No se pudo calcular la órbita. Se muestra un dibujo de la figura.',
};

const INSTRUCCIONES =
  'Arrastra para girar la escena. Con el teclado: flechas para girar, + y − para acercar, Inicio para volver a la vista inicial y espacio para pausar.';

const CLASES_CONTENEDOR: Record<NonNullable<PropsVisorOrbita['tamano']>, string> = {
  compacto: 'flex h-full flex-col',
  grande: 'flex flex-col',
};

const CLASES_LIENZO: Record<NonNullable<PropsVisorOrbita['tamano']>, string> = {
  compacto: 'relative min-h-60 flex-1 max-columnas:aspect-square max-columnas:max-h-96',
  grande:
    'relative min-h-60 flex-1 columnas:min-h-80 max-columnas:aspect-square max-columnas:max-h-96',
};

function formatearVista({ acimut, polar, distancia }: Readonly<VistaCamara>): string {
  return `${acimut.toFixed(3)} ${polar.toFixed(3)} ${distancia.toFixed(3)}`;
}

/** Tres decimales sin redondear hacia arriba: la fracción del periodo nunca llega a 1,000. */
function formatearPosicion(u: number): string {
  return (Math.floor(u * 1000) / 1000).toFixed(3);
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
  giroAutomatico = true,
  tamano = 'compacto',
  reproduciendo: reproduciendoControlado,
  alAlternarReproduccion,
  velocidad,
  longitudEstela,
  posicionInicial,
  vistaInicial,
  vistaRestablecida,
  alCambiarEstado,
  alListo,
  alFotograma,
  alCambiarVista,
}: PropsVisorOrbita) {
  const [estado, setEstado] = useState<EstadoEscena>('cargando');
  // En el detalle un dedo gira en todos los planos; en la portada se desplaza la página con normalidad.
  const giroLibre = tamano === 'grande';
  const propia = useReproduccion();
  const controlado = reproduciendoControlado !== undefined;
  const reproduciendo = controlado ? reproduciendoControlado : propia.reproduciendo;
  const alternar = controlado ? (alAlternarReproduccion ?? sinAccion) : propia.alternar;
  const contenedor = useRef<HTMLDivElement>(null);
  const fotogramas = useRef(0);
  const ultimaEscritura = useRef(0);
  const descripcionId = useId();

  // Las funciones de quien llama se leen siempre en su última versión, sin recrear la escena.
  const llamadas = useRef({ alCambiarEstado, alListo, alFotograma, alCambiarVista });
  const reproduciendoActual = useRef(reproduciendo);
  useEffect(() => {
    llamadas.current = { alCambiarEstado, alListo, alFotograma, alCambiarVista };
    reproduciendoActual.current = reproduciendo;
  });

  const cambiarEstado = useCallback((nuevo: EstadoEscena) => {
    setEstado(nuevo);
    llamadas.current.alCambiarEstado?.(nuevo);
  }, []);

  const alFallarElCalculo = useCallback(() => cambiarEstado('error'), [cambiarEstado]);
  const trayectoria = useTrayectoria(slug, alFallarElCalculo);

  const alListoLaEscena = useCallback(
    (api: ApiEscena) => {
      cambiarEstado('lista');
      llamadas.current.alListo?.(api);
    },
    [cambiarEstado],
  );

  const alErrorDeLaEscena = useCallback(() => cambiarEstado('sin-webgl'), [cambiarEstado]);

  const alCambiarLaVista = useCallback((vista: Readonly<VistaCamara>) => {
    contenedor.current?.setAttribute('data-vista', formatearVista(vista));
    llamadas.current.alCambiarVista?.(vista);
  }, []);

  const alCadaFotograma = useCallback((u: number, estadoFisico: Readonly<Estado>) => {
    fotogramas.current += 1;
    llamadas.current.alFotograma?.(u, estadoFisico);
    const ahora = performance.now();
    if (reproduciendoActual.current && ahora - ultimaEscritura.current < INTERVALO_DATOS_MS) return;
    ultimaEscritura.current = ahora;
    contenedor.current?.setAttribute('data-posicion', formatearPosicion(u));
    contenedor.current?.setAttribute('data-fotogramas', String(fotogramas.current));
  }, []);

  const fallo = estado === 'sin-webgl' || estado === 'error';

  return (
    <div
      ref={contenedor}
      data-estado-escena={estado}
      data-reproduciendo={String(reproduciendo)}
      className={CLASES_CONTENEDOR[tamano]}
    >
      <div className={CLASES_LIENZO[tamano]}>
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
            velocidad={velocidad}
            longitudEstela={longitudEstela}
            posicionInicial={posicionInicial}
            vistaInicial={vistaInicial}
            vistaRestablecida={vistaRestablecida}
            giroAutomatico={giroAutomatico}
            giroLibre={giroLibre}
            alListo={alListoLaEscena}
            alFotograma={alCadaFotograma}
            alCambiarVista={alCambiarLaVista}
            alError={alErrorDeLaEscena}
          />
        )}
      </div>
      {!fallo && (
        <p
          id={descripcionId}
          className={
            tamano === 'compacto' ? 'sr-only' : 'text-ash-gray text-etiqueta mt-3 font-light'
          }
        >
          {INSTRUCCIONES}
        </p>
      )}
      <div role="status" className={fallo ? 'text-saffron-spark mt-3' : undefined}>
        {AVISOS[estado]}
      </div>
      {!fallo && controlAnimacion && (
        <div className="mt-3 flex min-h-9 justify-center">
          {estado === 'lista' && (
            <BotonAnimacion
              reproduciendo={reproduciendo}
              alAlternar={alternar}
              discreto={tamano === 'compacto'}
            />
          )}
        </div>
      )}
    </div>
  );
}

function sinAccion(): void {}
