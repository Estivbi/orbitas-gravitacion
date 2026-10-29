import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import {
  expect,
  type APIRequestContext,
  type ElementHandle,
  type Locator,
  type Page,
} from '@playwright/test';
import { PNG } from 'pngjs';
import { integrarPeriodo, obtenerOrbita, type Slug } from '../../src/lib/fisica';
import { energiaDe, momentoLinealDe } from '../unit/fisica/ayudas';

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

/** Espera a que React haya hidratado la sección `#ley`: antes, un `fill` se pierde al hidratar. */
export async function esperarHidratacion(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const ley = document.querySelector('#ley');
    return ley !== null && Object.keys(ley).some((clave) => clave.startsWith('__reactProps'));
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

// ---------------------------------------------------------------------------------------------
// Ayudas de GRV-04: galería, detalle, telemetría y medidas de rendimiento.
// ---------------------------------------------------------------------------------------------

export const MENOS = '−';

/** Selectores del detalle y de la galería (parte del contrato de las pruebas, spec de GRV-04). */
export const DETALLE = '[data-detalle]';
export const CONTROLES = '[data-region="controles"]';
export const TELEMETRIA = '[data-region="telemetria"]';
export const GALERIA = '#galeria';
export const ENLACES_GALERIA = `${GALERIA} a[data-orbita]`;

export const CIFRAS = [
  'tiempo',
  'energia',
  'momento',
  'distancia-minima',
  'velocidad-maxima',
] as const;
export type Cifra = (typeof CIFRAS)[number];

/** Espacios (también los duros) reducidos a uno: la spec escribe «50,0 %» sin distinguirlos. */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '').replace(/\s+/g, ' ').trim();
}

/** Cifra con coma decimal y signo menos U+2212, escrita aquí aparte de la librería del proyecto. */
export function cifra(valor: number, decimales: number): string {
  const texto = Math.abs(valor).toFixed(decimales);
  const negativo = valor < 0 && Number(texto) !== 0;
  return `${negativo ? MENOS : ''}${texto.replace('.', ',')}`;
}

/** Lee de vuelta una cifra escrita con `cifra`. */
export function deTexto(texto: string): number {
  return Number(texto.replace(MENOS, '-').replace(',', '.'));
}

const trayectorias = new Map<Slug, ReturnType<typeof integrarPeriodo>>();

/** Trayectoria de una órbita, integrada una sola vez en el proceso de Node de la prueba. */
export function trayectoriaDe(slug: Slug) {
  let trayectoria = trayectorias.get(slug);
  if (!trayectoria) {
    const orbita = obtenerOrbita(slug);
    if (!orbita) throw new Error(`La órbita ${slug} no está en el catálogo`);
    trayectoria = integrarPeriodo(orbita);
    trayectorias.set(slug, trayectoria);
  }
  return trayectoria;
}

export function orbitaDe(slug: Slug) {
  const orbita = obtenerOrbita(slug);
  if (!orbita) throw new Error(`La órbita ${slug} no está en el catálogo`);
  return orbita;
}

/** Textos que deben verse en el HTML del servidor y al cargar: la lectura de u = 0 y los extremos del periodo. */
export function textosIniciales(slug: Slug) {
  const orbita = orbitaDe(slug);
  const e = Float64Array.from(orbita.estadoInicial);
  const distancias = [
    Math.hypot(e[0]! - e[2]!, e[1]! - e[3]!),
    Math.hypot(e[0]! - e[4]!, e[1]! - e[5]!),
    Math.hypot(e[2]! - e[4]!, e[3]! - e[5]!),
  ];
  const velocidades = [0, 1, 2].map((i) => Math.hypot(e[6 + 2 * i]!, e[7 + 2 * i]!));
  const trayectoria = trayectoriaDe(slug);
  return {
    cifras: {
      tiempo: '0,00',
      energia: cifra(energiaDe(e), 3),
      momento: cifra(momentoLinealDe(e), 3),
      'distancia-minima': cifra(Math.min(...distancias), 3),
      'velocidad-maxima': cifra(Math.max(...velocidades), 3),
    } satisfies Record<Cifra, string>,
    resumenes: {
      periodo: cifra(orbita.periodo, 2),
      energia: cifra(energiaDe(e), 3),
      momento: cifra(momentoLinealDe(e), 3),
      'distancia-minima': cifra(trayectoria.distanciaMinima, 3),
      'velocidad-maxima': cifra(trayectoria.velocidadMaxima, 3),
    },
  };
}

