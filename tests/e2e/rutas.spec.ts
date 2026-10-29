import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { ORBITAS, SLUGS } from '../../src/lib/fisica';
import { trazarMiniatura } from '../../src/lib/escena/miniatura';
import { FRASE_ORBITA, rutaDeOrbita, vecinas } from '../../src/lib/galeria/navegacion';
import {
  CONTENEDOR,
  CONTROLES,
  GALERIA,
  TELEMETRIA,
  botonAnimacion,
  esperarLista,
  normalizar,
  orbitaDe,
  paradasDeTabulacion,
  pesoGzip,
  scriptsIniciales,
  textosIniciales,
  trayectoriaDe,
  vigilar,
} from './ayudas';

// Sin esto, un elemento que no existe haría esperar a las acciones hasta el límite de la prueba.
test.use({ actionTimeout: 20_000 });

/**
 * Línea base del JS inicial de la portada, en bytes con gzip -9, medida con este mismo método sobre
 * `develop` ANTES de empezar GRV-04: 181 502 B en el CI y 181 373 B en local (8 scripts y 585 893 B
 * sin comprimir). El primer CI sobre `develop` fija el valor definitivo y el hash del commit; hasta
 * entonces se usa el del CI. El criterio 17 permite 8 KB (8 192 B) más.
 * Hash de develop con el que se midió: pendiente de anotar por el primer CI.
 */
const BASE_JS_PORTADA_GZIP_BYTES = 181_502;
const MARGEN_JS_BYTES = 8_192;

const TOPE_HTML_PORTADA = 200_000;
const TOPE_HTML_DETALLE = 80_000;

interface EntradaDelManifiesto {
  initialRevalidateSeconds: number | false;
  htmlSize?: number;
}

interface Manifiesto {
  routes: Record<string, EntradaDelManifiesto>;
  dynamicRoutes: Record<string, { fallback: unknown }>;
}

function leerManifiesto(): Manifiesto {
  const ruta = '.next/prerender-manifest.json';
  if (!existsSync(ruta)) {
    throw new Error(`No existe ${ruta}: el servidor de pruebas hace build antes de arrancar`);
  }
  return JSON.parse(readFileSync(ruta, 'utf8')) as Manifiesto;
}

/** Lo que el catálogo y la física dicen que debe verse en cada detalle, calculado en Node. */
const esperadoDe = (slug: (typeof SLUGS)[number]) => {
  const orbita = orbitaDe(slug);
  return {
    orbita,
    miniatura: trazarMiniatura(trayectoriaDe(slug)),
    textos: textosIniciales(slug),
    vecinas: vecinas(slug),
  };
};

test.describe('rutas estáticas', () => {
  test('GRV-04 · criterio 11: el build prerenderiza las seis rutas de detalle, sin otras, y el HTML está acotado', () => {
    const manifiesto = leerManifiesto();
    const rutas = manifiesto.routes;

    // `dynamicParams = false`: un slug que no está en generateStaticParams es 404, no se genera
    // bajo demanda. Next 16 lo deja escrito como `fallback: false` en la ruta dinámica del manifiesto
    // (comprobado con un build real); es más robusto que buscar el literal en el código fuente.
    expect(manifiesto.dynamicRoutes['/orbitas/[slug]']?.fallback).toBe(false);

    const detalles = Object.keys(rutas)
      .filter((clave) => clave.startsWith('/orbitas/'))
      .sort();
    expect(detalles).toEqual(SLUGS.map((slug) => `/orbitas/${slug}`).sort());

    for (const slug of SLUGS) {
      const entrada = rutas[`/orbitas/${slug}`]!;
      expect(entrada.initialRevalidateSeconds, slug).toBe(false);
      expect(typeof entrada.htmlSize, `htmlSize de ${slug}`).toBe('number');
      expect(entrada.htmlSize!, `HTML de ${slug}`).toBeLessThanOrEqual(TOPE_HTML_DETALLE);
    }

    expect(rutas['/']?.initialRevalidateSeconds).toBe(false);
    expect(typeof rutas['/']?.htmlSize).toBe('number');
    expect(rutas['/']!.htmlSize!).toBeLessThanOrEqual(TOPE_HTML_PORTADA);
  });

  test('GRV-04 · criterio 11: /orbitas/no-existe y /orbitas devuelven 404', async ({ request }) => {
    expect((await request.get('/orbitas/no-existe')).status()).toBe(404);
    expect((await request.get('/orbitas')).status()).toBe(404);
    // Y las seis rutas reales sí existen (un 404 general no daría por buena la prueba anterior).
    for (const slug of SLUGS) {
      expect((await request.get(rutaDeOrbita(slug))).status(), slug).toBe(200);
    }
  });
});

