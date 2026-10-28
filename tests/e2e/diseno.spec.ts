import { expect, test } from '@playwright/test';
import { CONTENEDOR, esperarLista } from './ayudas';

test.describe('GRV-03 · sistema de diseño y estructura', () => {
  test('criterio 3: Inter se carga desde el propio sitio y el peso del texto depende del ancho', async ({
    page,
  }) => {
    const externas: string[] = [];
    page.on('request', (peticion) => {
      const { hostname } = new URL(peticion.url());
      if (hostname === 'fonts.googleapis.com' || hostname === 'fonts.gstatic.com') {
        externas.push(peticion.url());
      }
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    const caras = await page.evaluate(() =>
      [...document.fonts].map((cara) => ({ familia: cara.family, estado: cara.status })),
    );
    expect(caras.some((c) => /inter/i.test(c.familia) && c.estado === 'loaded')).toBe(true);
    expect(externas).toEqual([]);

    const cuerpo = () =>
      page.evaluate(() => {
        const estilo = getComputedStyle(document.body);
        return { tamano: estilo.fontSize, peso: estilo.fontWeight };
      });
    expect(await cuerpo()).toEqual({ tamano: '18px', peso: '200' });

    await page.setViewportSize({ width: 600, height: 800 });
    expect((await cuerpo()).peso).toBe('300');

    const titulares = await page
      .getByRole('heading')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).fontWeight));
    expect(titulares.length).toBeGreaterThan(0);
    expect(titulares.every((peso) => peso === '400')).toBe(true);
  });

  test('criterio 4: enlace de salto, puntos de referencia y foco visible', async ({ page }) => {
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
    expect(caja!.x).toBeGreaterThanOrEqual(0);
    expect(caja!.y).toBeGreaterThanOrEqual(0);

    const contorno = await enlace.evaluate((el) => {
      const estilo = getComputedStyle(el);
      return {
        ancho: estilo.outlineWidth,
        color: estilo.outlineColor,
        estilo: estilo.outlineStyle,
      };
    });
    expect(contorno).toEqual({ ancho: '2px', color: 'rgb(255, 255, 255)', estilo: 'solid' });

    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('contenido');
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
        const caja = await page.locator(CONTENEDOR).boundingBox();
        expect(caja?.height ?? 0).toBeGreaterThanOrEqual(360);
      }
    });
  }
});

test.describe('GRV-03 · la escena llega aparte del HTML', () => {
  test.describe('sin JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('criterio 10: el HTML del servidor trae la miniatura SVG con sus tres trazos', async ({
      page,
      request,
    }) => {
      await page.goto('/');
      const contenedor = page.locator(CONTENEDOR);
      await expect(contenedor).toHaveAttribute('data-estado-escena', 'cargando');
      const svg = contenedor.locator('svg').first();
      await expect(svg).toBeVisible();
      await expect(svg.locator('path')).toHaveCount(3);
      await expect(page.getByRole('button', { name: /animación/i })).toHaveCount(0);

      const html = await (await request.get('/')).text();
      expect(html).toContain('role="status"');
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
