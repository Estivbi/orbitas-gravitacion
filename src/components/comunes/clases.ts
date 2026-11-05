/**
 * Contenedor con borde fino y radio de 24 px (DESIGN.md, «Tarjetas»): solo galería y paneles de
 * controles. El borde es `ash-gray` al 30 %: un gris oscuro sin añadir un token de color.
 */
export const CLASES_PANEL = 'rounded-boton border border-ash-gray/30';

/** Etiqueta ámbar que abre cada sección. */
export const CLASES_ETIQUETA_SECCION = 'text-saffron-spark text-etiqueta font-semibold uppercase';

/** Botón con contorno fino (no rellena de color: el violeta queda para las llamadas a la acción). */
export const CLASES_BOTON_CONTORNO =
  'text-bone-white text-etiqueta inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-ash-gray px-6 font-semibold uppercase hover:border-bone-white transition-all';

/** Botón violeta de las llamadas a la acción principales: como mucho uno por sección. */
export const CLASES_BOTON_PRINCIPAL =
  'bg-electric-iris text-bone-white text-etiqueta inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 font-semibold uppercase transition-all';

/** Enlace fantasma: sin contenedor, gris y blanco al pasar el ratón o al enfocar. */
export const CLASES_ENLACE_FANTASMA =
  'text-ash-gray hover:text-bone-white text-etiqueta inline-flex min-h-8 min-w-8 items-center gap-2 font-semibold uppercase';
