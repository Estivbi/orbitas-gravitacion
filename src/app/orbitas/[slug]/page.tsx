import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DetalleOrbitaConectado } from '@/components/detalle/DetalleOrbitaConectado';
import { NavegacionOrbitas } from '@/components/detalle/NavegacionOrbitas';
import { SLUGS, obtenerOrbita, type Slug } from '@/lib/fisica';
import { fichaDeOrbita } from '@/lib/galeria/fichas';
import { metadatosDeOrbita } from '@/lib/galeria/metadatos';
import { ETIQUETA_SOLUCION, RUTA_GALERIA, vecinas } from '@/lib/galeria/navegacion';

// Literal: Next lo analiza de forma estática. Un slug fuera del catálogo es 404, no se genera.
export const dynamicParams = false;

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): { slug: Slug }[] {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const orbita = obtenerOrbita(slug) ?? notFound();
  return metadatosDeOrbita(orbita);
}

function vecinaDe(slug: Slug) {
  const orbita = obtenerOrbita(slug) ?? notFound();
  return { slug, nombre: orbita.nombre };
}

export default async function PaginaOrbita({ params }: Props) {
  const { slug } = await params;
  const orbita = obtenerOrbita(slug) ?? notFound();
  const ficha = fichaDeOrbita(orbita.slug);
  const { anterior, siguiente } = vecinas(orbita.slug);
  return (
    <article className="mx-auto flex max-w-pagina flex-col gap-6 px-4 pb-16 columnas:gap-10">
      <Link
        href={RUTA_GALERIA}
        className="text-ash-gray hover:text-bone-white focus-visible:text-bone-white text-etiqueta flex min-h-11 w-fit items-center py-2 font-semibold uppercase"
      >
        Volver a la galería
      </Link>
      <header className="flex flex-col gap-4">
        <p className="text-saffron-spark text-etiqueta font-semibold uppercase">
          {ETIQUETA_SOLUCION[orbita.slug]}
        </p>
        <h1 className="text-titular-lg text-balance">{orbita.nombre}</h1>
        <p className="max-w-120">{orbita.descripcion}</p>
        <p className="text-silver-mist text-etiqueta font-light">
          Crédito: <span>{orbita.credito}</span>
        </p>
      </header>
      <DetalleOrbitaConectado
        slug={orbita.slug}
        nombre={orbita.nombre}
        miniatura={ficha.miniatura}
        periodo={orbita.periodo}
        energiaInicial={ficha.energiaInicial}
        distanciaMinima={ficha.distanciaMinima}
        velocidadMaxima={ficha.velocidadMaxima}
        lecturaInicial={ficha.lecturaInicial}
      />
      <NavegacionOrbitas anterior={vecinaDe(anterior)} siguiente={vecinaDe(siguiente)} />
    </article>
  );
}
