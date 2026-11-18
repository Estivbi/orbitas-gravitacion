'use client';

import { useEffect, useId, useRef } from 'react';
import { PASOS_RECORRIDO, TOTAL_PASOS } from '@/lib/recorrido/pasos';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';
import {
  CLASES_BOTON_CONTORNO,
  CLASES_BOTON_PRINCIPAL,
  CLASES_ENLACE_FANTASMA,
} from '../comunes/clases';
import { prefiereMovimientoReducido } from '../escena/movimiento';

const ATRIBUTO = 'data-recorrido-activo';

/** El botón «Guía» de la cabecera que esté a la vista: destino del foco si el que abrió ya no está. */
function botonGuiaVisible(): HTMLElement | null {
  const botones = document.querySelectorAll<HTMLElement>('[data-boton-guia]');
  return [...botones].find((boton) => boton.offsetParent !== null) ?? null;
}

/**
 * Visita guiada por la portada: una tarjeta no modal con el paso actual y un resalte en la sección
 * que explica. Vive en el layout para poder abrirse desde cualquier sitio.
 */
export function RecorridoGuiado() {
  const { abierto, paso } = useAlmacen(selectores.recorrido);
  const { siguientePaso, pasoAnterior, cerrarRecorrido } = useAlmacenApi().getState();
  const tarjeta = useRef<HTMLDivElement>(null);
  const abridor = useRef<HTMLElement | null>(null);
  const idTitulo = useId();

  // Al abrir, el foco pasa a la tarjeta; al cerrar, vuelve a quien la abrió.
  useEffect(() => {
    if (!abierto) return;
    abridor.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    tarjeta.current?.focus();
    return () => {
      const destino = abridor.current?.isConnected ? abridor.current : botonGuiaVisible();
      destino?.focus();
    };
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrarRecorrido();
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto, cerrarRecorrido]);

  // Resalta la sección del paso actual y la lleva a la vista.
  useEffect(() => {
    if (!abierto) return;
    const elemento = document.querySelector(`[data-recorrido="${PASOS_RECORRIDO[paso]?.id}"]`);
    if (!elemento) return;
    elemento.setAttribute(ATRIBUTO, 'true');
    elemento.scrollIntoView({
      behavior: prefiereMovimientoReducido() ? 'auto' : 'smooth',
      block: 'start',
    });
    return () => elemento.removeAttribute(ATRIBUTO);
  }, [abierto, paso]);

  const actual = PASOS_RECORRIDO[paso];
  if (!abierto || !actual) return null;
  const esUltimo = paso === TOTAL_PASOS - 1;

  return (
    <div
      ref={tarjeta}
      role="dialog"
      aria-labelledby={idTitulo}
      tabIndex={-1}
      className="bg-void border-ash-gray/30 fixed inset-x-0 bottom-0 z-40 flex max-h-3/5 flex-col gap-3 overflow-y-auto rounded-t-boton border p-6 outline-none sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96 sm:rounded-boton"
    >
      <p className="text-saffron-spark text-etiqueta font-semibold uppercase">
        Paso {paso + 1} de {TOTAL_PASOS}
      </p>
      <h2 id={idTitulo} className="text-titular-xs text-balance">
        {actual.titulo}
      </h2>
      <p className="text-silver-mist">{actual.texto}</p>
      <p>
        <span className="text-saffron-spark text-etiqueta font-semibold uppercase">
          Qué hacer ·{' '}
        </span>
        {actual.hacer}
      </p>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={pasoAnterior}
          disabled={paso === 0}
          className={`${CLASES_BOTON_CONTORNO} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={esUltimo ? cerrarRecorrido : siguientePaso}
          className={CLASES_BOTON_PRINCIPAL}
        >
          {esUltimo ? 'Terminar' : 'Siguiente'}
        </button>
        <button
          type="button"
          onClick={cerrarRecorrido}
          className={`${CLASES_ENLACE_FANTASMA} cursor-pointer sm:ml-auto`}
        >
          Saltar
        </button>
      </div>
    </div>
  );
}
