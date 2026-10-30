import type { MetadataRoute } from 'next';
import { resolverUrlSitio } from '@/lib/galeria/sitio';

// Se evalúa al compilar, igual que el sitemap: URL_SITIO debe estar definido en el build.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: new URL('/sitemap.xml', resolverUrlSitio(process.env)).href,
  };
}
