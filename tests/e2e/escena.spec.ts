import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import {
  CONTENEDOR,
  LIENZO,
  centroDelLienzo,
  colorDelTema,
  diferenciaAngular,
  esperarLista,
  leerFotogramas,
  leerPosicion,
  leerVista,
  reproduciendo,
} from './ayudas';

const BOTON = (page: Page) => page.getByRole('button', { name: /animación/i });

/** Cuántos píxeles de la captura están a menos de `tolerancia` del color, por canal. */
function contarCercanos(png: PNG, [r, g, b]: [number, number, number], tolerancia: number): number {
  let cuenta = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (
      Math.abs(png.data[i]! - r) <= tolerancia &&
      Math.abs(png.data[i + 1]! - g) <= tolerancia &&
      Math.abs(png.data[i + 2]! - b) <= tolerancia
    ) {
      cuenta++;
    }
  }
  return cuenta;
}

test.describe.serial('GRV-03 · escena con WebGL (una sola carga)', () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, baseURL }) => {
    contexto = await browser.newContext({
      baseURL,
      hasTouch: true,
      viewport: { width: 1280, height: 720 },
    });
    page = await contexto.newPage();
    await page.goto('/');
    await esperarLista(page);
  });

  test.afterAll(async () => {
    await contexto.close();
  });

  test('criterio 12: la escena se dibuja, con los tres colores de los cuerpos', async () => {
    await expect(page.locator(CONTENEDOR).locator('svg').first()).toBeHidden();

    const lienzo = page.locator(LIENZO);
    await expect(lienzo).toHaveCount(1);
    await expect(lienzo).toHaveAttribute('role', 'img');
    await expect(lienzo).toHaveAttribute('tabindex', '0');
    const etiqueta = await lienzo.getAttribute('aria-label');
    expect((etiqueta ?? '').length).toBeGreaterThan(10);

    const descripcionId = await lienzo.getAttribute('aria-describedby');
    expect(descripcionId).toBeTruthy();
    const instrucciones = page.locator(`#${descripcionId}`);
    await expect(instrucciones).toBeVisible();
    expect((await instrucciones.innerText()).trim().length).toBeGreaterThan(0);

    const alfa = await lienzo.evaluate(
      (el: HTMLCanvasElement) => el.getContext('webgl2')?.getContextAttributes()?.alpha,
    );
    expect(alfa).toBe(false);

    const captura = PNG.sync.read(await lienzo.screenshot());
    for (const nombre of ['saffron-spark', 'orbit-teal', 'electric-iris']) {
      const cuenta = contarCercanos(captura, colorDelTema(nombre), 60);
      expect(cuenta, `píxeles cerca de ${nombre}`).toBeGreaterThanOrEqual(150);
    }
  });

  test('criterio 13: el teclado controla la cámara y respeta los modificadores', async () => {
    await page.locator(LIENZO).focus();
    await page.keyboard.press('Space');
    expect(await reproduciendo(page)).toBe('false');
    await page.waitForTimeout(250);

    const v0 = await leerVista(page);
    await page.keyboard.press('ArrowRight');
    const v1 = await leerVista(page);
    expect(Math.abs(diferenciaAngular(v0.acimut, v1.acimut))).toBeCloseTo(0.14, 2);
    expect(v1.polar).toBeCloseTo(v0.polar, 3);

    await page.keyboard.press('ArrowUp');
    const v2 = await leerVista(page);
    expect(Math.abs(v2.polar - v1.polar)).toBeCloseTo(0.1, 2);

    await page.keyboard.press('+');
    const v3 = await leerVista(page);
    expect(v3.distancia).toBeCloseTo(v2.distancia * 0.88, 2);

    await page.keyboard.press('Control+=');
    expect(await leerVista(page)).toEqual(v3);

    await page.keyboard.press('Home');
    expect(await leerVista(page)).toEqual({ acimut: 0.6, polar: 1, distancia: 1 });
  });

  test('criterio 13: arrastrar con el ratón cambia la vista', async () => {
    const antes = await leerVista(page);
    const { x, y } = await centroDelLienzo(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y + 40, { steps: 8 });
    await page.mouse.up();
    const despues = await leerVista(page);
    expect(
      Math.abs(diferenciaAngular(antes.acimut, despues.acimut)) +
        Math.abs(despues.polar - antes.polar),
    ).toBeGreaterThan(0.3);
  });

  test('criterio 13: dos dedos que se separan acercan y que se juntan alejan', async () => {
    await page.keyboard.press('Home');
    const { x, y } = await centroDelLienzo(page);
    const cdp = await contexto.newCDPSession(page);
    const dedos = (separacion: number) => [
      { x: x - separacion, y, id: 1 },
      { x: x + separacion, y, id: 2 },
    ];

    const inicial = await leerVista(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dedos(30) });
    for (let s = 40; s <= 160; s += 20) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: dedos(s) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const acercada = await leerVista(page);
    expect(acercada.distancia).toBeLessThan(inicial.distancia - 0.1);

    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dedos(160) });
    for (let s = 140; s >= 30; s -= 20) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: dedos(s) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const alejada = await leerVista(page);
    expect(alejada.distancia).toBeGreaterThan(acercada.distancia + 0.1);
  });

  test('criterio 13: la rueda desplaza la página y no cambia la vista; el lienzo deja pasar el desplazamiento vertical', async () => {
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.keyboard.press('Home');
    const { x, y } = await centroDelLienzo(page);
    const antes = await leerVista(page);
    const scrollAntes = await page.evaluate(() => window.scrollY);

    await page.mouse.move(x, Math.min(y, 380));
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollAntes);
    expect(await leerVista(page)).toEqual(antes);
    expect(await page.locator(LIENZO).evaluate((el) => getComputedStyle(el).touchAction)).toBe(
      'pan-y',
    );

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('criterio 14: el botón y la tecla Espacio pausan y reanudan sin saltos', async () => {
    const boton = BOTON(page);
    await expect(boton).toHaveText(/reproducir animación/i);
    expect(await reproduciendo(page)).toBe('false');

    const quieta = await leerPosicion(page);
    const vistaQuieta = await leerVista(page);
    await page.waitForTimeout(1000);
    expect(await leerPosicion(page)).toBe(quieta);
    expect(await leerVista(page)).toEqual(vistaQuieta);

    await boton.click();
    expect(await reproduciendo(page)).toBe('true');
    await expect(boton).toHaveText(/pausar animación/i);
    await page.waitForTimeout(400);
    const avanzada = await leerPosicion(page);
    const delta = (avanzada - quieta + 1) % 1;
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(0.15);

    const caja = await boton.boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
    expect(caja!.width).toBeGreaterThanOrEqual(44);

    await page.locator(LIENZO).focus();
    await page.keyboard.press('Space');
    expect(await reproduciendo(page)).toBe('false');
    await expect(boton).toHaveText(/reproducir animación/i);
    await page.keyboard.press('Space');
    expect(await reproduciendo(page)).toBe('true');
  });

  test('criterio 16: con la pestaña oculta no se dibuja y al volver la posición no salta', async () => {
    const ocultar = (oculta: boolean) =>
      page.evaluate((valor) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => valor });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => (valor ? 'hidden' : 'visible'),
        });
        document.dispatchEvent(new Event('visibilitychange'));
      }, oculta);

    await page.waitForTimeout(300);
    const antes = await leerFotogramas(page);
    await page.waitForTimeout(300);
    expect(await leerFotogramas(page)).toBeGreaterThan(antes);

    const posicionAntes = await leerPosicion(page);
    await ocultar(true);
    await page.waitForTimeout(400);
    const congelados = await leerFotogramas(page);
    await page.waitForTimeout(800);
    expect(await leerFotogramas(page)).toBe(congelados);

    await ocultar(false);
    await page.waitForTimeout(500);
    expect(await leerFotogramas(page)).toBeGreaterThan(congelados);
    const delta = ((((await leerPosicion(page)) - posicionAntes) % 1) + 1) % 1;
    expect(delta).toBeLessThan(0.3);
  });
});

