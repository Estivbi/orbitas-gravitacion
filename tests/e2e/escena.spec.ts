import { expect, test, type BrowserContext, type CDPSession, type Page } from '@playwright/test';
import {
  CONTENEDOR,
  LIENZO,
  PERIODO_FIGURA_DE_OCHO,
  VISTA_INICIAL,
  ahoraEnSegundos,
  botonAnimacion,
  capturarLienzo,
  centroDelLienzo,
  diferenciaAngular,
  distanciaCircular,
  esperarAsentado,
  esperarColoresDibujados,
  esperarEstado,
  esperarLista,
  esperarReproduciendo,
  leerFotogramas,
  leerPosicion,
  leerPosicionConHora,
  leerVista,
  pixelesDistintos,
  reproduciendo,
  workerQueNuncaResponde,
  type Vista,
} from './ayudas';

type Campo = keyof Vista;

/**
 * Cambio de un campo de la vista respecto a una vista base: diferencia angular del acimut, resta
 * del polar y cociente de la distancia (que es un factor).
 */
async function cambioDesde(page: Page, base: Vista, campo: Campo): Promise<number> {
  const actual = await leerVista(page);
  if (campo === 'acimut') return diferenciaAngular(base.acimut, actual.acimut);
  if (campo === 'polar') return actual.polar - base.polar;
  return actual.distancia / base.distancia;
}

/** `data-vista` se escribe síncronamente, pero se lee con reintentos para no depender del orden de los eventos. */
function esperarCambio(page: Page, base: Vista, campo: Campo, esperado: number, decimales = 2) {
  return expect
    .poll(() => cambioDesde(page, base, campo), { timeout: 5_000 })
    .toBeCloseTo(esperado, decimales);
}

/**
 * Estado de partida explícito de cada prueba del grupo serial: lienzo con foco, reproducción en el
 * estado pedido y vista inicial (Home). Ninguna prueba hereda esto de la anterior.
 */
async function partirDe(page: Page, { enMarcha }: { enMarcha: boolean }): Promise<void> {
  await page.locator(LIENZO).focus();
  if ((await reproduciendo(page)) !== String(enMarcha)) {
    await page.keyboard.press('Space');
  }
  await esperarReproduciendo(page, enMarcha);
  await page.keyboard.press('Home');
  await expect.poll(() => leerVista(page), { timeout: 5_000 }).toEqual(VISTA_INICIAL);
}

type PuntoTactil = { x: number; y: number; id: number };

async function gestoTactil(cdp: CDPSession, inicio: PuntoTactil[], pasos: PuntoTactil[][]) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: inicio });
  for (const puntos of pasos) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: puntos });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