test.describe('detalle sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const slug of SLUGS) {
    test(`GRV-04 · criterio 12: ${slug}, el HTML del servidor trae todo el contenido y ningún control a la vista`, async ({
      page,
    }) => {
      const { orbita, miniatura, textos, vecinas: vecinasDe } = esperadoDe(slug);
      const respuesta = await page.goto(rutaDeOrbita(slug));
      expect(respuesta?.status()).toBe(200);

      const titulares = page.getByRole('heading', { level: 1 });
      await expect(titulares).toHaveCount(1);
      await expect(titulares).toHaveText(orbita.nombre);
      await expect(page).toHaveTitle(`${orbita.nombre} · Órbitas`);
      await expect(page.getByText(orbita.descripcion, { exact: true })).toBeVisible();
      // El crédito va en un elemento propio; se tolera un prefijo como «Crédito: ».
      await expect(page.locator('main')).toContainText(orbita.credito);

      // La miniatura del servidor: tres trazos con los datos de trazarMiniatura.
      const contenedor = page.locator('[data-estado-escena="cargando"]');
      await expect(contenedor).toHaveCount(1);
      const svg = contenedor.locator('svg').first();
      await expect(svg.locator('path')).toHaveCount(3);
      const trazos = await svg
        .locator('path')
        .evaluateAll((rutas) => rutas.map((ruta) => ruta.getAttribute('d')));
      expect(trazos).toEqual(miniatura.trazos);
      await expect(svg).toHaveAttribute('viewBox', miniatura.viewBox);
      const aviso = contenedor.getByRole('status');
      await expect(aviso).toHaveCount(1);
      await expect(aviso).toHaveText('');
      await expect(page.locator('canvas')).toHaveCount(0);
      await expect(botonAnimacion(page)).toHaveCount(0);

      // Enlaces de vuelta, anterior y siguiente.
      await expect(
        page.getByRole('link', { name: 'Volver a la galería', exact: true }),
      ).toHaveAttribute('href', '/#galeria');
      const anterior = orbitaDe(vecinasDe.anterior).nombre;
      const siguiente = orbitaDe(vecinasDe.siguiente).nombre;
      await expect(
        page.getByRole('link', { name: `Anterior: ${anterior}`, exact: true }),
      ).toHaveAttribute('href', rutaDeOrbita(vecinasDe.anterior));
      await expect(
        page.getByRole('link', { name: `Siguiente: ${siguiente}`, exact: true }),
      ).toHaveAttribute('href', rutaDeOrbita(vecinasDe.siguiente));

      // Textos estáticos y lectura inicial.
      for (const [clave, texto] of Object.entries(textos.resumenes)) {
        await expect(page.locator(`[data-resumen="${clave}"]`), clave).toHaveText(texto);
      }
      for (const [clave, texto] of Object.entries(textos.cifras)) {
        await expect(page.locator(`[data-cifra="${clave}"]`), clave).toHaveText(texto);
      }
      await expect(page.locator('[data-cifra="fase"]')).toHaveAttribute('data-valor', '0.000');
      expect(normalizar(await page.locator('[data-columna="tiempo"]').textContent())).toContain(
        '0,0 %',
      );

      // Los controles existen en el HTML, pero ni se ven ni se enfocan ni salen en el árbol de accesibilidad.
      const controles = page.locator(CONTROLES);
      await expect(controles).toHaveCount(1);
      await expect(controles).toBeHidden();
      expect(
        await controles.evaluate((el) => ({
          inerte: (el as HTMLElement).inert,
          visibilidad: getComputedStyle(el).visibility,
        })),
      ).toEqual({ inerte: true, visibilidad: 'hidden' });
      await expect(page.getByRole('radiogroup', { name: 'Velocidad de reproducción' })).toHaveCount(
        0,
      );
      await expect(page.getByRole('radio')).toHaveCount(0);
      await expect(page.getByRole('slider')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Restablecer vista' })).toHaveCount(0);
      await expect(page.getByRole('button')).toHaveCount(0);

      const paradas = await paradasDeTabulacion(page);
      expect(paradas.length).toBeGreaterThan(0);
      expect(paradas.filter((parada) => parada.enControles)).toEqual([]);
    });
  }

  test('GRV-04 · criterio 12: valores concretos de la figura de ocho y de Lagrange', async ({
    page,
  }) => {
    const esperados = {
      'figura-de-ocho': { energia: '−1,287', dmin: '1,000', vmax: '1,272' },
      lagrange: { energia: '−0,866', dmin: '1,732', vmax: '0,760' },
    } as const;
    for (const [slug, esperado] of Object.entries(esperados)) {
      await page.goto(`/orbitas/${slug}`);
      await expect(page.locator('[data-cifra="energia"]'), slug).toHaveText(esperado.energia);
      await expect(page.locator('[data-cifra="distancia-minima"]'), slug).toHaveText(esperado.dmin);
      await expect(page.locator('[data-cifra="velocidad-maxima"]'), slug).toHaveText(esperado.vmax);
      await expect(page.locator('[data-cifra="tiempo"]'), slug).toHaveText('0,00');
      await expect(page.locator('[data-cifra="momento"]'), slug).toHaveText('0,000');
      expect(normalizar(await page.locator('[data-columna="tiempo"]').textContent())).toContain(
        '0,0 %',
      );
    }
  });
});

