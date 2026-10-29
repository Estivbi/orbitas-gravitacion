import { SLUGS, type Slug } from '@/lib/fisica/tipos';
import { fichaDeOrbita, resumirCatalogo } from '@/lib/galeria/fichas';
import type { ReactNode } from 'react';
import { CLASES_ETIQUETA_SECCION } from '../comunes/clases';
import { GuiaSeccion } from '../comunes/GuiaSeccion';
import { EnlaceAccion } from '../comunes/EnlaceAccion';
import { ElementoGaleria } from './ElementoGaleria';
import { GaleriaOrdenable } from './GaleriaOrdenable';

const ID_TITULO = 'titulo-galeria';

/** Las seis soluciones, calculadas en el servidor: el HTML ya trae cada figura dibujada. */
export function Galeria() {
  const elementos = Object.fromEntries(
    SLUGS.map((slug) => [slug, <ElementoGaleria key={slug} ficha={fichaDeOrbita(slug)} />]),
  ) as Record<Slug, ReactNode>;
  return (
    <section id="galeria" aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-16">
      <div className="mb-10 grid grid-cols-1 items-end gap-4 columnas:grid-cols-2 columnas:gap-10">
        <div className="flex flex-col gap-4">
          <p className={CLASES_ETIQUETA_SECCION}>04 · Galería de órbitas</p>
          <h2 id={ID_TITULO} className="text-titular-sm text-balance">
            Seis órbitas, una misma ley.
          </h2>
        </div>
        <p className="text-silver-mist max-w-90">
          Explora distintas soluciones del problema de los tres cuerpos: tres masas que se atraen y
          repiten su recorrido sin fin.
        </p>
      </div>
      <GuiaSeccion
        hacer="Toca una órbita para verla moverse en 3D y controlar la reproducción."
        observar="Las reglas son las mismas en las seis, pero cada una dibuja un recorrido distinto, y todas se repiten sin fin."
      />
      <GaleriaOrdenable resumenes={resumirCatalogo()} elementos={elementos} />
      <div className="mt-10">
        <EnlaceAccion href="#tutor">Hablar con el tutor</EnlaceAccion>
      </div>
    </section>
  );
}
