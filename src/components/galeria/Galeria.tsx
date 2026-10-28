import { SLUGS, type Slug } from '@/lib/fisica/tipos';
import { fichaDeOrbita, resumirCatalogo } from '@/lib/galeria/fichas';
import type { ReactNode } from 'react';
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
      <h2 id={ID_TITULO} className="text-titular-sm mb-10 text-balance">
        Seis soluciones periódicas
      </h2>
      <GaleriaOrdenable resumenes={resumirCatalogo()} elementos={elementos} />
    </section>
  );
}
