'use client';

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Slug } from '@/lib/fisica/tipos';
import {
  ORDENES,
  avisoDeOrden,
  ordenarGaleria,
  type OrdenGaleria,
  type ResumenOrbita,
} from '@/lib/galeria/orden';
import { selectores } from '@/store/almacenInterfaz';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { SelectorTexto } from '../comunes/SelectorTexto';
import { useRestaurarFoco } from './useRestaurarFoco';

interface PropsGaleriaOrdenable {
  resumenes: readonly ResumenOrbita[];
  /** Un `<li>` por órbita, ya renderizado en el servidor. */
  elementos: Readonly<Record<Slug, ReactNode>>;
}

const OPCIONES = ORDENES.map((orden) => ({ valor: orden.id, texto: orden.etiqueta }));

/**
 * Selector de orden y lista. Lee el orden del almacén al renderizar (no en un efecto): en una
 * navegación cliente la lista ya se pinta en el orden elegido, sin un fotograma con el de catálogo.
 */
export function GaleriaOrdenable({ resumenes, elementos }: PropsGaleriaOrdenable) {
  const almacen = useAlmacenApi();
  const orden = useAlmacen(selectores.ordenGaleria);
  const [elegido, setElegido] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  useRestaurarFoco(contenedor);

  const ordenados = useMemo(() => ordenarGaleria(orden, resumenes), [orden, resumenes]);

  const elegirOrden = (nuevo: OrdenGaleria) => {
    almacen.getState().elegirOrden(nuevo);
    setElegido(true);
  };

  return (
    <div ref={contenedor} className="flex flex-col gap-6">
      <SelectorTexto
        etiqueta="Ordenar por"
        nombre="orden-galeria"
        opciones={OPCIONES}
        valor={orden}
        alCambiar={elegirOrden}
      />
      <p role="status" className="sr-only">
        {elegido ? avisoDeOrden(orden) : ''}
      </p>
      <ul role="list" className="grid grid-cols-2 gap-3 columnas:grid-cols-3 columnas:gap-6">
        {ordenados.map(({ slug }) => (
          <Fragment key={slug}>{elementos[slug]}</Fragment>
        ))}
      </ul>
    </div>
  );
}
