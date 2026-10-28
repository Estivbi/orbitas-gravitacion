import { expect, test, type Page } from '@playwright/test';
import { integrarPeriodo, obtenerOrbita } from '../../src/lib/fisica';
import { trazarMiniatura } from '../../src/lib/escena/miniatura';
import { CONTENEDOR, LIENZO, botonAnimacion, esperarLista, tabuladoHasta } from './ayudas';

const FOCO = { ancho: '2px', color: 'rgb(255, 255, 255)', estilo: 'solid' };

function contornoDelActivo(page: Page) {
  return page.evaluate(() => {
    const estilo = getComputedStyle(document.activeElement as Element);
    return {
      ancho: estilo.outlineWidth,
      color: estilo.outlineColor,
      estilo: estilo.outlineStyle,
      separacion: estilo.outlineOffset,
    };
  });
}

test.describe('GRV-03 · sistema de diseño y estructura', () => {
  test('criterio 3: la fuente es local y el peso del texto depende del ancho', async ({
    page,
    baseURL,
  }) => {
    const externas: string[] = [];
    const woff2: string[] = [];
    page.on('request', (peticion) => {
      const { hostname } = new URL(peticion.url());
      if (hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com') {
        externas.push(peticion.url());
      }
    });
    page.on('response', (respuesta) => {
      const { origin, pathname } = new URL(respuesta.url());
      if (origin === new URL(baseURL!).origin && pathname.endsWith('.woff2') && respuesta.ok()) {
        woff2.push(respuesta.url());
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    // El nombre de la familia lo decide next/font: no se fija, solo que alguna cara se cargó.
    const estados = await page.evaluate(() => [...document.fonts].map((cara) => cara.status));
    expect(estados).toContain('loaded');
    expect(woff2.length).toBeGreaterThan(0);
    expect(externas).toEqual([]);

    const cuerpo = () =>
      page.evaluate(() => {
        const estilo = getComputedStyle(document.body);
        return { tamano: estilo.fontSize, peso: estilo.fontWeight };
      });
    const pesosDeTitulares = () =>
      page
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((els) => els.map((el) => getComputedStyle(el).fontWeight));

    await expect.poll(cuerpo).toEqual({ tamano: '18px', peso: '200' });
    expect((await pesosDeTitulares()).length).toBeGreaterThan(0);
    expect(await page.locator('h1').evaluate((el) => getComputedStyle(el).fontWeight)).toBe('400');

    for (const [ancho, peso] of [
      [639, '300'],
      [640, '200'],
    ] as const) {
      await page.setViewportSize({ width: ancho, height: 800 });
      await expect.poll(cuerpo, { message: `cuerpo a ${ancho} px` }).toEqual({
        tamano: '18px',
        peso,
      });
      const titulares = await pesosDeTitulares();
      expect(titulares.length).toBeGreaterThan(0);
      expect(
        titulares.every((p) => p === '400'),
        `titulares a ${ancho} px`,
      ).toBe(true);
    }
    expect((await pesosDeTitulares()).every((p) => p === '400')).toBe(true);
  });

  test('criterio 4: enlace de salto visible, puntos de referencia y foco visible', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);

    await page.keyboard.press('Tab');
    const enlace = page.locator(':focus');
    await expect(enlace).toHaveAttribute('href', '#contenido');
    await expect(enlace).toBeVisible();

    const caja = await enlace.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeGreaterThanOrEqual(44);
    expect(caja!.height).toBeGreaterThanOrEqual(44);
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.y).toBeGreaterThanOrEqual(0);
    expect(caja!.x + caja!.width).toBeLessThanOrEqual(1280);
    expect(caja!.y + caja!.height).toBeLessThanOrEqual(800);

    const fondo = await enlace.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(['rgba(0, 0, 0, 0)', 'transparent']).not.toContain(fondo);

    const contorno = await contornoDelActivo(page);
    expect({ ancho: contorno.ancho, color: contorno.color, estilo: contorno.estilo }).toEqual(FOCO);

    await page.keyboard.press('Enter');
    await expect
      .poll(() =>
        page.evaluate(() => ({
          etiqueta: document.activeElement?.tagName,
          id: document.activeElement?.id,
        })),
      )
      .toEqual({ etiqueta: 'MAIN', id: 'contenido' });
  });

  test('criterio 4: el botón de animación y el lienzo tienen el mismo foco blanco de 2 px', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);

    await tabuladoHasta(page, LIENZO);
    const enLienzo = await contornoDelActivo(page);
    expect({ ancho: enLienzo.ancho, color: enLienzo.color, estilo: enLienzo.estilo }).toEqual(FOCO);
    // El foco del lienzo se dibuja hacia dentro.
    expect(parseFloat(enLienzo.separacion)).toBeLessThan(0);

    await tabuladoHasta(page, 'button');
    await expect(botonAnimacion(page)).toBeFocused();
    const enBoton = await contornoDelActivo(page);
    expect({ ancho: enBoton.ancho, color: enBoton.color, estilo: enBoton.estilo }).toEqual(FOCO);
  });

  for (const [ancho, alto] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`criterio 19: sin desbordamiento horizontal a ${ancho} px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: alto });
      await page.goto('/');

      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda).toBe(false);

      if (ancho === 375) {
        // Todavía sin esperar a la escena: el visor ya reserva su altura con la miniatura.
        const caja = await page.locator(CONTENEDOR).boundingBox();
        expect(caja?.height ?? 0).toBeGreaterThanOrEqual(360);
      }
    });
  }
});

test.describe('GRV-03 · la escena llega aparte del HTML', () => {
  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('criterio 10: el HTML del servidor trae la miniatura de la figura de ocho, el estado y el aviso vacío', async ({
      page,
    }) => {
      await page.goto('/');
      const contenedor = page.locator(CONTENEDOR);
      await expect(contenedor).toHaveAttribute('data-estado-escena', 'cargando');

      const svg = contenedor.locator('svg').first();
      await expect(svg).toBeVisible();
      await expect(svg.locator('path')).toHaveCount(3);

      // Los tres trazos son los de la figura de ocho, calculados aquí con la librería. Todas las
      // órbitas empiezan en (−1, 0), así que no basta con comparar el primer punto.
      const esperado = trazarMiniatura(integrarPeriodo(obtenerOrbita('figura-de-ocho')!));
      const trazos = await svg
        .locator('path')
        .evaluateAll((rutas) => rutas.map((ruta) => ruta.getAttribute('d')));
      expect(trazos).toEqual(esperado.trazos);
      await expect(svg).toHaveAttribute('viewBox', esperado.viewBox);

      // La región de aviso viene en el HTML, vacía y dentro del contenedor del visor.
      const aviso = contenedor.getByRole('status');
      await expect(aviso).toHaveCount(1);
      await expect(aviso).toHaveText('');
      await expect(botonAnimacion(page)).toHaveCount(0);
    });
  });

  test('criterio 11: three no está en los scripts iniciales y llega después', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/')).text();
    const iniciales = new Set<string>();
    for (const [, src] of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
      iniciales.add(src!);
    }
    for (const [etiqueta] of html.matchAll(/<link[^>]*>/g)) {
      if (/rel="preload"/.test(etiqueta) && /as="script"/.test(etiqueta)) {
        const href = /href="([^"]+)"/.exec(etiqueta)?.[1];
        if (href) iniciales.add(href);
      }
    }
    expect(iniciales.size).toBeGreaterThan(0);

    for (const url of iniciales) {
      const cuerpo = await (await request.get(url)).text();
      expect(cuerpo, `${url} no debería incluir three`).not.toContain('WebGLRenderer');
    }

    const cargados: Promise<string>[] = [];
    page.on('response', (respuesta) => {
      if (/javascript/.test(respuesta.headers()['content-type'] ?? '')) {
        cargados.push(respuesta.text().catch(() => ''));
      }
    });
    await page.goto('/');
    await esperarLista(page);
    const cuerpos = await Promise.all(cargados);
    expect(cuerpos.some((cuerpo) => cuerpo.includes('WebGLRenderer'))).toBe(true);
  });
});
