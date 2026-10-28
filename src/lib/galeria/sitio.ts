import { SLUGS } from '@/lib/fisica';
import { rutaDeOrbita } from './navegacion';

export const URL_SITIO_POR_DEFECTO = 'http://localhost:3000';

type Entorno = Readonly<Record<string, string | undefined>>;

/** Una URL con esquema http o https y sin ruta: solo se conserva el origen. */
function origenValido(valor: string, variable: string): URL {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    throw new Error(`${variable} no es una URL válida: «${valor}»`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${variable} debe empezar por http: o https: («${valor}»)`);
  }
  if (url.pathname !== '/') {
    throw new Error(`${variable} no debe llevar ruta, solo el origen («${valor}»)`);
  }
  return new URL(url.origin);
}

/**
 * Origen público del sitio. Prioridad: `URL_SITIO`; después `VERCEL_PROJECT_PRODUCTION_URL`
 * (host sin esquema); después `http://localhost:3000`. Una cadena vacía cuenta como ausente.
 * Se evalúa al compilar (layout y sitemap).
 */
export function resolverUrlSitio(entorno: Entorno): URL {
  const explicita = entorno.URL_SITIO;
  if (explicita) return origenValido(explicita, 'URL_SITIO');
  const hostVercel = entorno.VERCEL_PROJECT_PRODUCTION_URL;
  if (hostVercel) return origenValido(`https://${hostVercel}`, 'VERCEL_PROJECT_PRODUCTION_URL');
  return new URL(URL_SITIO_POR_DEFECTO);
}

/** La portada y las seis rutas de detalle, con URL absolutas y en orden de catálogo. */
export function entradasSitemap(base: URL): { url: string }[] {
  return [
    { url: new URL('/', base).href },
    ...SLUGS.map((slug) => ({ url: new URL(rutaDeOrbita(slug), base).href })),
  ];
}
