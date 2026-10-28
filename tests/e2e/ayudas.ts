import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { PNG } from 'pngjs';

export const CONTENEDOR = '[data-estado-escena]';
export const LIENZO = `${CONTENEDOR} canvas`;

/** Periodo, en segundos a velocidad 1, de la figura de ocho (la órbita de la portada). */
export const PERIODO_FIGURA_DE_OCHO = 6.32591398;

/** Colores de los tres cuerpos, por índice de cuerpo (orden de DESIGN.md). */
export const COLORES_CUERPOS = ['electric-iris', 'saffron-spark', 'orbit-teal'] as const;

export interface Vista {
  acimut: number;
  polar: number;
  distancia: number;
}

export const VISTA_INICIAL: Vista = { acimut: 0.6, polar: 1, distancia: 1 };

export const botonAnimacion = (page: Page) => page.getByRole('button', { name: /animación/i });

export async function esperarEstado(page: Page, estado: string, timeout = 45_000): Promise<void> {
  await expect(page.locator(CONTENEDOR)).toHaveAttribute('data-estado-escena', estado, {
    timeout,
  });
}

export function esperarLista(page: Page): Promise<void> {
  return esperarEstado(page, 'lista');
}

async function atributo(page: Page, nombre: string): Promise<string> {
  const valor = await page.locator(CONTENEDOR).getAttribute(nombre);
  if (valor === null) {
    throw new Error(`El contenedor no tiene el atributo ${nombre}`);
  }
  return valor;
}

export async function leerVista(page: Page): Promise<Vista> {
  const [acimut, polar, distancia] = (await atributo(page, 'data-vista')).split(' ').map(Number);
  return { acimut: acimut ?? NaN, polar: polar ?? NaN, distancia: distancia ?? NaN };
}

export async function leerPosicion(page: Page): Promise<number> {
  return Number(await atributo(page, 'data-posicion'));
}

export async function leerFotogramas(page: Page): Promise<number> {
  return Number(await atributo(page, 'data-fotogramas'));
}

export async function reproduciendo(page: Page): Promise<string> {
  return atributo(page, 'data-reproduciendo');
}

/** Espera (con reintentos) a que `data-reproduciendo` tenga el valor pedido. */
export async function esperarReproduciendo(page: Page, valor: boolean): Promise<void> {
  await expect.poll(() => reproduciendo(page), { timeout: 10_000 }).toBe(String(valor));
}

/** Posición y hora de la página (performance.now, en segundos) leídas en el mismo instante. */
export async function leerPosicionConHora(
  page: Page,
): Promise<{ posicion: number; segundos: number }> {
  return page.evaluate((selector) => {
    const contenedor = document.querySelector(selector);
    return {
      posicion: Number(contenedor?.getAttribute('data-posicion')),
      segundos: performance.now() / 1000,
    };
  }, CONTENEDOR);
}

export function ahoraEnSegundos(page: Page): Promise<number> {
  return page.evaluate(() => performance.now() / 1000);
}

/** Distancia circular entre dos fracciones del periodo: min(|d|, 1 − |d|), con d = b − a. */
export function distanciaCircular(a: number, b: number): number {
  const d = Math.abs(b - a);
  return Math.min(d, 1 - d);
}

/** Diferencia entre dos ángulos en [0, 2π), la más corta, con signo. */
export function diferenciaAngular(a: number, b: number): number {
  const vuelta = 2 * Math.PI;
  let d = (b - a) % vuelta;
  if (d > Math.PI) d -= vuelta;
  if (d < -Math.PI) d += vuelta;
  return d;
}

/**
 * Espera dos fotogramas y 200 ms más. Se usa solo en las comprobaciones negativas («esto no
 * cambia»): quien llama debe demostrar después, con un cambio que sí ocurre, que la página
 * procesó lo anterior.
 */
export async function esperarAsentado(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolver) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolver()));
      }),
  );
  await page.waitForTimeout(200);
}

