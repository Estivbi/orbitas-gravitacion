import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { SLUGS } from '../../src/lib/fisica';
import { rutaDeOrbita } from '../../src/lib/galeria/navegacion';
import {
  CONTENEDOR,
  ENLACES_GALERIA,
  GALERIA,
  alturaEstable,
  elegirRadio,
  enteroEnVentana,
  esperarAsentado,
  esperarLista,
  instrumentarEscenas,
  iniciarCronometro,
  leerRegistro,
  milisegundosHastaLista,
  orbitaEnfocada,
  ordenDeEnlaces,
  paradasDeTabulacion,
  subrayadoDe,
  vigilar,
  type Vigilancia,
} from './ayudas';

// Sin esto, un elemento que no existe haría esperar a las acciones hasta el límite de la prueba.
test.use({ actionTimeout: 20_000 });

const CATALOGO = [...SLUGS];
const POR_PERIODO = [
  'butterfly-i',
  'figura-de-ocho',
  'lagrange',
  'goggles',
  'moth-i',
  'yin-yang-i',
];
const POR_ENERGIA = [
  'goggles',
  'butterfly-i',
  'yin-yang-i',
  'moth-i',
  'figura-de-ocho',
  'lagrange',
];
const AMBAR = 'rgb(255, 184, 41)';

const grupoDeOrden = (page: Page) => page.getByRole('radiogroup', { name: 'Ordenar por' });
const radioDeOrden = (page: Page, nombre: string) =>
  grupoDeOrden(page).getByRole('radio', { name: nombre, exact: true });
const enlaceDe = (page: Page, slug: string) =>
  page.locator(`${ENLACES_GALERIA}[data-orbita="${slug}"]`);
const avisoDeLaGaleria = (page: Page) => page.locator(GALERIA).getByRole('status');
const volver = (page: Page) => page.getByRole('link', { name: 'Volver a la galería', exact: true });

async function elegirOrden(page: Page, nombre: string): Promise<void> {
  await elegirRadio(radioDeOrden(page, nombre));
}

/** Espera a que los enlaces de la galería estén en el orden pedido. */
async function esperarOrden(page: Page, orden: readonly string[]): Promise<void> {
  await expect.poll(() => ordenDeEnlaces(page), { timeout: 10_000 }).toEqual(orden);
}

async function hayEnfocadoEnLaGaleria(page: Page): Promise<boolean> {
  return page.evaluate((selector) => {
    const activo = document.activeElement;
    return activo !== null && activo.closest(selector) !== null;
  }, `${GALERIA} a`);
}

