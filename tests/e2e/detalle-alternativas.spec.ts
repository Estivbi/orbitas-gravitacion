import { expect, test, type Page } from '@playwright/test';
import { rutaDeOrbita, vecinas } from '../../src/lib/galeria/navegacion';
import {
  CONTENEDOR,
  CONTROLES,
  DETALLE,
  LIENZO,
  TELEMETRIA,
  VISTA_INICIAL,
  botonAnimacion,
  distanciaCircular,
  esperarAsentado,
  esperarEstado,
  esperarLista,
  leerActualizaciones,
  leerCifras,
  leerPosicion,
  leerVista,
  normalizar,
  orbitaDe,
  paradasDeTabulacion,
  reproduciendo,
  sinWebgl,
  textoDeColumna,
  textosIniciales,
  vigilar,
  workerQueFalla,
} from './ayudas';

// Sin esto, un elemento que no existe haría esperar a las acciones hasta el límite de la prueba.
test.use({ actionTimeout: 20_000 });

const VISTA_INICIAL_TEXTO = '0.600 1.000 1.000';

const volver = (page: Page) => page.getByRole('link', { name: 'Volver a la galería', exact: true });
const posicion = (page: Page) => page.getByRole('slider', { name: 'Posición en el periodo' });
const restablecer = (page: Page) => page.getByRole('button', { name: 'Restablecer vista' });
const textoDeVista = async (page: Page) =>
  (await page.locator(CONTENEDOR).getAttribute('data-vista')) ?? '';

/** Entra en una órbita desde la galería, como lo hace quien navega. */
async function entrarDesdeLaGaleria(page: Page, slug: string): Promise<void> {
  await expect(page).toHaveURL(/\/#galeria$/);
  await page.locator(`#galeria a[data-orbita="${slug}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/orbitas/${slug}$`));
  await expect(page.locator(DETALLE)).toHaveAttribute('data-detalle', slug);
  await esperarLista(page);
}

test.describe('detalle con movimiento reducido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('GRV-04 · criterio 33: empieza pausado, nada se mueve solo y al pulsar la posición avanza', async ({
    page,
  }) => {
    await page.goto('/orbitas/figura-de-ocho');
    await esperarLista(page);

    expect(await reproduciendo(page)).toBe('false');
    await expect(botonAnimacion(page)).toHaveText(/reproducir animación/i);

    await esperarAsentado(page);
    const antes = {
      posicion: await leerPosicion(page),
      actualizaciones: await leerActualizaciones(page),
      vista: await textoDeVista(page),
    };
    await page.waitForTimeout(2000);
    expect({
      posicion: await leerPosicion(page),
      actualizaciones: await leerActualizaciones(page),
      vista: await textoDeVista(page),
    }).toEqual(antes);

    // Prueba de que la página sigue viva: reproducir mueve la órbita (y la cámara no gira sola).
    await botonAnimacion(page).click();
    await expect
      .poll(async () => distanciaCircular(antes.posicion, await leerPosicion(page)), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0);
    await expect(botonAnimacion(page)).toHaveText(/pausar animación/i);
    await page.waitForTimeout(1000);
    expect(await textoDeVista(page)).toBe(antes.vista);
  });

  test('GRV-04 · criterio 29: al volver a una órbita visitada se recupera la posición y la vista objetivo; «Restablecer vista» vuelve a la inicial', async ({
    page,
  }) => {
    await page.goto('/orbitas/butterfly-i');
    await esperarLista(page);
    expect(await reproduciendo(page)).toBe('false');

    await posicion(page).fill('0.5');
    await expect.poll(() => leerPosicion(page), { timeout: 2000 }).toBe(0.5);
    await page.locator(LIENZO).focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    // Se anota la vista objetivo (la que escribe data-vista) y se sale enseguida: la cámara, que se
    // suaviza, aún no la ha alcanzado, así que guardar la suavizada daría otro texto.
    const vistaGuardada = await textoDeVista(page);
    expect(vistaGuardada).not.toBe(VISTA_INICIAL_TEXTO);
    await volver(page).click();

    await entrarDesdeLaGaleria(page, 'butterfly-i');
    expect(await leerPosicion(page)).toBe(0.5);
    expect(await textoDeVista(page)).toBe(vistaGuardada);
    expect(Number(await posicion(page).inputValue())).toBeCloseTo(0.5, 3);
    expect(await textoDeColumna(page, 'tiempo')).toContain('50,0 %');
    expect(await reproduciendo(page)).toBe('false');
    await expect(botonAnimacion(page)).toHaveText(/reproducir animación/i);

    // «Restablecer vista» va a la inicial, no a la recordada.
    await restablecer(page).click();
    await expect.poll(() => textoDeVista(page)).toBe(VISTA_INICIAL_TEXTO);
    expect(await textoDeVista(page)).not.toBe(vistaGuardada);

    // Una órbita que no se visitó empieza de cero.
    await volver(page).click();
    await entrarDesdeLaGaleria(page, 'moth-i');
    expect(await leerPosicion(page)).toBe(0);
    expect(await leerVista(page)).toEqual(VISTA_INICIAL);

    // Y tras recargar, ni siquiera la visitada se recuerda: el estado no persiste.
    await volver(page).click();
    await entrarDesdeLaGaleria(page, 'butterfly-i');
    await page.reload();
    await esperarLista(page);
    expect(await leerPosicion(page)).toBe(0);
    expect(await leerVista(page)).toEqual(VISTA_INICIAL);
    expect(Number(await posicion(page).inputValue())).toBe(0);
  });
});