/** Colores del tema leídos de globals.css: la fuente única de los colores. */
export function colorDelTema(nombre: string): [number, number, number] {
  const css = readFileSync('src/app/globals.css', 'utf8');
  const hex = new RegExp(`--color-${nombre}:\\s*#([0-9a-fA-F]{6})`).exec(css)?.[1];
  if (!hex) {
    throw new Error(`No existe el color ${nombre} en globals.css`);
  }
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

export async function centroDelLienzo(page: Page): Promise<{ x: number; y: number }> {
  const lienzo = page.locator(LIENZO);
  await lienzo.scrollIntoViewIfNeeded();
  const caja = await lienzo.boundingBox();
  if (!caja) {
    throw new Error('El lienzo no tiene caja');
  }
  return { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };
}

/** Captura del lienzo como imagen decodificada. */
export async function capturarLienzo(page: Page): Promise<PNG> {
  return PNG.sync.read(await page.locator(LIENZO).screenshot());
}

/** Cuántos píxeles de la captura están a menos de `tolerancia` del color, por canal. */
export function contarCercanos(
  png: PNG,
  [r, g, b]: [number, number, number],
  tolerancia: number,
): number {
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

/** Cuenta los píxeles que difieren entre dos capturas del mismo tamaño. */
export function pixelesDistintos(a: PNG, b: PNG): number {
  expect([b.width, b.height]).toEqual([a.width, a.height]);
  let cuenta = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (
      a.data[i] !== b.data[i] ||
      a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2] ||
      a.data[i + 3] !== b.data[i + 3]
    ) {
      cuenta++;
    }
  }
  return cuenta;
}

/** Píxeles cerca de cada color de los cuerpos (por defecto, 60 por canal), en el orden de COLORES_CUERPOS. */
export function contarColoresDeLosCuerpos(captura: PNG, tolerancia = 60): number[] {
  return COLORES_CUERPOS.map((nombre) => contarCercanos(captura, colorDelTema(nombre), tolerancia));
}

/**
 * Espera, con reintentos, a que el lienzo muestre al menos `minimo` píxeles cerca de cada uno de
 * los tres colores de los cuerpos, y devuelve esa captura. «Lista» puede llegar un instante antes
 * del primer dibujo, de ahí los reintentos.
 */
export async function esperarColoresDibujados(page: Page, minimo = 50): Promise<PNG> {
  let captura = await capturarLienzo(page);
  await expect
    .poll(
      async () => {
        captura = await capturarLienzo(page);
        return Math.min(...contarColoresDeLosCuerpos(captura));
      },
      {
        timeout: 15_000,
        message: `píxeles por color de cuerpo (${COLORES_CUERPOS.join(', ')}), mínimo ${minimo}`,
      },
    )
    .toBeGreaterThanOrEqual(minimo);
  return captura;
}

/** Pulsa Tab hasta que el elemento enfocado cumple el selector (máximo 25 pulsaciones). */
export async function tabuladoHasta(page: Page, selector: string): Promise<void> {
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    const llegado = await page.evaluate(
      (css) => document.activeElement?.matches(css) ?? false,
      selector,
    );
    if (llegado) return;
  }
  throw new Error(`Tab no llegó a ${selector} en 25 pulsaciones`);
}

/** Sin WebGL2: getContext devuelve null para cualquier contexto 3D. */
export function sinWebgl(): void {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string) {
    if (tipo === 'webgl2' || tipo === 'webgl' || tipo === 'experimental-webgl') {
      return null;
    }
    // eslint-disable-next-line prefer-rest-params
    return original.apply(this, arguments as never);
  } as typeof original;
}

/** Un Worker que nunca responde ni falla: la escena se queda en `cargando`. */
export function workerQueNuncaResponde(): void {
  class WorkerMudo {
    onerror = null;
    onmessage = null;
    addEventListener() {}
    removeEventListener() {}
    postMessage() {}
    terminate() {}
  }
  (window as unknown as { Worker: unknown }).Worker = WorkerMudo;
}