export interface Vigilancia {
  /** `pageerror`: excepciones sin capturar. */
  errores: string[];
  /** Todos los mensajes de consola, de cualquier tipo. */
  consola: { tipo: string; texto: string }[];
  /** Respuestas con estado de 400 en adelante. */
  respuestasDeError: string[];
}

export function vigilar(page: Page): Vigilancia {
  const vigilancia: Vigilancia = { errores: [], consola: [], respuestasDeError: [] };
  page.on('pageerror', (error) => vigilancia.errores.push(error.message));
  page.on('console', (mensaje) =>
    vigilancia.consola.push({ tipo: mensaje.type(), texto: mensaje.text() }),
  );
  page.on('response', (respuesta) => {
    if (respuesta.status() >= 400) {
      vigilancia.respuestasDeError.push(`${respuesta.status()} ${respuesta.url()}`);
    }
  });
  return vigilancia;
}

/** Un Worker que emite `error` nada más crearse (el cálculo de la órbita falla). */
export function workerQueFalla(): void {
  class WorkerQueFalla {
    onerror: ((evento: Event) => void) | null = null;
    private escuchas: ((evento: Event) => void)[] = [];
    constructor() {
      setTimeout(() => {
        const evento = new Event('error');
        this.onerror?.(evento);
        this.escuchas.forEach((escucha) => escucha(evento));
      }, 0);
    }
    addEventListener(tipo: string, escucha: (evento: Event) => void) {
      if (tipo === 'error') this.escuchas.push(escucha);
    }
    removeEventListener() {}
    postMessage() {}
    terminate() {}
  }
  (window as unknown as { Worker: unknown }).Worker = WorkerQueFalla;
}

interface RegistroDeEscenas {
  contextos: WebGL2RenderingContext[];
  workers: number;
  calcular: number;
  listaEn: number | null;
}

/**
 * Instrumentación de inicio (addInitScript): registra cada contexto `webgl2` creado, cuenta las
 * construcciones de `Worker` y los `postMessage` de tipo `calcular`, y anota cuándo (en
 * performance.now, desde el inicio de la navegación) llegó por primera vez una escena a `lista`.
 */
export function instrumentarEscenas(): void {
  const registro: RegistroDeEscenas = { contextos: [], workers: 0, calcular: 0, listaEn: null };
  (window as unknown as { __registro: RegistroDeEscenas }).__registro = registro;

  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, tipo: string) {
    // eslint-disable-next-line prefer-rest-params
    const contexto = original.apply(this, arguments as never) as unknown;
    if (tipo === 'webgl2' && contexto) {
      const gl = contexto as WebGL2RenderingContext;
      if (!registro.contextos.includes(gl)) registro.contextos.push(gl);
    }
    return contexto;
  } as typeof original;

  const WorkerOriginal = window.Worker;
  class WorkerContado extends WorkerOriginal {
    constructor(...argumentos: ConstructorParameters<typeof Worker>) {
      super(...argumentos);
      registro.workers += 1;
    }
    postMessage(mensaje: unknown, ...resto: unknown[]) {
      if ((mensaje as { tipo?: string } | null)?.tipo === 'calcular') registro.calcular += 1;
      return (super.postMessage as (...todos: unknown[]) => void).call(this, mensaje, ...resto);
    }
  }
  window.Worker = WorkerContado as unknown as typeof Worker;

  new MutationObserver(() => {
    if (registro.listaEn === null && document.querySelector('[data-estado-escena="lista"]')) {
      registro.listaEn = performance.now();
    }
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-estado-escena'],
  });
}

export function leerRegistro(page: Page) {
  return page.evaluate(() => {
    const registro = (window as unknown as { __registro: RegistroDeEscenas }).__registro;
    return {
      creados: registro.contextos.length,
      vivos: registro.contextos.filter((gl) => !gl.isContextLost()).length,
      workers: registro.workers,
      calcular: registro.calcular,
      listaEn: registro.listaEn,
    };
  });
}

/**
 * Cronómetro de navegación cliente: anota (con performance.now, sin la latencia del sondeo) el
 * instante del siguiente clic y el primero en que existe un contenedor de escena DISTINTO del que
 * había entonces y está en `lista`.
 */
