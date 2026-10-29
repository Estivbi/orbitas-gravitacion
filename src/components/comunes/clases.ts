/**
 * Contenedor con borde fino y radio de 24 px (DESIGN.md, «Tarjetas»): solo galería y paneles de
 * controles. El borde es `ash-gray` al 30 %: un gris oscuro sin añadir un token de color.
 */
export const CLASES_PANEL = 'rounded-boton border border-ash-gray/30';

/** Etiqueta ámbar que abre cada sección. */
export const CLASES_ETIQUETA_SECCION = 'text-saffron-spark text-etiqueta font-semibold uppercase';

/** Botón con contorno fino (no rellena de color: el violeta queda para una sola acción por vista). */
export const CLASES_BOTON_CONTORNO =
  'text-bone-white text-etiqueta inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-boton border border-ash-gray px-6 font-semibold uppercase hover:border-bone-white';

/** El botón relleno de la vista. */
export const CLASES_BOTON_PRINCIPAL =
  'bg-electric-iris text-bone-white text-etiqueta inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-boton px-6 font-semibold uppercase';