test.describe('página 404', () => {
  for (const ruta of ['/orbitas/no-existe', '/orbitas', '/ruta-que-no-existe']) {
    test(`GRV-04 · criterio 13: ${ruta} da 404 con la página propia dentro del layout`, async ({
      page,
    }) => {
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status()).toBe(404);

      const titulares = page.getByRole('heading', { level: 1 });
      await expect(titulares).toHaveCount(1);
      await expect(titulares).toHaveText('Aquí no hay ninguna órbita.');
      await expect(
        page.getByRole('link', { name: 'Volver a la galería', exact: true }),
      ).toHaveAttribute('href', '/#galeria');
      await expect(page.getByRole('banner')).toHaveCount(1);
      await expect(page.getByRole('contentinfo')).toHaveCount(1);
      await expect(page).toHaveTitle('Página no encontrada · Órbitas');

      const robots = await page
        .locator('meta[name="robots"]')
        .evaluateAll((metas) => metas.map((meta) => meta.getAttribute('content') ?? ''));
      expect(robots.some((contenido) => contenido.split(/\s*,\s*/).includes('noindex'))).toBe(true);

      await expect(page.locator(CONTENEDOR)).toHaveCount(0);
      await expect(page.locator('canvas')).toHaveCount(0);

      expect(
        await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe('rgb(0, 0, 0)');
      expect(await titulares.evaluate((el) => getComputedStyle(el).fontWeight)).toBe('400');
    });
  }
});

test.describe('metadatos, sitemap e icono', () => {
  for (const orbita of ORBITAS) {
    test(`GRV-04 · criterio 14: ${orbita.slug}, descripción, canonical y Open Graph`, async ({
      page,
    }) => {
      await page.goto(rutaDeOrbita(orbita.slug));
      const titulo = `${orbita.nombre} · Órbitas`;
      await expect(page).toHaveTitle(titulo);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        orbita.descripcion,
      );

      const ruta = rutaDeOrbita(orbita.slug);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).not.toBeNull();
      expect(new URL(canonical!, 'http://origen.invalido').pathname).toBe(ruta);

      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', titulo);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
        'content',
        orbita.descripcion,
      );
      const ogUrl = await page.locator('meta[property="og:url"]').getAttribute('content');
      expect(new URL(ogUrl ?? '', 'http://origen.invalido').pathname).toBe(ruta);
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
    });
  }

  test('GRV-04 · criterio 14: la portada conserva el título «Órbitas» y el sitemap lista siete páginas', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Órbitas');

    const respuesta = await request.get('/sitemap.xml');
    expect(respuesta.status()).toBe(200);
    expect(respuesta.headers()['content-type']).toContain('xml');
    const xml = await respuesta.text();
    const rutas = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      ([, loc]) => new URL(loc!).pathname,
    );
    expect(rutas).toHaveLength(7);
    expect([...rutas].sort()).toEqual(['/', ...SLUGS.map(rutaDeOrbita)].sort());
  });

  for (const ruta of ['/', '/orbitas/goggles']) {
    test(`GRV-04 · criterio 15: ${ruta} declara el icono SVG, que se sirve, y no hay respuestas de error`, async ({
      page,
      request,
    }) => {
      const vigilancia = vigilar(page);
      await page.goto(ruta);
      await page.waitForLoadState('load');
      await page.waitForTimeout(500);

      const icono = page.locator('link[rel="icon"]').first();
      await expect(icono).toHaveAttribute('href', /icon\.svg/);
      const href = await icono.getAttribute('href');

      const respuesta = await request.get(href!);
      expect(respuesta.status()).toBe(200);
      expect(respuesta.headers()['content-type']).toContain('image/svg+xml');
      expect(await respuesta.text()).toContain('<polygon');

      expect(vigilancia.respuestasDeError).toEqual([]);
    });
  }
});