// Dependencias del grupo serial (una sola carga de la página, porque levantar WebGL por software es
// lento): todas las pruebas comparten el contexto y la página de `beforeAll`. Cada una fija su
// estado de partida con `partirDe` (reproducción y vista) y deja el viewport en 1280×720, pero
// comparten el hecho de que el giro automático ya se detuvo en cuanto la primera tocó la cámara.
// Si una prueba falla, las siguientes se saltan (modo serial): el fallo real es el primero.
test.describe.serial('GRV-03 · escena con WebGL (una sola carga)', () => {
  let contexto: BrowserContext;
  let page: Page;
  let hayFallos = false;

  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    contexto = await browser.newContext({
      baseURL,
      hasTouch: true,
      viewport: { width: 1280, height: 720 },
    });
    // Contexto manual: Playwright no activa solo las trazas, así que se graban aquí y se guardan si falla algo.
    await contexto.tracing.start({ screenshots: true, snapshots: true });
    page = await contexto.newPage();
    await page.goto('/');
    await esperarLista(page);
  });

  test.afterEach((_fixtures, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) hayFallos = true;
  });

  test.afterAll(async (_fixtures, testInfo) => {
    await contexto.tracing.stop(
      hayFallos ? { path: testInfo.outputPath('traza-escena.zip') } : undefined,
    );
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
    const instrucciones = page.locator(`[id="${descripcionId}"]`);
    await expect(instrucciones).toHaveCount(1);
    await expect(instrucciones).toBeVisible();
    expect((await instrucciones.innerText()).trim().length).toBeGreaterThan(0);

    const alfa = await lienzo.evaluate(
      (el: HTMLCanvasElement) => el.getContext('webgl2')?.getContextAttributes()?.alpha,
    );
    expect(alfa).toBe(false);

    // No se comprueba qué color lleva cada cuerpo: dónde cae cada uno en pantalla depende de la
    // cámara y de la proyección. Basta con que aparezcan los tres (el orden lo fija DESIGN.md).
    await esperarColoresDibujados(page);
  });

  test('criterio 12: en marcha, dos capturas separadas difieren', async () => {
    await partirDe(page, { enMarcha: true });
    await expect
      .poll(
        async () => {
          const primera = await capturarLienzo(page);
          await page.waitForTimeout(300);
          return pixelesDistintos(primera, await capturarLienzo(page));
        },
        { timeout: 20_000 },
      )
      .toBeGreaterThan(20);
  });

  test('criterio 12: pausada, la imagen se estabiliza y dos capturas separadas son idénticas', async () => {
    await partirDe(page, { enMarcha: false });
    // El suavizado de la cámara tarda un poco en llegar a la vista objetivo tras Home.
    await expect
      .poll(
        async () => {
          const primera = await capturarLienzo(page);
          await page.waitForTimeout(250);
          return pixelesDistintos(primera, await capturarLienzo(page));
        },
        { timeout: 20_000 },
      )
      .toBe(0);

    const primera = await capturarLienzo(page);
    await page.waitForTimeout(1000);
    expect(pixelesDistintos(primera, await capturarLienzo(page))).toBe(0);
  });

  test('criterio 13: las flechas giran en el sentido del contrato y +, = y - acercan y alejan', async () => {
    await partirDe(page, { enMarcha: false });
    const inicial = await leerVista(page);

    await page.keyboard.press('ArrowRight');
    await esperarCambio(page, inicial, 'acimut', 0.14);
    const tras1 = await leerVista(page);
    expect(tras1.polar).toBeCloseTo(inicial.polar, 3);
    expect(tras1.distancia).toBeCloseTo(inicial.distancia, 3);

    await page.keyboard.press('ArrowLeft');
    await esperarCambio(page, tras1, 'acimut', -0.14);
    const tras2 = await leerVista(page);
    expect(tras2.acimut).toBeCloseTo(inicial.acimut, 2);

    await page.keyboard.press('ArrowUp');
    await esperarCambio(page, tras2, 'polar', -0.1);
    const tras3 = await leerVista(page);
    expect(tras3.acimut).toBeCloseTo(tras2.acimut, 3);

    await page.keyboard.press('ArrowDown');
    await esperarCambio(page, tras3, 'polar', 0.1);
    const tras4 = await leerVista(page);

    await page.keyboard.press('+');
    await esperarCambio(page, tras4, 'distancia', 0.88);
    const tras5 = await leerVista(page);

    await page.keyboard.press('=');
    await esperarCambio(page, tras5, 'distancia', 0.88);
    const tras6 = await leerVista(page);

    await page.keyboard.press('-');
    await esperarCambio(page, tras6, 'distancia', 1.14);
  });

  test('criterio 13: con Ctrl, Alt o Meta pulsados las teclas no mueven la cámara', async () => {
    await partirDe(page, { enMarcha: false });
    const base = await leerVista(page);

    await page.keyboard.press('Control+=');
    await page.keyboard.press('Alt+ArrowUp');
    await page.keyboard.press('Meta+-');
    await esperarAsentado(page);

    // Prueba de que las pulsaciones anteriores ya se procesaron: una flecha sin modificadores,
    // enviada después, sí cambia el acimut, y lo único que ha cambiado es eso.
    await page.keyboard.press('ArrowRight');
    await esperarCambio(page, base, 'acimut', 0.14);
    const despues = await leerVista(page);
    expect(despues.polar).toBe(base.polar);
    expect(despues.distancia).toBe(base.distancia);
  });

  test('criterio 13: Home devuelve la vista inicial', async () => {
    await partirDe(page, { enMarcha: false });
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('+');
    await expect
      .poll(async () => (await leerVista(page)).distancia, { timeout: 5_000 })
      .toBeLessThan(1);
    await page.keyboard.press('Home');
    await expect.poll(() => leerVista(page), { timeout: 5_000 }).toEqual(VISTA_INICIAL);
  });

  test('criterio 13: Espacio y las flechas con el lienzo enfocado no desplazan la página', async () => {
    await partirDe(page, { enMarcha: false });
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const recorrido = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    );
    // Sin recorrido vertical la prueba no demostraría nada.
    expect(recorrido).toBeGreaterThan(0);

    for (const tecla of ['Space', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight']) {
      await page.keyboard.press(tecla);
    }
    await esperarAsentado(page);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    // Prueba de que el lienzo recibió las teclas: Espacio alternó la reproducción (de pausa a marcha).
    expect(await reproduciendo(page)).toBe('true');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.keyboard.press('Space');
    await esperarReproduciendo(page, false);
  });

  test('criterio 13: arrastrar con el ratón gira en el sentido del contrato', async () => {
    await partirDe(page, { enMarcha: false });
    const base = await leerVista(page);
    const { x, y } = await centroDelLienzo(page);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 120, y + 40, { steps: 8 });
    await page.mouse.up();

    // dAcimut = −dx · 0,008 y dPolar = −dy · 0,008
    await esperarCambio(page, base, 'acimut', -0.96, 1);
    await esperarCambio(page, base, 'polar', -0.32, 1);
    expect((await leerVista(page)).distancia).toBe(base.distancia);
  });

  test('criterio 13: un dedo en horizontal gira el acimut y en vertical no toca el polar', async () => {
    await partirDe(page, { enMarcha: false });
    const cdp = await contexto.newCDPSession(page);
    const base = await leerVista(page);

    // Vertical: el navegador se queda el gesto (touch-action: pan-y) y la vista no cambia.
    let { x, y } = await centroDelLienzo(page);
    const bajando = Array.from({ length: 10 }, (_, i) => [{ x, y: y + (i + 1) * 10, id: 1 }]);
    await gestoTactil(cdp, [{ x, y, id: 1 }], bajando);
    await esperarAsentado(page);
    expect(await leerVista(page)).toEqual(base);

    // Horizontal: gira el acimut y deja el polar donde estaba. Demuestra además que lo anterior ya se procesó.
    await page.evaluate(() => window.scrollTo(0, 0));
    ({ x, y } = await centroDelLienzo(page));
    const lateral = Array.from({ length: 10 }, (_, i) => [{ x: x + (i + 1) * 10, y, id: 1 }]);
    await gestoTactil(cdp, [{ x, y, id: 1 }], lateral);
    await expect
      .poll(async () => Math.abs(await cambioDesde(page, base, 'acimut')), { timeout: 5_000 })
      .toBeGreaterThan(0.2);
    const despues = await leerVista(page);
    expect(despues.polar).toBe(base.polar);
    expect(despues.distancia).toBe(base.distancia);
  });

  test('criterio 13: dos dedos que se separan acercan y que se juntan alejan', async () => {
    await partirDe(page, { enMarcha: false });
    await page.evaluate(() => window.scrollTo(0, 0));
    const { x, y } = await centroDelLienzo(page);
    const cdp = await contexto.newCDPSession(page);
    const dedos = (separacion: number): PuntoTactil[] => [
      { x: x - separacion, y, id: 1 },
      { x: x + separacion, y, id: 2 },
    ];

    const inicial = await leerVista(page);
    await gestoTactil(
      cdp,
      dedos(30),
      [40, 60, 80, 100, 120, 140, 160].map((s) => dedos(s)),
    );
    await expect
      .poll(async () => (await leerVista(page)).distancia, { timeout: 5_000 })
      .toBeLessThan(inicial.distancia - 0.1);
    const acercada = await leerVista(page);

    await gestoTactil(
      cdp,
      dedos(160),
      [140, 120, 100, 80, 60, 30].map((s) => dedos(s)),
    );
    await expect
      .poll(async () => (await leerVista(page)).distancia, { timeout: 5_000 })
      .toBeGreaterThan(acercada.distancia + 0.1);
  });

  test('criterio 13: la rueda desplaza la página y no cambia la vista; el lienzo deja pasar el desplazamiento vertical', async () => {
    await partirDe(page, { enMarcha: false });
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeGreaterThan(400);

    const caja = await page.locator(LIENZO).boundingBox();
    expect(caja).not.toBeNull();
    const arriba = Math.max(caja!.y, 0);
    const abajo = Math.min(caja!.y + caja!.height, 400);
    // El lienzo debe verse en la parte superior de la página para poder poner el ratón encima.
    expect(abajo - arriba).toBeGreaterThan(20);

    const antes = await leerVista(page);
    await page.mouse.move(caja!.x + caja!.width / 2, (arriba + abajo) / 2);
    await page.mouse.wheel(0, 300);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeGreaterThan(0);

    expect(await leerVista(page)).toEqual(antes);
    expect(await page.locator(LIENZO).evaluate((el) => getComputedStyle(el).touchAction)).toBe(
      'pan-y',
    );

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.evaluate(() => window.scrollTo(0, 0));
  });

  test('criterio 14: el botón y la tecla Espacio pausan y reanudan sin saltos', async () => {
    await partirDe(page, { enMarcha: true });
    const boton = botonAnimacion(page);
    await expect(boton).toHaveText(/pausar animación/i);

    const caja = await boton.boundingBox();
    expect(caja!.height).toBeGreaterThanOrEqual(44);
    expect(caja!.width).toBeGreaterThanOrEqual(44);

    await boton.click();
    await esperarReproduciendo(page, false);
    await expect(boton).toHaveText(/reproducir animación/i);

    // Quieta durante un segundo (comprobación negativa, tras dejar que se asiente el último fotograma).
    await esperarAsentado(page);
    const quieta = await leerPosicion(page);
    const vistaQuieta = await leerVista(page);
    await page.waitForTimeout(1000);
    expect(await leerPosicion(page)).toBe(quieta);
    expect(await leerVista(page)).toEqual(vistaQuieta);

    // Al reanudar avanza, y no más deprisa que el tiempo real transcurrido (más 0,1 s de margen).
    const inicio = await ahoraEnSegundos(page);
    await boton.click();
    await esperarReproduciendo(page, true);
    await expect(boton).toHaveText(/pausar animación/i);
    await expect
      .poll(async () => distanciaCircular(quieta, await leerPosicion(page)), { timeout: 10_000 })
      .toBeGreaterThan(0);
    await page.waitForTimeout(600);
    const { posicion, segundos } = await leerPosicionConHora(page);
    const salto = distanciaCircular(quieta, posicion);
    expect(salto).toBeGreaterThan(0);
    expect(salto).toBeLessThan((segundos - inicio + 0.1) / PERIODO_FIGURA_DE_OCHO);

    // La tecla Espacio con el lienzo enfocado hace lo mismo.
    await page.locator(LIENZO).focus();
    await page.keyboard.press('Space');
    await esperarReproduciendo(page, false);
    await expect(boton).toHaveText(/reproducir animación/i);
    await page.keyboard.press('Space');
    await esperarReproduciendo(page, true);
    await expect(boton).toHaveText(/pausar animación/i);
  });

  test('criterio 16: con la pestaña oculta no se dibuja y al volver la posición no salta', async () => {
    await partirDe(page, { enMarcha: true });
    const ocultar = (oculta: boolean) =>
      page.evaluate((valor) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => valor });
        Object.defineProperty(document, 'visibilityState', {
          configurable: true,
          get: () => (valor ? 'hidden' : 'visible'),
        });
        document.dispatchEvent(new Event('visibilitychange'));
      }, oculta);

    const antes = await leerFotogramas(page);
    await expect.poll(() => leerFotogramas(page), { timeout: 10_000 }).toBeGreaterThan(antes);

    await ocultar(true);
    await esperarAsentado(page);
    const congelados = await leerFotogramas(page);
    const posicionOculta = await leerPosicion(page);
    await page.waitForTimeout(1500);
    expect(await leerFotogramas(page)).toBe(congelados);
    expect(await leerPosicion(page)).toBe(posicionOculta);

    const inicio = await ahoraEnSegundos(page);
    await ocultar(false);
    await expect.poll(() => leerFotogramas(page), { timeout: 10_000 }).toBeGreaterThan(congelados);
    await page.waitForTimeout(500);
    const { posicion, segundos } = await leerPosicionConHora(page);
    expect(distanciaCircular(posicionOculta, posicion)).toBeLessThan(
      (segundos - inicio + 0.1) / PERIODO_FIGURA_DE_OCHO,
    );
  });

  test('criterio 19: ya lista, la escena se adapta a 375, 768 y 1440 px sin desbordar', async () => {
    await partirDe(page, { enMarcha: false });
    for (const [ancho, alto] of [
      [375, 812],
      [768, 1024],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width: ancho, height: alto });
      await expect
        .poll(
          () =>
            page.evaluate(
              () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
            ),
          { timeout: 5_000, message: `desbordamiento horizontal a ${ancho} px` },
        )
        .toBe(false);

      // Se mide el lienzo, no el contenedor.
      await expect
        .poll(async () => (await page.locator(LIENZO).boundingBox())?.width ?? 0, {
          timeout: 5_000,
        })
        .toBeLessThanOrEqual(ancho + 0.5);
      const caja = await page.locator(LIENZO).boundingBox();
      expect(caja!.x).toBeGreaterThanOrEqual(-0.5);
      expect(caja!.x + caja!.width).toBeLessThanOrEqual(ancho + 0.5);
      if (ancho === 375) {
        await expect
          .poll(async () => (await page.locator(LIENZO).boundingBox())?.height ?? 0, {
            timeout: 5_000,
          })
          .toBeGreaterThanOrEqual(360);
      }
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});

