import type { MetadataRoute } from 'next';
import { entradasSitemap, resolverUrlSitio } from '@/lib/galeria/sitio';

// Se evalúa al compilar: URL_SITIO debe estar definido en el build.
export default function sitemap(): MetadataRoute.Sitemap {
  return entradasSitemap(resolverUrlSitio(process.env));
}