// Una sola carga de la portada para las comprobaciones que no cambian de estado entre sí (WebGL por
// software es lento). Si una falla, las siguientes se saltan (modo serial): el fallo real es el primero.
test.describe.serial('portada: galería con JavaScript (una sola carga)', () => {
  let contexto: BrowserContext;
  let page: Page;
  let vigilancia: Vigilancia;

  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    contexto = await browser.newContext({ baseURL });
    contexto.setDefaultTimeout(20_000);
    page = await contexto.newPage();
    vigilancia = vigilar(page);
    await page.goto('/');
    await esperarLista(page);
  });

  test.afterAll(async () => {
    await contexto.close();
  });

  test('GRV-04 · criterio 18: hidratación, una sola parada de tabulación y la altura que ya traía el servidor', async ({
    request,
    baseURL,
  }) => {
    // El orden del cliente es el del HTML del servidor, y es el del catálogo.
    const html = await (await request.get('/')).text();
    const delServidor = [...html.matchAll(/data-orbita="([a-z-]+)"/g)].map(([, slug]) => slug);
    expect(delServidor).toEqual(CATALOGO);
    expect(await ordenDeEnlaces(page)).toEqual(CATALOGO);

    // Tres radios, «Catálogo» marcado, y un aviso vacío.
    await expect(grupoDeOrden(page).getByRole('radio')).toHaveCount(3);
    for (const nombre of ['Catálogo', 'Periodo', 'Energía']) {
      await expect(radioDeOrden(page, nombre)).toHaveCount(1);
    }
    await expect(radioDeOrden(page, 'Catálogo')).toBeChecked();
    await expect(radioDeOrden(page, 'Periodo')).not.toBeChecked();
    await expect(radioDeOrden(page, 'Energía')).not.toBeChecked();
    await expect(avisoDeLaGaleria(page)).toHaveCount(1);
    await expect(avisoDeLaGaleria(page)).toHaveText('');

    // Sin errores de hidratación.
    expect(vigilancia.errores).toEqual([]);
    expect(vigilancia.consola.filter((m) => /hydrat|hidrat/i.test(m.texto))).toEqual([]);

    // El grupo es una sola parada de tabulación.
    const paradas = await paradasDeTabulacion(page);
    const delGrupo = paradas.filter((p) => p.grupo?.trim().toLowerCase() === 'ordenar por');
    expect(delGrupo).toHaveLength(1);
    expect(delGrupo[0]!.nombre).toBe('Catálogo');
    expect(
      paradas.filter((p) => p.enGaleria && p.href?.startsWith('/orbitas/')).map((p) => p.href),
    ).toEqual(SLUGS.map(rutaDeOrbita));

    // La altura de la galería con JavaScript es la que tiene sin él.
    await page.evaluate(() => window.scrollTo(0, 0));
    const conJs = await alturaEstable(page, GALERIA);
    const contextoSinJs = await contexto.browser()!.newContext({
      baseURL,
      javaScriptEnabled: false,
      viewport: page.viewportSize() ?? { width: 1280, height: 720 },
    });
    contextoSinJs.setDefaultTimeout(20_000);
    try {
      const sinJs = await contextoSinJs.newPage();
      await sinJs.goto('/');
      const altura = await alturaEstable(sinJs, GALERIA);
      expect(Math.abs(conJs - altura), `con JS ${conJs}, sin JS ${altura}`).toBeLessThan(2);
    } finally {
      await contextoSinJs.close();
    }
  });

  test('GRV-04 · criterio 31: el nombre accesible de «Ordenar por» es su texto visible', async () => {
    const grupo = grupoDeOrden(page);
    await expect(grupo).toHaveCount(1);
    const visible = await grupo.evaluate((el) => {
      const id = el.getAttribute('aria-labelledby');
      return id ? (document.getElementById(id)?.textContent ?? null) : null;
    });
    expect(visible?.trim().toLowerCase()).toBe('ordenar por');
  });

  test('GRV-04 · criterio 33: la galería no tiene ninguna animación en marcha', async () => {
    const animaciones = await page.evaluate(
      () => document.querySelector('#galeria')?.getAnimations({ subtree: true }).length ?? -1,
    );
    expect(animaciones).toBe(0);
  });

  test('GRV-04 · criterio 18: elegir un orden reordena los enlaces, avisa, conserva el foco y subraya la opción', async () => {
    // Teclado: con el foco en «Catálogo», la flecha derecha elige «Periodo».
    await radioDeOrden(page, 'Catálogo').focus();
    await page.keyboard.press('ArrowRight');
    await expect(radioDeOrden(page, 'Periodo')).toBeChecked();
    await esperarOrden(page, POR_PERIODO);
    await expect(avisoDeLaGaleria(page)).toHaveText('Galería ordenada por periodo.');
    await expect(radioDeOrden(page, 'Periodo')).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(radioDeOrden(page, 'Energía')).toBeChecked();
    await esperarOrden(page, POR_ENERGIA);
    await expect(avisoDeLaGaleria(page)).toHaveText('Galería ordenada por energía.');
    await expect(radioDeOrden(page, 'Energía')).toBeFocused();

    // Solo la opción marcada está subrayada, en ámbar.
    const subrayada = await subrayadoDe(radioDeOrden(page, 'Energía'));
    expect(subrayada?.linea).toContain('underline');
    expect(subrayada?.color).toBe(AMBAR);
    expect(await subrayadoDe(radioDeOrden(page, 'Catálogo'))).toBeNull();
    expect(await subrayadoDe(radioDeOrden(page, 'Periodo'))).toBeNull();

    // Ratón: pulsar la etiqueta de «Catálogo» lo recupera.
    await elegirOrden(page, 'Catálogo');
    await expect(radioDeOrden(page, 'Catálogo')).toBeChecked();
    await esperarOrden(page, CATALOGO);
    await expect(avisoDeLaGaleria(page)).toHaveText('Galería ordenada por catálogo.');
    expect((await subrayadoDe(radioDeOrden(page, 'Catálogo')))?.color).toBe(AMBAR);
    expect(await subrayadoDe(radioDeOrden(page, 'Energía'))).toBeNull();
  });
});

