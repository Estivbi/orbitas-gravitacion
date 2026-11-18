'use client';

import dynamic from 'next/dynamic';
import { useAlmacen } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';

// Los textos y la tarjeta solo se descargan cuando alguien abre la visita.
const RecorridoGuiado = dynamic(
  () => import('./RecorridoGuiado').then((modulo) => modulo.RecorridoGuiado),
  { ssr: false },
);

export function RecorridoCargado() {
  const { abierto } = useAlmacen(selectores.recorrido);
  return abierto ? <RecorridoGuiado /> : null;
}
