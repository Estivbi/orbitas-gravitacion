import Link from 'next/link';
import { formatearCifra } from '@/lib/galeria/formato';
import { ETIQUETA_SOLUCION, rutaDeOrbita } from '@/lib/galeria/navegacion';
import type { FichaOrbita } from '@/lib/galeria/fichas';
import { MiniaturaOrbita } from '../escena/MiniaturaOrbita';

/** Un elemento de la lista: sin tarjeta, borde ni fondo; solo lo separa el espacio. */
export function ElementoGaleria({ ficha }: { ficha: FichaOrbita }) {
  const { orbita } = ficha;
  return (
    <li>
      <Link
        href={rutaDeOrbita(orbita.slug)}
        data-orbita={orbita.slug}
        className="group flex flex-col gap-3 py-2"
      >
        <MiniaturaOrbita trazado={ficha.miniatura} className="aspect-4/3 w-full" />
        <span className="text-saffron-spark text-etiqueta font-semibold uppercase">
          {ETIQUETA_SOLUCION[orbita.slug]}
        </span>
        <span className="text-titular-xs font-normal">{orbita.nombre}</span>
        <span className="text-silver-mist group-hover:text-bone-white text-etiqueta flex flex-wrap gap-x-4 font-light tabular-nums">
          <span>Periodo {formatearCifra(orbita.periodo, 2)}</span>{' '}
          <span>Energía {formatearCifra(ficha.energiaInicial, 3)}</span>
        </span>
      </Link>
    </li>
  );
}
