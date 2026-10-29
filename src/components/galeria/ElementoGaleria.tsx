import Link from 'next/link';
import { FRASE_ORBITA, rutaDeOrbita } from '@/lib/galeria/navegacion';
import type { FichaOrbita } from '@/lib/galeria/fichas';
import { CLASES_PANEL } from '../comunes/clases';
import { MiniaturaOrbita } from '../escena/MiniaturaOrbita';

/** Una tarjeta enlace: miniatura, nombre, frase llana y flecha. El periodo y la energía están en el detalle. */
export function ElementoGaleria({ ficha }: { ficha: FichaOrbita }) {
  const { orbita } = ficha;
  return (
    <li>
      <Link
        href={rutaDeOrbita(orbita.slug)}
        data-orbita={orbita.slug}
        className={`${CLASES_PANEL} group hover:border-bone-white flex h-full flex-col gap-3 p-3 columnas:p-4`}
      >
        <MiniaturaOrbita trazado={ficha.miniatura} className="aspect-4/3 w-full" />
        <span className="flex items-start justify-between gap-2">
          <span className="text-cuerpo font-normal">{orbita.nombre}</span>
          <span aria-hidden="true" className="text-ash-gray group-hover:text-bone-white">
            →
          </span>
        </span>
        <span className="text-silver-mist text-etiqueta font-light">
          {FRASE_ORBITA[orbita.slug]}
        </span>
      </Link>
    </li>
  );
}