test.describe('GRV-03 · giro automático de la cámara', () => {
  test('criterio 20: gira solo el acimut y se detiene al pausar', async ({ page }) => {
    await page.goto('/');
    await esperarLista(page);

    const v0 = await leerVista(page);
    await expect
      .poll(async () => Math.abs(diferenciaAngular(v0.acimut, (await leerVista(page)).acimut)), {
        timeout: 15_000,
      })
      .toBeGreaterThan(0.05);
    const v1 = await leerVista(page);
    expect(v1.polar).toBe(v0.polar);
    expect(v1.distancia).toBe(v0.distancia);

    await botonAnimacion(page).click();
    await esperarReproduciendo(page, false);
    await esperarAsentado(page);
    const pausada = await leerVista(page);
    await page.waitForTimeout(800);
    expect(await leerVista(page)).toEqual(pausada);
  });

  for (const gesto of ['una flecha', 'un arrastre del ratón'] as const) {
    test(`criterio 20: tras ${gesto} el giro se detiene y no se reanuda al volver a reproducir`, async ({
      page,
    }) => {
      await page.goto('/');
      await esperarLista(page);
      const v0 = await leerVista(page);

      if (gesto === 'una flecha') {
        await page.locator(LIENZO).focus();
        await page.keyboard.press('ArrowUp');
      } else {
        const { x, y } = await centroDelLienzo(page);
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x, y + 40, { steps: 5 });
        await page.mouse.up();
      }
      await expect
        .poll(async () => (await leerVista(page)).polar, { timeout: 5_000 })
        .not.toBe(v0.polar);
      await esperarAsentado(page);
      const tocada = await leerVista(page);
      await page.waitForTimeout(1200);
      expect(await leerVista(page)).toEqual(tocada);

      await botonAnimacion(page).click();
      await esperarReproduciendo(page, false);
      await botonAnimacion(page).click();
      await esperarReproduciendo(page, true);
      await page.waitForTimeout(1200);
      expect(await leerVista(page)).toEqual(tocada);

      // Prueba de que la página sigue viva y que lo anterior no era un bucle detenido: la cámara responde.
      await page.locator(LIENZO).focus();
      await page.keyboard.press('ArrowRight');
      await esperarCambio(page, tocada, 'acimut', 0.14);
    });
  }
});

