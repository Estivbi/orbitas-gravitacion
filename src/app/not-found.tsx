import type { Metadata } from 'next';
import Link from 'next/link';
import { RUTA_GALERIA } from '@/lib/galeria/navegacion';

export const metadata: Metadata = {
  title: 'Página no encontrada · Órbitas',
};

/** La sirve `notFound()` y cualquier URL sin ruta; Next añade `noindex` y el estado 404. */
export default function NoEncontrada() {
  return (
    <div className="mx-auto flex max-w-pagina flex-col items-start gap-6 px-4 py-16">
      <p className="text-saffron-spark text-etiqueta font-semibold uppercase">Error 404</p>
      <h1 className="text-titular-lg text-balance">Aquí no hay ninguna órbita.</h1>
      <p className="max-w-90">La dirección que buscas no existe, pero las seis soluciones sí.</p>
      <Link
        href={RUTA_GALERIA}
        className="text-ash-gray hover:text-bone-white focus-visible:text-bone-white text-etiqueta flex min-h-8 items-center py-2 font-semibold uppercase"
      >
        Volver a la galería
      </Link>
    </div>
  );
}
