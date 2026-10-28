import { describe, expect, it } from 'vitest';
import { SLUGS, obtenerOrbita } from '@/lib/fisica';
import { metadatosDeOrbita } from '@/lib/galeria/metadatos';
import { URL_SITIO_POR_DEFECTO, entradasSitemap, resolverUrlSitio } from '@/lib/galeria/sitio';

describe('GRV-04 · criterio 8: URL del sitio', () => {
  it('el valor por defecto es http://localhost:3000', () => {
    expect(URL_SITIO_POR_DEFECTO).toBe('http://localhost:3000');
    expect(resolverUrlSitio({}).origin).toBe('http://localhost:3000');
  });

  it('URL_SITIO manda', () => {
    expect(resolverUrlSitio({ URL_SITIO: 'https://orbitas.example.dev' }).origin).toBe(
      'https://orbitas.example.dev',
    );
    expect(resolverUrlSitio({ URL_SITIO: 'http://localhost:4000' }).origin).toBe(
      'http://localhost:4000',
    );
  });

  it('VERCEL_PROJECT_PRODUCTION_URL es un host sin esquema: se le añade https://', () => {
    expect(resolverUrlSitio({ VERCEL_PROJECT_PRODUCTION_URL: 'orbitas.vercel.app' }).origin).toBe(
      'https://orbitas.vercel.app',
    );
  });

  it('si están las dos, gana URL_SITIO', () => {
    expect(
      resolverUrlSitio({
        URL_SITIO: 'https://orbitas.example.dev',
        VERCEL_PROJECT_PRODUCTION_URL: 'orbitas.vercel.app',
      }).origin,
    ).toBe('https://orbitas.example.dev');
  });

  it('una cadena vacía cuenta como ausente', () => {
    expect(resolverUrlSitio({ URL_SITIO: '' }).origin).toBe('http://localhost:3000');
    expect(
      resolverUrlSitio({ URL_SITIO: '', VERCEL_PROJECT_PRODUCTION_URL: 'orbitas.vercel.app' })
        .origin,
    ).toBe('https://orbitas.vercel.app');
    expect(
      resolverUrlSitio({ URL_SITIO: undefined, VERCEL_PROJECT_PRODUCTION_URL: '' }).origin,
    ).toBe('http://localhost:3000');
  });

  it('acepta una barra final y devuelve solo el origen', () => {
    const url = resolverUrlSitio({ URL_SITIO: 'https://orbitas.example.dev/' });
    expect(url).toBeInstanceOf(URL);
    expect(url.origin).toBe('https://orbitas.example.dev');
    expect(url.pathname).toBe('/');
  });

  it.each(['no es una url', 'ftp://orbitas.example.dev', 'https://orbitas.example.dev/base'])(
    'lanza un Error que nombra URL_SITIO con «%s»',
    (valor) => {
      expect(() => resolverUrlSitio({ URL_SITIO: valor })).toThrow(Error);
      expect(() => resolverUrlSitio({ URL_SITIO: valor })).toThrow(/URL_SITIO/);
    },
  );

  it('acepta process.env tal cual (sin error de tipos con npm run typecheck)', () => {
    expect(resolverUrlSitio(process.env)).toBeInstanceOf(URL);
  });
});

describe('GRV-04 · criterio 8: sitemap', () => {
  it('base y las seis rutas, absolutas y en orden de catálogo', () => {
    const entradas = entradasSitemap(new URL('https://orbitas.example.dev'));
    expect(entradas.map((e) => e.url)).toEqual([
      'https://orbitas.example.dev/',
      'https://orbitas.example.dev/orbitas/lagrange',
      'https://orbitas.example.dev/orbitas/figura-de-ocho',
      'https://orbitas.example.dev/orbitas/butterfly-i',
      'https://orbitas.example.dev/orbitas/goggles',
      'https://orbitas.example.dev/orbitas/moth-i',
      'https://orbitas.example.dev/orbitas/yin-yang-i',
    ]);
    expect(entradas).toHaveLength(7);
    for (const entrada of entradas) {
      expect(entrada).not.toHaveProperty('lastModified');
    }
  });

  it('usa el origen que recibe', () => {
    const entradas = entradasSitemap(new URL('http://localhost:3000'));
    expect(entradas[0]!.url).toBe('http://localhost:3000/');
    expect(entradas.every((e) => e.url.startsWith('http://localhost:3000/'))).toBe(true);
  });
});

describe('GRV-04 · criterio 8: metadatos de una órbita', () => {
  const goggles = obtenerOrbita('goggles')!;

  it('Goggles: título, descripción del catálogo, rutas relativas y Open Graph sin imagen', () => {
    expect(metadatosDeOrbita(goggles)).toEqual({
      title: 'Goggles · Órbitas',
      description: goggles.descripcion,
      alternates: { canonical: '/orbitas/goggles' },
      openGraph: {
        title: 'Goggles · Órbitas',
        description: goggles.descripcion,
        url: '/orbitas/goggles',
        siteName: 'Órbitas',
        locale: 'es_ES',
        type: 'website',
      },
    });
  });

  it('las rutas son relativas: no llevan origen', () => {
    const { alternates, openGraph } = metadatosDeOrbita(goggles);
    expect(alternates.canonical.startsWith('/')).toBe(true);
    expect(openGraph.url.startsWith('/')).toBe(true);
    expect(openGraph).not.toHaveProperty('images');
  });

  it('los seis títulos, descripciones y rutas son distintos', () => {
    const todos = SLUGS.map((slug) => {
      const orbita = obtenerOrbita(slug)!;
      return { orbita, meta: metadatosDeOrbita(orbita) };
    });
    expect(new Set(todos.map((t) => t.meta.title)).size).toBe(6);
    expect(new Set(todos.map((t) => t.meta.description)).size).toBe(6);
    expect(new Set(todos.map((t) => t.meta.alternates.canonical)).size).toBe(6);
    for (const { orbita, meta } of todos) {
      expect(meta.title).toBe(`${orbita.nombre} · Órbitas`);
      expect(meta.openGraph.title).toBe(meta.title);
      expect(meta.description).toBe(orbita.descripcion);
      expect(meta.alternates.canonical).toBe(`/orbitas/${orbita.slug}`);
    }
  });
});
