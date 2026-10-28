'use client';

import { useEffect, useRef, type RefObject } from 'react';
import type { Slug } from '@/lib/fisica/tipos';
import { RUTA_GALERIA } from '@/lib/galeria/navegacion';
import { useAlmacenApi } from '@/store/ProveedorAlmacen';

interface Restauracion {
  slug: Slug | null;
  /** La llegada fue un popstate (atrás o adelante). */
  porHistorial: boolean;
}

const HASH_GALERIA = RUTA_GALERIA.slice(RUTA_GALERIA.indexOf('#'));

/** Cabe entero en la ventana (con 0,5 px de margen). */
function estaEntero(elemento: Element): boolean {
  const r = elemento.getBoundingClientRect();
  return (
    r.top >= -0.5 &&
    r.left >= -0.5 &&
    r.bottom <= window.innerHeight + 0.5 &&
    r.right <= window.innerWidth + 0.5
  );
}

/**
 * Al montar la galería consume siempre `ultimaOrbita`, pero solo enfoca su miniatura (y la centra si
 * no está entera en pantalla) si la llegada trae `#galeria` o es un popstate. El logotipo de la
 * cabecera (`/`) no cumple ninguna de las dos y deja la portada como una carga nueva. Se aplica en
 * un `requestAnimationFrame`, después del desplazamiento propio de Next.
 */
export function useRestaurarFoco(contenedor: RefObject<HTMLElement | null>): void {
  const almacen = useAlmacenApi();
  // Una ref evita perder el valor si React repite el efecto (StrictMode en desarrollo).
  const consumida = useRef<Restauracion | null>(null);

  useEffect(() => {
    if (!consumida.current) {
      const { ultimaOrbita, entradaPorHistorial, olvidarOrbita } = almacen.getState();
      olvidarOrbita();
      consumida.current = { slug: ultimaOrbita, porHistorial: entradaPorHistorial };
    }
    const { slug, porHistorial } = consumida.current;
    if (slug === null) return;

    const cuadro = requestAnimationFrame(() => {
      if (!porHistorial && window.location.hash !== HASH_GALERIA) return;
      const enlace = contenedor.current?.querySelector<HTMLElement>(`a[data-orbita="${slug}"]`);
      if (!enlace) return;
      enlace.focus({ preventScroll: true });
      if (!estaEntero(enlace)) enlace.scrollIntoView({ block: 'center', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(cuadro);
  }, [almacen, contenedor]);
}
