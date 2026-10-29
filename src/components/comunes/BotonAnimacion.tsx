import { CLASES_BOTON_CONTORNO, CLASES_BOTON_PRINCIPAL } from './clases';

interface PropsBotonAnimacion {
  reproduciendo: boolean;
  alAlternar: () => void;
  /** En la portada el botón va con contorno: el violeta queda para la acción principal. */
  discreto?: boolean;
}

/** Pausa o reanuda la animación. En el detalle es el único botón relleno de la vista. */
export function BotonAnimacion({
  reproduciendo,
  alAlternar,
  discreto = false,
}: PropsBotonAnimacion) {
  return (
    <button
      type="button"
      onClick={alAlternar}
      className={discreto ? CLASES_BOTON_CONTORNO : CLASES_BOTON_PRINCIPAL}
    >
      {reproduciendo ? 'Pausar animación' : 'Reproducir animación'}
    </button>
  );
}