for (const [ancho, alto] of [
  [375, 812],
  [1440, 900],
] as const) {
  test.describe(`volver al navegar atrás a ${ancho} px`, () => {
    test.use({ viewport: { width: ancho, height: alto } });

    test(`GRV-04 · criterio 19: a ${ancho} px, «Energía» sigue marcada, Moth I enfocado y el primer orden pintado ya es el de energía`, async ({
      page,
    }) => {
      await page.goto('/');
      await esperarLista(page);
      await elegirOrden(page, 'Energía');
      await esperarOrden(page, POR_ENERGIA);

      await enlaceDe(page, 'moth-i').click();
      await expect(page).toHaveURL(/\/orbitas\/moth-i$/);
      await expect(page.locator('[data-detalle="moth-i"]')).toHaveCount(1);

      // Instalado antes de volver: anota el orden de los enlaces cada vez que la lista aparece o cambia.
      await page.evaluate((selector) => {
        const registro: string[] = [];
        (window as unknown as { __ordenes: string[] }).__ordenes = registro;
        new MutationObserver(() => {
          const enlaces = Array.from(document.querySelectorAll(selector));
          if (enlaces.length !== 6) return;
          const orden = enlaces.map((enlace) => enlace.getAttribute('data-orbita')).join(',');
          if (registro[registro.length - 1] !== orden) registro.push(orden);
        }).observe(document, { subtree: true, childList: true });
      }, ENLACES_GALERIA);

      await page.goBack();
      await expect(page).toHaveURL('/');
      await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
      await esperarLista(page);

      await expect(radioDeOrden(page, 'Energía')).toBeChecked();
      await esperarOrden(page, POR_ENERGIA);
      await expect.poll(() => orbitaEnfocada(page), { timeout: 10_000 }).toBe('moth-i');
      await expect
        .poll(() => enteroEnVentana(enlaceDe(page, 'moth-i')), { timeout: 10_000 })
        .toBe(true);

      const ordenes = await page.evaluate(
        () => (window as unknown as { __ordenes: string[] }).__ordenes,
      );
      expect(ordenes.length).toBeGreaterThan(0);
      expect(ordenes[0]).toBe(POR_ENERGIA.join(','));
    });
  });
}