test.describe('GRV-03 · movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('criterios 15 y 20: la escena empieza pausada y la cámara no gira sola', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);

    expect(await reproduciendo(page)).toBe('false');
    await expect(botonAnimacion(page)).toHaveText(/reproducir animación/i);

    await esperarAsentado(page);
    const posicion = await leerPosicion(page);
    const vista = await leerVista(page);
    await page.waitForTimeout(1000);
    expect(await leerPosicion(page)).toBe(posicion);
    expect(await leerVista(page)).toEqual(vista);

    // Prueba de que la cámara sigue respondiendo: una flecha sí la mueve.
    await page.locator(LIENZO).focus();
    await page.keyboard.press('ArrowRight');
    await esperarCambio(page, vista, 'acimut', 0.14);
  });

  test('criterio 12: con movimiento reducido el lienzo se dibuja, queda quieto y una flecha lo cambia', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);

    const primera = await esperarColoresDibujados(page);

    await page.waitForTimeout(1000);
    expect(pixelesDistintos(primera, await capturarLienzo(page))).toBe(0);

    await page.locator(LIENZO).focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => pixelesDistintos(primera, await capturarLienzo(page)), {
        timeout: 10_000,
      })
      .toBeGreaterThan(100);
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
    await botonAnimacion(page).click();
    await esperarReproduciendo(page, false);
    await botonAnimacion(page).click();
    await esperarReproduciendo(page, true);
    const mismo = await page.evaluate(
      () =>
        document.querySelector('canvas') === (window as unknown as { __lienzo: Element }).__lienzo,
    );
    expect(mismo).toBe(true);
  });
});

test.describe('GRV-03 · el botón de animación espera a la escena', () => {
  test('criterio 14: mientras el Worker no responde no hay botón y la miniatura sigue ahí', async ({
    page,
  }) => {
    // Limitación: lo natural sería bloquear con page.route la petición del chunk del Worker, pero su
    // URL lleva un hash que cambia en cada compilación y Playwright no distingue la petición de un
    // Worker de las de los demás scripts. En su lugar se sustituye window.Worker por uno que nunca
    // contesta, lo que deja a la escena en `cargando` de forma estable.
    await page.addInitScript(workerQueNuncaResponde);
    await page.goto('/');
    await esperarEstado(page, 'cargando');

    await page.waitForTimeout(1500);
    await expect(page.locator(CONTENEDOR)).toHaveAttribute('data-estado-escena', 'cargando');
    await expect(botonAnimacion(page)).toHaveCount(0);
    await expect(page.locator(CONTENEDOR).locator('svg').first()).toBeVisible();
  });
});