export async function iniciarCronometro(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const crono: { click: number | null; lista: number | null; previo: Element | null } = {
      click: null,
      lista: null,
      previo: null,
    };
    (window as unknown as { __crono: typeof crono }).__crono = crono;
    document.addEventListener(
      'click',
      () => {
        crono.click = performance.now();
        crono.previo = document.querySelector(selector);
      },
      { capture: true, once: true },
    );
    const mirar = () => {
      if (crono.click === null || crono.lista !== null) return;
      const actual = document.querySelector(selector);
      if (
        actual &&
        actual !== crono.previo &&
        actual.getAttribute('data-estado-escena') === 'lista'
      ) {
        crono.lista = performance.now();
      }
    };
    new MutationObserver(mirar).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-estado-escena'],
    });
  }, CONTENEDOR);
}

/** Milisegundos entre el clic y la llegada a `lista` del contenedor nuevo; espera a que ocurra. */
export async function milisegundosHastaLista(page: Page, timeout = 45_000): Promise<number> {
  const leer = () =>
    page.evaluate(() => {
      const crono = (
        window as unknown as { __crono: { click: number | null; lista: number | null } }
      ).__crono;
      return crono.click !== null && crono.lista !== null ? crono.lista - crono.click : null;
    });
  await expect.poll(leer, { timeout }).not.toBeNull();
  return (await leer())!;
}

export interface ParadaDeTabulacion {
  marca: number;
  etiqueta: string;
  tipo: string | null;
  nombre: string;
  grupo: string | null;
  enControles: boolean;
  enGaleria: boolean;
  href: string | null;
}

/**
 * Pulsa Tab hasta que el foco vuelve a un elemento ya visto (o sale del documento) y devuelve las
 * paradas en orden. `nombre` es una aproximación (aria-label, etiqueta asociada o texto) y `grupo`
 * el texto visible del radiogroup que contiene al elemento.
 */
export async function paradasDeTabulacion(page: Page, maximo = 60): Promise<ParadaDeTabulacion[]> {
  const paradas: ParadaDeTabulacion[] = [];
  const vistas = new Set<number>();
  for (let i = 0; i < maximo; i++) {
    await page.keyboard.press('Tab');
    const parada = await page.evaluate((): ParadaDeTabulacion | null => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const w = window as unknown as {
        __marcas?: WeakMap<Element, number>;
        __ultimaMarca?: number;
      };
      w.__marcas ??= new WeakMap();
      w.__ultimaMarca ??= 0;
      let marca = w.__marcas.get(el);
      if (marca === undefined) {
        marca = ++w.__ultimaMarca;
        w.__marcas.set(el, marca);
      }
      const grupo = el.closest('[role="radiogroup"]');
      const rotulo = grupo?.getAttribute('aria-labelledby');
      return {
        marca,
        etiqueta: el.tagName.toLowerCase(),
        tipo: el.getAttribute('type'),
        nombre: (
          el.getAttribute('aria-label') ??
          (el as HTMLInputElement).labels?.[0]?.textContent ??
          el.textContent ??
          ''
        )
          .replace(/\s+/g, ' ')
          .trim(),
        grupo: rotulo
          ? (document.getElementById(rotulo)?.textContent ?? null)
          : (grupo?.getAttribute('aria-label') ?? null),
        enControles: el.closest('[data-region="controles"]') !== null,
        enGaleria: el.closest('#galeria') !== null,
        href: el.getAttribute('href'),
      };
    });
    if (!parada || vistas.has(parada.marca)) break;
    vistas.add(parada.marca);
    paradas.push(parada);
  }
  return paradas;
}

/**
 * Contorno del elemento enfocado. En un radio, el de su etiqueta visible o el de un descendiente
 * con caja visible (>= 8 px): nunca el del propio input, aunque sea `sr-only`, porque el contorno
 * global de `:focus-visible` que recibe un input de 1 px no se ve.
 */
export function contornoDeFoco(page: Page) {
  return page.evaluate(() => {
    const activo = document.activeElement as HTMLElement;
    const esRadio = activo instanceof HTMLInputElement && activo.type === 'radio';
    const base = esRadio ? (activo as HTMLInputElement).labels?.[0] : activo;
    if (esRadio && !base) return { ancho: '0px', color: '', estilo: 'none' };
    const candidatos = base
      ? [base, ...Array.from(base.querySelectorAll<HTMLElement>('*'))].filter((el) => {
          if (!esRadio) return true;
          const caja = el.getBoundingClientRect();
          return el !== activo && caja.width >= 8 && caja.height >= 8;
        })
      : [];
    const objetivo =
      candidatos.find((el) => {
        const estilo = getComputedStyle(el);
        return estilo.outlineStyle !== 'none' && estilo.outlineWidth !== '0px';
      }) ??
      base ??
      activo;
    const estilo = getComputedStyle(objetivo);
    return { ancho: estilo.outlineWidth, color: estilo.outlineColor, estilo: estilo.outlineStyle };
  });
}

