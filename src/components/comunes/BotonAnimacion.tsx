interface PropsBotonAnimacion {
  reproduciendo: boolean;
  alAlternar: () => void;
}

/** El único botón relleno de la vista: pausa o reanuda la animación. */
export function BotonAnimacion({ reproduciendo, alAlternar }: PropsBotonAnimacion) {
  return (
    <button
      type="button"
      onClick={alAlternar}
      className="bg-electric-iris text-bone-white text-etiqueta min-h-8 min-w-8 cursor-pointer rounded-boton px-6 font-semibold uppercase"
    >
      {reproduciendo ? 'Pausar animación' : 'Reproducir animación'}
    </button>
  );
}