test.describe('volver con el enlace y sin persistencia', () => {
  test('GRV-04 · criterio 20: «Periodo» sigue marcada, Goggles queda enfocado y visible, y una recarga lo olvida todo', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);
    await elegirOrden(page, 'Periodo');
    await esperarOrden(page, POR_PERIODO);

    await enlaceDe(page, 'goggles').click();
    await expect(page).toHaveURL(/\/orbitas\/goggles$/);
    await volver(page).click();
    await expect(page).toHaveURL(/\/#galeria$/);

    await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
    await expect(radioDeOrden(page, 'Periodo')).toBeChecked();
    await esperarOrden(page, POR_PERIODO);
    await expect.poll(() => orbitaEnfocada(page), { timeout: 10_000 }).toBe('goggles');
    await expect
      .poll(() => enteroEnVentana(enlaceDe(page, 'goggles')), { timeout: 10_000 })
      .toBe(true);

    // Recargar: el estado es nuevo y no queda nada en el almacenamiento del navegador.
    await page.reload();
    await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
    await esperarLista(page);
    await esperarAsentado(page);
    await expect(radioDeOrden(page, 'Catálogo')).toBeChecked();
    expect(await ordenDeEnlaces(page)).toEqual(CATALOGO);
    expect(await hayEnfocadoEnLaGaleria(page)).toBe(false);
    expect(await orbitaEnfocada(page)).toBeNull();
    expect(
      await page.evaluate(() => ({
        local: window.localStorage.length,
        sesion: window.sessionStorage.length,
      })),
    ).toEqual({ local: 0, sesion: 0 });
  });

  test('GRV-04 · criterio 20: con el detalle abierto directamente por su URL, «Volver a la galería» enfoca Goggles', async ({
    page,
  }) => {
    await page.goto('/orbitas/goggles');
    await esperarLista(page);
    await volver(page).click();
    await expect(page).toHaveURL(/\/#galeria$/);
    await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
    await expect.poll(() => orbitaEnfocada(page), { timeout: 10_000 }).toBe('goggles');
    await expect
      .poll(() => enteroEnVentana(enlaceDe(page, 'goggles')), { timeout: 10_000 })
      .toBe(true);
  });

  test('GRV-04 · criterio 36: el logotipo de la cabecera no restaura el foco ni el desplazamiento', async ({
    page,
  }) => {
    await page.goto('/');
    await esperarLista(page);
    await elegirOrden(page, 'Energía');
    await esperarOrden(page, POR_ENERGIA);
    await enlaceDe(page, 'moth-i').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

    await enlaceDe(page, 'moth-i').click();
    await expect(page).toHaveURL(/\/orbitas\/moth-i$/);
    await expect(page.locator('[data-detalle="moth-i"]')).toHaveCount(1);

    await page.getByRole('link', { name: 'Órbitas, inicio' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
    await esperarLista(page);
    await esperarAsentado(page);
    await page.waitForTimeout(500);

    expect(new URL(page.url()).hash).toBe('');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await hayEnfocadoEnLaGaleria(page)).toBe(false);
    expect(await orbitaEnfocada(page)).toBeNull();
    // El estado de interfaz sí se conserva: solo se omiten el foco y el desplazamiento.
    await expect(radioDeOrden(page, 'Energía')).toBeChecked();
    expect(await ordenDeEnlaces(page)).toEqual(POR_ENERGIA);
  });
});

test.describe('navegación entre órbitas', () => {
  test('GRV-04 · criterio 21: anterior y siguiente navegan sin recargar, de forma cíclica, y «Volver» enfoca la miniatura', async ({
    page,
  }) => {
    await page.goto('/orbitas/lagrange');
    await esperarLista(page);
    await page.evaluate(() => {
      (window as unknown as { __marca: number }).__marca = 1;
    });
    const marca = () =>
      page.evaluate(() => (window as unknown as { __marca?: number }).__marca ?? null);

    await page.getByRole('link', { name: 'Anterior: Yin-Yang I', exact: true }).click();
    await expect(page).toHaveURL(/\/orbitas\/yin-yang-i$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Yin-Yang I');
    await expect(page.locator('[data-detalle]')).toHaveAttribute('data-detalle', 'yin-yang-i');
    await esperarLista(page);
    expect(await marca()).toBe(1);

    await page.getByRole('link', { name: 'Siguiente: Lagrange', exact: true }).click();
    await expect(page).toHaveURL(/\/orbitas\/lagrange$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Lagrange');
    await expect(page.locator('[data-detalle]')).toHaveAttribute('data-detalle', 'lagrange');
    await esperarLista(page);
    expect(await marca()).toBe(1);

    await page.getByRole('link', { name: 'Siguiente: Figura de ocho', exact: true }).click();
    await expect(page).toHaveURL(/\/orbitas\/figura-de-ocho$/);
    await expect(page.locator('[data-detalle]')).toHaveAttribute('data-detalle', 'figura-de-ocho');
    await esperarLista(page);
    expect(await marca()).toBe(1);

    await volver(page).click();
    await expect(page).toHaveURL(/\/#galeria$/);
    await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
    await expect.poll(() => orbitaEnfocada(page), { timeout: 10_000 }).toBe('figura-de-ocho');
    await expect
      .poll(() => enteroEnVentana(enlaceDe(page, 'figura-de-ocho')), { timeout: 10_000 })
      .toBe(true);
    expect(await marca()).toBe(1);
  });
});

test.describe('limpieza de escenas al navegar', () => {
  const VUELTAS = 12;
  const MAXIMO_EN_FRIO_MS = 3000;
  const MAXIMO_EN_CALIENTE_MS = 600;

  test('GRV-04 · criterio 22: 12 idas y vueltas por navegación cliente no dejan contextos WebGL ni Workers de más', async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await page.addInitScript(instrumentarEscenas);
    const vigilancia = vigilar(page);

    await page.goto('/');
    await esperarLista(page);
    // Cold start: desde el inicio de la navegación hasta la primera escena en `lista`.
    const frio = (await leerRegistro(page)).listaEn;
    expect(frio, 'la primera escena llegó a lista').not.toBeNull();
    expect(frio!, 'goto en frío hasta lista (ms)').toBeLessThanOrEqual(MAXIMO_EN_FRIO_MS);

    const enCaliente: number[] = [];
    const vivosPorVuelta: number[] = [];

    for (let vuelta = 0; vuelta < VUELTAS; vuelta++) {
      const slug = vuelta % 2 === 0 ? 'figura-de-ocho' : 'goggles';

      await iniciarCronometro(page);
      await enlaceDe(page, slug).click();
      enCaliente.push(await milisegundosHastaLista(page, 45_000));
      await expect(page.locator(`[data-detalle="${slug}"]`)).toHaveCount(1);
      vivosPorVuelta.push((await leerRegistro(page)).vivos);

      await iniciarCronometro(page);
      await volver(page).click();
      enCaliente.push(await milisegundosHastaLista(page, 45_000));
      await expect(page.locator(ENLACES_GALERIA)).toHaveCount(6);
      vivosPorVuelta.push((await leerRegistro(page)).vivos);
    }

    await expect
      .poll(async () => (await leerRegistro(page)).vivos, { timeout: 15_000 })
      .toBeLessThanOrEqual(1);
    const final = await leerRegistro(page);
    expect(final.creados, 'contextos creados').toBeGreaterThanOrEqual(24);
    expect(final.vivos, 'contextos vivos al terminar').toBeLessThanOrEqual(1);
    expect(
      Math.max(...vivosPorVuelta),
      `vivos tras cada paso: ${vivosPorVuelta.join(' ')}`,
    ).toBeLessThanOrEqual(2);
    expect(final.workers, 'Workers construidos').toBe(1);
    expect(final.calcular, 'peticiones calcular (figura de ocho y Goggles, una vez cada una)').toBe(
      2,
    );

    expect(
      Math.max(...enCaliente),
      `navegaciones en caliente hasta lista (ms): ${enCaliente.map(Math.round).join(' ')}`,
    ).toBeLessThanOrEqual(MAXIMO_EN_CALIENTE_MS);

    expect(
      vigilancia.consola.filter((m) => /Too many active WebGL contexts/i.test(m.texto)),
    ).toEqual([]);
    expect(vigilancia.errores).toEqual([]);
    await expect(page.locator(CONTENEDOR)).toHaveCount(1);
  });
});