/** La etiqueta visible de un radio (`input.labels[0]`), para pulsarla como lo haría una persona. */
export async function etiquetaDe(radio: Locator): Promise<ElementHandle<HTMLElement>> {
  await expect(radio, 'el radio existe').toHaveCount(1);
  const etiqueta = await radio.evaluateHandle((el) => (el as HTMLInputElement).labels?.[0] ?? null);
  const elemento = etiqueta.asElement();
  if (!elemento) throw new Error('El radio no tiene una etiqueta asociada');
  return elemento as ElementHandle<HTMLElement>;
}

/** Elige un radio pulsando su etiqueta visible. */
export async function elegirRadio(radio: Locator): Promise<void> {
  await (await etiquetaDe(radio)).click();
}

/** Subrayado de la etiqueta de un radio (o de un descendiente suyo): null si no hay ninguno. */
export async function subrayadoDe(
  radio: Locator,
): Promise<{ linea: string; color: string } | null> {
  await expect(radio, 'el radio existe').toHaveCount(1);
  return radio.evaluate((el) => {
    const etiqueta = (el as HTMLInputElement).labels?.[0];
    if (!etiqueta) return null;
    for (const candidato of [
      etiqueta,
      ...Array.from(etiqueta.querySelectorAll<HTMLElement>('*')),
    ]) {
      const estilo = getComputedStyle(candidato);
      const transparente =
        estilo.textDecorationColor === 'transparent' ||
        /^rgba\(\s*0,\s*0,\s*0,\s*0\s*\)$/.test(estilo.textDecorationColor);
      if (estilo.textDecorationLine.includes('underline') && !transparente) {
        return { linea: estilo.textDecorationLine, color: estilo.textDecorationColor };
      }
    }
    return null;
  });
}

export function ordenDeEnlaces(page: Page): Promise<string[]> {
  return page
    .locator(ENLACES_GALERIA)
    .evaluateAll((enlaces) => enlaces.map((enlace) => enlace.getAttribute('data-orbita') ?? ''));
}

/** `data-orbita` del elemento enfocado, o null. */
export function orbitaEnfocada(page: Page): Promise<string | null> {
  return page.evaluate(() => document.activeElement?.getAttribute('data-orbita') ?? null);
}

/** El elemento cabe entero en la ventana (con 0,5 px de margen). */
export function enteroEnVentana(localizador: Locator): Promise<boolean> {
  return localizador.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return (
      r.width > 0 &&
      r.height > 0 &&
      r.top >= -0.5 &&
      r.left >= -0.5 &&
      r.bottom <= window.innerHeight + 0.5 &&
      r.right <= window.innerWidth + 0.5
    );
  });
}