test.describe('GRV-03 · giro automático de la cámara', () => {
  test('criterio 20: gira solo el acimut, se detiene al pausar y al tocar la cámara', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);

    const v0 = await leerVista(page);
    await page.waitForTimeout(2000);
    const v1 = await leerVista(page);
    expect(Math.abs(diferenciaAngular(v0.acimut, v1.acimut))).toBeGreaterThan(0.05);
    expect(v1.polar).toBe(v0.polar);
    expect(v1.distancia).toBe(v0.distancia);

    await BOTON(page).click();
    await page.waitForTimeout(250);
    const pausada = await leerVista(page);
    await page.waitForTimeout(800);
    expect(await leerVista(page)).toEqual(pausada);

    await BOTON(page).click();
    await page.locator(LIENZO).focus();
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(250);
    const tocada = await leerVista(page);
    await page.waitForTimeout(1200);
    expect(await leerVista(page)).toEqual(tocada);

    await BOTON(page).click();
    await BOTON(page).click();
    await page.waitForTimeout(1200);
    expect(await leerVista(page)).toEqual(tocada);
  });
});

test.describe('GRV-03 · movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('criterios 15 y 20: la escena empieza pausada y la cámara no gira sola', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);

    expect(await reproduciendo(page)).toBe('false');
    await expect(BOTON(page)).toHaveText(/reproducir animación/i);

    const posicion = await leerPosicion(page);
    const vista = await leerVista(page);
    await page.waitForTimeout(1000);
    expect(await leerPosicion(page)).toBe(posicion);
    expect(await leerVista(page)).toEqual(vista);
  });
});

test.describe('GRV-03 · lienzo estable en pantallas de alta densidad', () => {
  test.use({ deviceScaleFactor: 3, viewport: { width: 800, height: 700 } });

  test('criterio 18: mismo lienzo, resolución acotada y caja del visor sin saltos', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const antes = await page.locator(CONTENEDOR).boundingBox();
    await esperarLista(page);
    const despues = await page.locator(CONTENEDOR).boundingBox();
    expect(despues!.width).toBeCloseTo(antes!.width, 0);
    expect(despues!.height).toBeCloseTo(antes!.height, 0);

    const lienzo = page.locator(LIENZO);
    const medidas = await lienzo.evaluate((el: HTMLCanvasElement) => ({
      ancho: el.width,
      css: el.getBoundingClientRect().width,
    }));
    expect(medidas.ancho).toBeLessThanOrEqual(Math.ceil(medidas.css * 2));

    await lienzo.evaluate((el) => {
      (window as unknown as { __lienzo: Element }).__lienzo = el;
    });
    await BOTON(page).click();
    await BOTON(page).click();
    const mismo = await page.evaluate(
      () =>
        document.querySelector('canvas') === (window as unknown as { __lienzo: Element }).__lienzo,
    );
    expect(mismo).toBe(true);
  });
});
