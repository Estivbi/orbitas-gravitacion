'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import {
  crearAlmacenInterfaz,
  type AccionesInterfaz,
  type AlmacenInterfaz,
  type EstadoInterfaz,
} from './almacenInterfaz';

const ContextoAlmacen = createContext<AlmacenInterfaz | null>(null);

/**
 * Crea el almacén de interfaz una sola vez por proveedor. Vive en el layout raíz, que no se
 * desmonta al navegar: el estado sobrevive a la navegación cliente y se pierde al recargar.
 */
export function ProveedorAlmacen({ children }: { children: ReactNode }) {
  const [almacen] = useState(() => crearAlmacenInterfaz());

  // En captura, para marcarlo antes de que Next renderice el destino del historial.
  useEffect(() => {
    const alRetroceder = () => almacen.getState().marcarEntradaPorHistorial(true);
    window.addEventListener('popstate', alRetroceder, true);
    return () => window.removeEventListener('popstate', alRetroceder, true);
  }, [almacen]);

  return <ContextoAlmacen value={almacen}>{children}</ContextoAlmacen>;
}

/** Lectura puntual (`getState`) en efectos y manejadores, sin suscripción. */
export function useAlmacenApi(): AlmacenInterfaz {
  const almacen = useContext(ContextoAlmacen);
  if (!almacen) throw new Error('useAlmacenApi debe usarse dentro de ProveedorAlmacen');
  return almacen;
}

/** Suscripción con un selector que devuelve un primitivo (o una referencia estable). */
export function useAlmacen<T>(selector: (estado: EstadoInterfaz & AccionesInterfaz) => T): T {
  return useStore(useAlmacenApi(), selector);
}