/** Altura de un elemento cuando dos lecturas seguidas (separadas 200 ms) coinciden. */
export async function alturaEstable(page: Page, selector: string): Promise<number> {
  let anterior = -1;
  let actual = 0;
  await expect
    .poll(
      async () => {
        anterior = actual;
        actual = (await page.locator(selector).boundingBox())?.height ?? -2;
        await page.waitForTimeout(200);
        return actual === anterior;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return actual;
}

export interface Muestra {
  posicion: number;
  segundos: number;
}

/** Lee `data-posicion` y la hora desde dentro de la página cada `pasoMs` durante `duracionMs`. */
export function muestrearPosicion(page: Page, duracionMs = 2000, pasoMs = 100): Promise<Muestra[]> {
  return page.evaluate(
    async ({ selector, duracion, paso }) => {
      const salida: { posicion: number; segundos: number }[] = [];
      const fin = performance.now() + duracion;
      for (;;) {
        const contenedor = document.querySelector(selector);
        salida.push({
          posicion: Number(contenedor?.getAttribute('data-posicion')),
          segundos: performance.now() / 1000,
        });
        if (performance.now() >= fin) break;
        await new Promise((resolver) => setTimeout(resolver, paso));
      }
      return salida;
    },
    { selector: CONTENEDOR, duracion: duracionMs, paso: pasoMs },
  );
}

/**
 * Pendiente (fracción de periodo por segundo) de una recta ajustada por mínimos cuadrados a la
 * posición desenvuelta frente al tiempo. Cada incremento se lleva al intervalo (−0,5, 0,5].
 */
export function pendienteDePosicion(muestras: readonly Muestra[]): number {
  let acumulado = 0;
  const puntos = muestras.map((muestra, i) => {
    if (i > 0) {
      let d = muestra.posicion - muestras[i - 1]!.posicion;
      if (d < -0.5) d += 1;
      if (d > 0.5) d -= 1;
      acumulado += d;
    }
    return { x: muestra.segundos, y: acumulado };
  });
  const n = puntos.length;
  const mediaX = puntos.reduce((suma, p) => suma + p.x, 0) / n;
  const mediaY = puntos.reduce((suma, p) => suma + p.y, 0) / n;
  let numerador = 0;
  let denominador = 0;
  for (const p of puntos) {
    numerador += (p.x - mediaX) * (p.y - mediaY);
    denominador += (p.x - mediaX) ** 2;
  }
  return numerador / denominador;
}

export interface LecturaDePagina {
  segundos: number;
  cifras: Record<Cifra, string>;
  posicion: number;
  fase: number;
  actualizaciones: number;
  fotogramas: number;
}

/** Lee la telemetría cada `pasoMs` durante `duracionMs` desde dentro de la página. */
export function muestrearTelemetria(
  page: Page,
  duracionMs = 3000,
  pasoMs = 100,
): Promise<LecturaDePagina[]> {
  return page.evaluate(
    async ({ contenedor, telemetria, nombres, duracion, paso }) => {
      const salida: {
        segundos: number;
        cifras: Record<string, string>;
        posicion: number;
        fase: number;
        actualizaciones: number;
        fotogramas: number;
      }[] = [];
      const fin = performance.now() + duracion;
      for (;;) {
        const cifras: Record<string, string> = {};
        for (const nombre of nombres) {
          cifras[nombre] =
            document.querySelector(`[data-cifra="${nombre}"]`)?.textContent?.trim() ?? '';
        }
        salida.push({
          segundos: performance.now() / 1000,
          cifras,
          posicion: Number(document.querySelector(contenedor)?.getAttribute('data-posicion')),
          fase: Number(document.querySelector('[data-cifra="fase"]')?.getAttribute('data-valor')),
          actualizaciones: Number(
            document.querySelector(telemetria)?.getAttribute('data-actualizaciones'),
          ),
          fotogramas: Number(document.querySelector(contenedor)?.getAttribute('data-fotogramas')),
        });
        if (performance.now() >= fin) break;
        await new Promise((resolver) => setTimeout(resolver, paso));
      }
      return salida;
    },
    {
      contenedor: CONTENEDOR,
      telemetria: TELEMETRIA,
      nombres: [...CIFRAS],
      duracion: duracionMs,
      paso: pasoMs,
    },
  ) as Promise<LecturaDePagina[]>;
}

export async function leerCifras(page: Page): Promise<Record<Cifra, string>> {
  const cifras = {} as Record<Cifra, string>;
  for (const nombre of CIFRAS) {
    cifras[nombre] = (await page.locator(`[data-cifra="${nombre}"]`).textContent())?.trim() ?? '';
  }
  return cifras;
}

export async function leerActualizaciones(page: Page): Promise<number> {
  return Number(await page.locator(TELEMETRIA).getAttribute('data-actualizaciones'));
}

/** Texto (sin distinguir espacios duros) de la columna de la telemetría; ahí está la fase en porcentaje. */
export async function textoDeColumna(page: Page, columna: string): Promise<string> {
  return normalizar(await page.locator(`[data-columna="${columna}"]`).textContent());
}

/** Scripts que referencia un HTML: `<script src>` y `<link rel="preload" as="script">`, sin repetir. */
export function scriptsIniciales(html: string): string[] {
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
  return [...iniciales];
}

/** Suma de los tamaños con gzip (nivel 9) de los scripts indicados. */
export async function pesoGzip(
  request: APIRequestContext,
  urls: readonly string[],
): Promise<number> {
  let total = 0;
  for (const url of urls) {
    const respuesta = await request.get(url);
    expect(respuesta.ok(), url).toBe(true);
    total += gzipSync(await respuesta.body(), { level: 9 }).length;
  }
  return total;
}
