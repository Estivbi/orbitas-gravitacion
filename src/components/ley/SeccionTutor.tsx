'use client';

import dynamic from 'next/dynamic';
import { CLASES_ETIQUETA_SECCION } from '../comunes/clases';
import { EnlaceAccion } from '../comunes/EnlaceAccion';

// El chat (y el SDK de IA) se carga en un chunk aparte, solo en cliente.
const PanelTutor = dynamic(() => import('./PanelTutor').then((m) => m.PanelTutor), {
  ssr: false,
  loading: () => <p className="text-silver-mist">Cargando el tutor…</p>,
});

const ID_TITULO = 'titulo-tutor';

/** Sección propia del tutor, tras la galería; comparte el almacén con la ley. */
export function SeccionTutor() {
  return (
    <section id="tutor" aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-16">
      <div className="grid grid-cols-1 items-start gap-6 columnas:grid-cols-[1fr_1.1fr] columnas:gap-10">
        <div className="flex flex-col items-start gap-4">
          <p className={CLASES_ETIQUETA_SECCION}>05 · Tutor</p>
          <h2 id={ID_TITULO} className="text-titular-sm text-balance">
            Tu guía en el aprendizaje
          </h2>
          <p className="text-silver-mist max-w-90">
            Practica con preguntas sobre la ley y avanza a tu ritmo, con ayuda cuando la necesites.
          </p>
          <EnlaceAccion href="#ley" fantasma>
            Volver a la ley
          </EnlaceAccion>
        </div>
        <PanelTutor />
      </div>
    </section>
  );
}
