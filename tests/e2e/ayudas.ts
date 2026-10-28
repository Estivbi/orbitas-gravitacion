import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export const CONTENEDOR = '[data-estado-escena]';
export const LIENZO = `${CONTENEDOR} canvas`;

export interface Vista {
  acimut: number;
  polar: number;
  distancia: number;
}

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

/** Diferencia entre dos ángulos en [0, 2π), la más corta, con signo. */
export function diferenciaAngular(a: number, b: number): number {
  const vuelta = 2 * Math.PI;
  let d = (b - a) % vuelta;
  if (d > Math.PI) d -= vuelta;
  if (d < -Math.PI) d += vuelta;
  return d;
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
