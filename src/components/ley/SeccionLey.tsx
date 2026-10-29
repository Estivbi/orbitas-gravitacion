'use client';

import dynamic from 'next/dynamic';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';
import { ControlesLey } from './ControlesLey';
import { EsquemaLey } from './EsquemaLey';

// El chat (y el SDK de IA) se carga en un chunk aparte, solo en cliente.
const PanelTutor = dynamic(() => import('@/components/tutor/PanelTutor').then((m) => m.PanelTutor), {
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
      <h2 id={ID_TITULO} className="text-titular-sm mb-4 text-balance">
        La ley de Newton
      </h2>
      <p className="text-silver-mist mb-10 max-w-90">
        F = G · m₁ · m₂ / r², con G = 1 en unidades arbitrarias. Mueve las masas y la distancia, o
        arrastra la masa de la derecha.
      </p>
      <div className="grid grid-cols-1 items-center gap-10 columnas:grid-cols-[1fr_1.1fr]">
        <ControlesLey ley={ley} alCambiar={fijarLey} />
        <EsquemaLey ley={ley} alCambiarDistancia={(r) => fijarLey({ r })} />
      </div>
      <div className="mt-16">
        <PanelTutor />
      </div>
    </section>
  );
}
