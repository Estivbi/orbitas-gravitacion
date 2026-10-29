'use client';

import dynamic from 'next/dynamic';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';
import { CLASES_ETIQUETA_SECCION, CLASES_PANEL } from '../comunes/clases';
import { ControlesLey } from './ControlesLey';
import { EsquemaLey } from './EsquemaLey';

// El chat (y el SDK de IA) se carga en un chunk aparte, solo en cliente.
const PanelTutor = dynamic(() => import('./PanelTutor').then((m) => m.PanelTutor), {
  ssr: false,
  loading: () => <p className="text-silver-mist">Cargando el tutor…</p>,
});

const ID_TITULO = 'titulo-ley';

/** Entre el hero y la galería: la ley manipulable y el tutor que pregunta sobre ella. */
export function SeccionLey() {
  const ley = useAlmacen(selectores.ley);
  const { fijarLey } = useAlmacenApi().getState();
  return (
    <section id="ley" aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-16">
      <p className={`${CLASES_ETIQUETA_SECCION} mb-4`}>Experimento interactivo</p>
      <h2 id={ID_TITULO} className="text-titular-sm mb-4 text-balance">
        La ley de Newton en acción
      </h2>
      <p className="text-silver-mist mb-10 max-w-90">
        Cuanto más pesados son dos cuerpos, más se atraen; cuanto más lejos, menos. Muévelos y
        míralo.
      </p>
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
      <div className="mt-16">
        <PanelTutor />
      </div>
    </section>
  );
}
