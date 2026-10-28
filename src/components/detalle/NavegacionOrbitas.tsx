import Link from 'next/link';
import type { Slug } from '@/lib/fisica/tipos';
import { rutaDeOrbita } from '@/lib/galeria/navegacion';

const CLASES_ENLACE =
  'text-ash-gray hover:text-bone-white focus-visible:text-bone-white text-etiqueta flex min-h-8 items-center py-2 font-semibold uppercase';

interface Vecina {
  slug: Slug;
  nombre: string;
}

/** Enlaces fantasma a la órbita anterior y a la siguiente (el orden y el ciclo los decide quien llama). */
export function NavegacionOrbitas({
  anterior,
  siguiente,
}: {
  anterior: Vecina;
  siguiente: Vecina;
}) {
  return (
    <nav aria-label="Entre órbitas" className="flex flex-wrap justify-between gap-x-10 gap-y-2">
      <Link href={rutaDeOrbita(anterior.slug)} className={CLASES_ENLACE}>
        Anterior: {anterior.nombre}
      </Link>
      <Link href={rutaDeOrbita(siguiente.slug)} className={CLASES_ENLACE}>
        Siguiente: {siguiente.nombre}
      </Link>
    </nav>
  );
}
