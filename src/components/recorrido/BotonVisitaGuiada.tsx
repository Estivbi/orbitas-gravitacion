'use client';

import { useAlmacenApi } from '@/store/ProveedorAlmacen';
import { CLASES_ENLACE_FANTASMA } from '../comunes/clases';
import { useHidratado } from './useHidratado';

/** Invitación discreta del hero: la visita se ofrece, no se impone. */
export function BotonVisitaGuiada() {
  const { abrirRecorrido } = useAlmacenApi().getState();
  const hidratado = useHidratado();
  return (
    <button
      type="button"
      onClick={abrirRecorrido}
      className={`${CLASES_ENLACE_FANTASMA} cursor-pointer ${hidratado ? '' : 'invisible'}`}
    >
      ¿Primera vez? Haz la visita guiada
    </button>
  );
}