test.describe('galería en el HTML del servidor', () => {
  test.use({ javaScriptEnabled: false });

  test('GRV-04 · criterio 16: seis tarjetas enlace con su miniatura, nombre y frase, sin escena', async ({
    page,
  }) => {
    await page.goto('/');
    const galeria = page.locator(GALERIA);
    await expect(galeria.getByRole('heading', { level: 2 })).toHaveText(
      'Seis órbitas, una misma ley.',
    );

    const enlaces = galeria.locator('a[href^="/orbitas/"]');
    await expect(enlaces).toHaveCount(6);
    expect(await enlaces.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(
      SLUGS.map(rutaDeOrbita),
    );

    for (const [i, slug] of SLUGS.entries()) {
      const enlace = enlaces.nth(i);
      const orbita = orbitaDe(slug);
      const trazos = await enlace
        .locator('svg path')
        .evaluateAll((rutas) => rutas.map((ruta) => ruta.getAttribute('d')));
      expect(trazos, `trazos de ${slug}`).toEqual(trazarMiniatura(trayectoriaDe(slug)).trazos);
      await expect(enlace.locator('svg')).toHaveCount(1);
      await expect(enlace).toHaveAttribute('data-orbita', slug);

      const texto = normalizar(await enlace.textContent());
      expect(texto, slug).toContain(orbita.nombre);
      expect(texto, slug).toContain(FRASE_ORBITA[slug]);
      expect(texto, slug).toContain('→');
      // El periodo y la energía ya no van en la tarjeta: viven en la telemetría del detalle.
      expect(texto, slug).not.toMatch(/Periodo|Energía/);
    }

    // Sin escena ni lienzo en la galería; en la página, solo el visor del hero y un h1.
    await expect(galeria.locator('canvas')).toHaveCount(0);
    await expect(galeria.locator(CONTENEDOR)).toHaveCount(0);
    await expect(page.locator(CONTENEDOR)).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

    // Tarjetas con borde fino de 1 px y radio de 24 px (DESIGN.md), sin sombra ni fondo; el `li` va limpio.
    const estilos = await enlaces.evaluateAll((as) =>
      as.flatMap((a) =>
        [a, a.closest('li')].map((el) => {
          const e = getComputedStyle(el!);
          return {
            bordes: [e.borderTopWidth, e.borderRightWidth, e.borderBottomWidth, e.borderLeftWidth],
            radio: e.borderTopLeftRadius,
            sombra: e.boxShadow,
            fondo: e.backgroundColor,
          };
        }),
      ),
    );
    expect(estilos).toHaveLength(12);
    for (const [i, estilo] of estilos.entries()) {
      const esTarjeta = i % 2 === 0;
      expect(estilo.bordes).toEqual(esTarjeta ? Array(4).fill('1px') : Array(4).fill('0px'));
      expect(estilo.radio).toBe(esTarjeta ? '24px' : '0px');
      expect(estilo.sombra).toBe('none');
      expect(estilo.fondo).toBe('rgba(0, 0, 0, 0)');
    }
  });
});

test.describe('presupuesto de JavaScript', () => {
  test('GRV-04 · criterio 17: el JS inicial de la portada crece menos de 8 KB y three queda fuera', async ({
    request,
  }) => {
    const html = await (await request.get('/')).text();
    const scripts = scriptsIniciales(html);
    expect(scripts.length).toBeGreaterThan(0);
    const total = await pesoGzip(request, scripts);
    expect(
      total,
      `JS inicial de / (gzip -9): ${total} B; línea base ${BASE_JS_PORTADA_GZIP_BYTES} B`,
    ).toBeLessThanOrEqual(BASE_JS_PORTADA_GZIP_BYTES + MARGEN_JS_BYTES);

    const respuestaDelDetalle = await request.get('/orbitas/butterfly-i');
    expect(respuestaDelDetalle.status(), 'el detalle existe').toBe(200);
    const detalle = await respuestaDelDetalle.text();
    for (const url of new Set([...scripts, ...scriptsIniciales(detalle)])) {
      const cuerpo = await (await request.get(url)).text();
      expect(cuerpo, `${url} no debería incluir three`).not.toContain('WebGLRenderer');
    }
  });

  test('GRV-04 · criterio 17: al llegar a lista el detalle descarga un script con three', async ({
    page,
  }) => {
    const cargados: Promise<string>[] = [];
    page.on('response', (respuesta) => {
      if (/javascript/.test(respuesta.headers()['content-type'] ?? '')) {
        cargados.push(respuesta.text().catch(() => ''));
      }
    });
    await page.goto('/orbitas/butterfly-i');
    await esperarLista(page);
    const cuerpos = await Promise.all(cargados);
    expect(cuerpos.some((cuerpo) => cuerpo.includes('WebGLRenderer'))).toBe(true);
  });

  test('GRV-04 · criterio 17: en la portada hay un solo lienzo, el del hero, y ninguno en la galería', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);
    await page.waitForTimeout(2000);
    await expect(page.locator(GALERIA)).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveCount(1);
    await expect(page.locator(`${GALERIA} canvas`)).toHaveCount(0);
    await expect(page.locator(TELEMETRIA)).toHaveCount(0);
  });
});
