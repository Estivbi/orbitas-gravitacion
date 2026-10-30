import { CLASES_ETIQUETA_SECCION } from './clases';
import { EnlaceAccion } from './EnlaceAccion';

const ID_TITULO = 'titulo-final';

/** Llamada final antes del pie: solo texto y espacio. */
export function BannerFinal() {
  return (
    <section aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-24">
      <div className="flex flex-col items-start gap-4">
        <p className={CLASES_ETIQUETA_SECCION}>¿Listo para explorar?</p>
        <h2 id={ID_TITULO} className="text-titular-sm text-balance">
          El universo te está esperando.
        </h2>
        <div className="mt-2">
          <EnlaceAccion href="#contenido">Comenzar ahora</EnlaceAccion>
        </div>
      </div>
    </section>
  );
}
