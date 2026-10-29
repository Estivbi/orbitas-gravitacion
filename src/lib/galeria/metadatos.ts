import type { Orbita } from '@/lib/fisica';
import { rutaDeOrbita } from './navegacion';

const NOMBRE_SITIO = 'Órbitas';

/** Estructuralmente compatible con `Metadata` de Next, sin importarlo. */
export interface MetadatosOrbita {
  title: string;
  description: string;
  alternates: { canonical: string };
  openGraph: {
    title: string;
    description: string;
    url: string;
    siteName: string;
    locale: string;
    type: 'website';
  };
}

/** Las rutas son relativas: `metadataBase` (layout) les pone el origen. Sin imagen. */
export function metadatosDeOrbita(
  orbita: Pick<Orbita, 'slug' | 'nombre' | 'descripcion'>,
): MetadatosOrbita {
  const title = `${orbita.nombre} · ${NOMBRE_SITIO}`;
  const ruta = rutaDeOrbita(orbita.slug);
  return {
    title,
    description: orbita.descripcion,
    alternates: { canonical: ruta },
    openGraph: {
      title,
      description: orbita.descripcion,
      url: ruta,
      siteName: NOMBRE_SITIO,
      locale: 'es_ES',
      type: 'website',
    },
  };
}
