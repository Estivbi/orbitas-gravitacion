'use client';

import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';
import { CLASES_ETIQUETA_SECCION, CLASES_PANEL } from '../comunes/clases';
import { GuiaSeccion } from '../comunes/GuiaSeccion';
import { EnlaceAccion } from '../comunes/EnlaceAccion';
import { ControlesLey } from './ControlesLey';
import { EsquemaLey } from './EsquemaLey';

const ID_TITULO = 'titulo-ley';

/** Entre el hero y la galería: la ley manipulable. */
export function SeccionLey() {
  const ley = useAlmacen(selectores.ley);
  const { fijarLey } = useAlmacenApi().getState();
  return (
    <section id="ley" aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-16">
      <p className={`${CLASES_ETIQUETA_SECCION} mb-4`}>03 · Experimento interactivo</p>
      <h2 id={ID_TITULO} className="text-titular-sm mb-4 text-balance">
        La ley de Newton en acción
      </h2>
      <p className="text-silver-mist mb-6 max-w-90">
        Cuanto más pesados son dos cuerpos, más se atraen; cuanto más lejos, menos. Es lo que Newton
        dedujo en 1687, y aquí puedes comprobarlo.
      </p>
      <GuiaSeccion
        hacer="Mueve los deslizadores de masa y de distancia, o arrastra la masa de la derecha."
        observar="La fuerza crece cuando aumentan las masas y se hace mucho más pequeña cuando las separas: al doble de distancia, solo la cuarta parte."
      />
      <div className="grid grid-cols-1 items-center gap-6 columnas:grid-cols-[1fr_1.1fr] columnas:gap-10">
        <div className="flex flex-col gap-4">
          <div className={`${CLASES_PANEL} p-4 columnas:p-6`}>
            <ControlesLey ley={ley} alCambiar={fijarLey} />
          </div>
          <p className="text-ash-gray text-etiqueta font-light">
            Fórmula: F = G · m₁ · m₂ / r², con G = 1. Masas, distancia y fuerza van en unidades
            arbitrarias. También puedes arrastrar la masa de la derecha.
          </p>
        </div>
        <EsquemaLey ley={ley} alCambiarDistancia={(r) => fijarLey({ r })} />
      </div>
      <div className="mt-10">
        <EnlaceAccion href="#galeria">Ver las órbitas</EnlaceAccion>
      </div>
    </section>
  );
}