test.describe('detalle sin WebGL o con el cálculo caído', () => {
  /** La región de controles está oculta del todo (display: none), no solo invisible. */
  async function comprobarControlesOcultos(page: Page): Promise<void> {
    const region = page.locator(CONTROLES);
    await expect(region).toHaveCount(1);
    await expect(region).toBeHidden();
    expect(await region.evaluate((el) => getComputedStyle(el).display)).toBe('none');
    await expect(botonAnimacion(page)).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Velocidad de reproducción' })).toHaveCount(
      0,
    );
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(page.getByRole('slider')).toHaveCount(0);
    await expect(restablecer(page)).toHaveCount(0);
    const paradas = await paradasDeTabulacion(page);
    expect(paradas.length).toBeGreaterThan(0);
    expect(paradas.filter((parada) => parada.enControles)).toEqual([]);
  }

  test('GRV-04 · criterio 34: sin WebGL2 se queda la miniatura, la telemetría inicial y la navegación', async ({
    page,
  }) => {
    await page.addInitScript(sinWebgl);
    const vigilancia = vigilar(page);
    await page.goto('/orbitas/figura-de-ocho');
    await esperarEstado(page, 'sin-webgl');

    const contenedor = page.locator(CONTENEDOR);
    await expect(contenedor.locator('svg').first()).toBeVisible();
    await expect(contenedor.locator('canvas')).toHaveCount(0);
    const aviso = contenedor.getByRole('status');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(/escena 3D/i);
    await comprobarControlesOcultos(page);

    // La telemetría sigue mostrando la lectura inicial y los textos estáticos.
    await expect(page.locator(TELEMETRIA)).toBeVisible();
    const { cifras, resumenes } = textosIniciales('figura-de-ocho');
    expect(await leerCifras(page)).toEqual(cifras);
    for (const [clave, texto] of Object.entries(resumenes)) {
      await expect(page.locator(`[data-resumen="${clave}"]`), clave).toHaveText(texto);
    }
    expect(normalizar(await textoDeColumna(page, 'tiempo'))).toContain('0,0 %');

    // Los enlaces de vuelta, anterior y siguiente funcionan.
    const { anterior, siguiente } = vecinas('figura-de-ocho');
    await expect(
      page.getByRole('link', { name: `Anterior: ${orbitaDe(anterior).nombre}`, exact: true }),
    ).toHaveAttribute('href', rutaDeOrbita(anterior));
    await page
      .getByRole('link', { name: `Siguiente: ${orbitaDe(siguiente).nombre}`, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`${rutaDeOrbita(siguiente)}$`));
    await expect(page.locator(DETALLE)).toHaveAttribute('data-detalle', siguiente);
    await esperarEstado(page, 'sin-webgl');
    await volver(page).click();
    await expect(page).toHaveURL(/\/#galeria$/);

    expect(vigilancia.errores).toEqual([]);
    expect(vigilancia.respuestasDeError).toEqual([]);
  });

  test('GRV-04 · criterio 34: si el Worker falla, el estado es error con la miniatura y el aviso', async ({
    page,
  }) => {
    await page.addInitScript(workerQueFalla);
    const vigilancia = vigilar(page);
    await page.goto('/orbitas/goggles');
    await esperarEstado(page, 'error');

    const contenedor = page.locator(CONTENEDOR);
    await expect(contenedor.locator('svg').first()).toBeVisible();
    const aviso = contenedor.getByRole('status');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('No se pudo calcular la órbita');
    await comprobarControlesOcultos(page);
    await expect(page.locator(TELEMETRIA)).toBeVisible();
    expect(await leerCifras(page)).toEqual(textosIniciales('goggles').cifras);

    expect(vigilancia.errores).toEqual([]);
    expect(vigilancia.respuestasDeError).toEqual([]);
  });
});
