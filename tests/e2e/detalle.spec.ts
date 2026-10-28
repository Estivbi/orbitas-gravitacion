import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { estadoEn } from '../../src/lib/fisica';
import { formatearLectura, leerTelemetria } from '../../src/lib/galeria/telemetria';
import {
  CONTENEDOR,
  CONTROLES,
  DETALLE,
  LIENZO,
  MENOS,
  PERIODO_FIGURA_DE_OCHO,
  TELEMETRIA,
  VISTA_INICIAL,
  ahoraEnSegundos,
  botonAnimacion,
  capturarLienzo,
  contarColoresDeLosCuerpos,
  contornoDeFoco,
  deTexto,
  distanciaCircular,
  elegirRadio,
  esperarAsentado,
  esperarLista,
  esperarReproduciendo,
  leerActualizaciones,
  leerCifras,
  leerFotogramas,
  leerPosicion,
  leerPosicionConHora,
  leerVista,
  muestrearPosicion,
  muestrearTelemetria,
  normalizar,
  orbitaDe,
  pendienteDePosicion,
  pixelesDistintos,
  reproduciendo,
  subrayadoDe,
  textoDeColumna,
  textosIniciales,
  trayectoriaDe,
  type Cifra,
  type LecturaDePagina,
  workerQueNuncaResponde,
} from './ayudas';

// Sin esto, un elemento que no existe haría esperar a las acciones hasta el límite de la prueba.
test.use({ actionTimeout: 20_000 });

// Los criterios de fotogramas por segundo (23 a 32) miden con WebGL por software: en local hay que
// ejecutarlos con `--workers=1`, porque varios navegadores compitiendo por la CPU bajan los fps y
// dan falsos rojos. La configuración de CI ya lo hace así.

const AMBAR = 'rgb(255, 184, 41)';
const VIOLETA = 'rgb(128, 82, 255)';
const FOCO = { ancho: '2px', color: 'rgb(255, 255, 255)', estilo: 'solid' };
const TEXTOS_DE_VELOCIDAD = ['0,25×', '0,5×', '1×', '2×', '4×'];
const VELOCIDADES = [0.25, 0.5, 1, 2, 4];

const posicion = (page: Page) => page.getByRole('slider', { name: 'Posición en el periodo' });
const estela = (page: Page) => page.getByRole('slider', { name: 'Longitud de la estela' });
const radioDeVelocidad = (page: Page, texto: string) =>
  page.getByRole('radio', { name: texto, exact: true });
const grupoDeVelocidad = (page: Page) =>
  page.getByRole('radiogroup', { name: 'Velocidad de reproducción' });
const restablecer = (page: Page) => page.getByRole('button', { name: 'Restablecer vista' });
const volver = (page: Page) => page.getByRole('link', { name: 'Volver a la galería', exact: true });

const raizDelDetalle = (page: Page) => page.locator(DETALLE);

async function atributoDelDetalle(page: Page, nombre: string): Promise<number> {
  return Number(await raizDelDetalle(page).getAttribute(nombre));
}

/** Distancia de data-posicion a un valor: 3 decimales truncados pueden quedar 0,001 por debajo. */
async function distanciaA(page: Page, objetivo: number): Promise<number> {
  return Math.abs((await leerPosicion(page)) - objetivo);
}

async function leerVistaTexto(page: Page): Promise<string> {
  return (await page.locator(CONTENEDOR).getAttribute('data-vista')) ?? '';
}

/**
 * Estado de partida explícito de cada prueba del grupo serial: velocidad 1×, estela 0,5, vista
 * inicial y la reproducción en el estado pedido. Ninguna prueba hereda esto de la anterior.
 */
async function partirDe(page: Page, { enMarcha }: { enMarcha: boolean }): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  if ((await reproduciendo(page)) !== String(enMarcha)) {
    await botonAnimacion(page).click();
  }
  await esperarReproduciendo(page, enMarcha);
  if ((await atributoDelDetalle(page, 'data-velocidad')) !== 1) {
    await elegirRadio(radioDeVelocidad(page, '1×'));
  }
  if ((await atributoDelDetalle(page, 'data-longitud-estela')) !== 0.5) {
    await estela(page).fill('0.5');
  }
  await page.locator(LIENZO).focus();
  await page.keyboard.press('Home');
  await expect.poll(() => leerVista(page), { timeout: 5_000 }).toEqual(VISTA_INICIAL);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => atributoDelDetalle(page, 'data-velocidad')).toBe(1);
  await expect.poll(() => atributoDelDetalle(page, 'data-longitud-estela')).toBe(0.5);
}

/** Lo que las cinco cifras en vivo deben mostrar en una posición, calculado en Node con la librería. */
function cifrasEsperadas(
  slug: Parameters<typeof trayectoriaDe>[0],
  u: number,
): Record<Cifra, string> {
  const trayectoria = trayectoriaDe(slug);
  const textos = formatearLectura(leerTelemetria(estadoEn(trayectoria, u), u, trayectoria.periodo));
  return {
    tiempo: textos.tiempo,
    energia: textos.energia,
    momento: textos.momento,
    'distancia-minima': textos.distanciaMinima,
    'velocidad-maxima': textos.velocidadMaxima,
  };
}

function textoDeFase(slug: Parameters<typeof trayectoriaDe>[0], u: number): string {
  const trayectoria = trayectoriaDe(slug);
  return normalizar(
    formatearLectura(leerTelemetria(estadoEn(trayectoria, u), u, trayectoria.periodo)).fase,
  );
}

/** Dos capturas seguidas idénticas: la imagen ya no cambia. */
async function capturaEstable(page: Page) {
  let anterior = await capturarLienzo(page);
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(250);
        const actual = await capturarLienzo(page);
        const distintos = pixelesDistintos(anterior, actual);
        anterior = actual;
        return distintos;
      },
      { timeout: 20_000 },
    )
    .toBe(0);
  return anterior;
}

async function sinBordesNiSombras(page: Page, selector: string) {
  const estilos = await page.locator(selector).evaluateAll((els) =>
    els.map((el) => {
      const e = getComputedStyle(el);
      return {
        bordes: [e.borderTopWidth, e.borderRightWidth, e.borderBottomWidth, e.borderLeftWidth],
        sombra: e.boxShadow,
      };
    }),
  );
  expect(estilos.length).toBeGreaterThan(0);
  for (const estilo of estilos) {
    expect(estilo.bordes).toEqual(['0px', '0px', '0px', '0px']);
    expect(estilo.sombra).toBe('none');
  }
}

// Una sola carga del detalle de la figura de ocho para las comprobaciones que parten de un estado
// que ellas mismas fijan (WebGL por software es lento). Si una falla, las siguientes se saltan.
test.describe.serial('detalle de la figura de ocho (una sola carga)', () => {
  let contexto: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    contexto = await browser.newContext({ baseURL, viewport: { width: 1440, height: 900 } });
    contexto.setDefaultTimeout(20_000);
    page = await contexto.newPage();
    await page.goto('/orbitas/figura-de-ocho');
    await esperarLista(page);
  });

  test.afterAll(async () => {
    await contexto.close();
  });

  test('GRV-04 · criterio 23: los controles están, se recorren con Tab en orden y usan los tokens', async () => {
    await expect(botonAnimacion(page)).toHaveText(/pausar animación/i);

    await expect(grupoDeVelocidad(page)).toHaveCount(1);
    for (const texto of TEXTOS_DE_VELOCIDAD) {
      await expect(radioDeVelocidad(page, texto)).toHaveCount(1);
    }
    await expect(grupoDeVelocidad(page).getByRole('radio')).toHaveCount(5);
    await expect(radioDeVelocidad(page, '1×')).toBeChecked();

    const deslizadorDePosicion = posicion(page);
    await expect(deslizadorDePosicion).toHaveAttribute('min', '0');
    await expect(deslizadorDePosicion).toHaveAttribute('max', '0.999');
    await expect(deslizadorDePosicion).toHaveAttribute('step', '0.001');
    const valor = Number(await deslizadorDePosicion.inputValue());
    expect(distanciaCircular(valor, await leerPosicion(page))).toBeLessThan(0.12);

    const deslizadorDeEstela = estela(page);
    await expect(deslizadorDeEstela).toHaveAttribute('min', '0.05');
    await expect(deslizadorDeEstela).toHaveAttribute('max', '1');
    await expect(deslizadorDeEstela).toHaveAttribute('step', '0.05');
    expect(Number(await deslizadorDeEstela.inputValue())).toBe(0.5);
    await expect(restablecer(page)).toBeVisible();

    // Estilo: un solo botón violeta; el fantasma, transparente y gris; deslizadores en violeta.
    const fondos = await page
      .locator('button')
      .evaluateAll((botones) => botones.map((b) => getComputedStyle(b).backgroundColor));
    expect(fondos.filter((fondo) => fondo === VIOLETA)).toHaveLength(1);
    expect(await botonAnimacion(page).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      VIOLETA,
    );
    expect(
      await restablecer(page).evaluate((el) => {
        const e = getComputedStyle(el);
        return { fondo: e.backgroundColor, color: e.color };
      }),
    ).toEqual({ fondo: 'rgba(0, 0, 0, 0)', color: 'rgb(154, 154, 154)' });
    for (const deslizador of [deslizadorDePosicion, deslizadorDeEstela]) {
      expect(await deslizador.evaluate((el) => getComputedStyle(el).accentColor)).toBe(VIOLETA);
    }
    await sinBordesNiSombras(page, `${CONTROLES} button, ${CONTROLES} input`);
    const etiquetasDeRadio = await page
      .locator(`${CONTROLES} input[type="radio"]`)
      .evaluateAll((radios) =>
        radios.map((radio) => {
          const e = getComputedStyle((radio as HTMLInputElement).labels![0]!);
          return {
            bordes: [e.borderTopWidth, e.borderRightWidth, e.borderBottomWidth, e.borderLeftWidth],
            sombra: e.boxShadow,
          };
        }),
      );
    expect(etiquetasDeRadio).toHaveLength(5);
    for (const etiqueta of etiquetasDeRadio) {
      expect(etiqueta.bordes).toEqual(['0px', '0px', '0px', '0px']);
      expect(etiqueta.sombra).toBe('none');
    }

    // Tab desde el lienzo: botón, grupo de velocidad (una parada), posición, estela, restablecer, anterior, siguiente.
    await page.locator(LIENZO).focus();
    const recorrido = [
      botonAnimacion(page),
      radioDeVelocidad(page, '1×'),
      deslizadorDePosicion,
      deslizadorDeEstela,
      restablecer(page),
      page.getByRole('link', { name: /^Anterior: /i }),
      page.getByRole('link', { name: /^Siguiente: /i }),
    ];
    for (const [i, elemento] of recorrido.entries()) {
      await page.keyboard.press('Tab');
      await expect(elemento, `parada ${i + 1} de la tabulación`).toBeFocused();
    }
  });

  test('GRV-04 · criterio 24: la velocidad cambia el ritmo de la órbita y se subraya solo la elegida', async () => {
    await partirDe(page, { enMarcha: true });

    for (const [i, texto] of TEXTOS_DE_VELOCIDAD.entries()) {
      const velocidad = VELOCIDADES[i]!;
      await elegirRadio(radioDeVelocidad(page, texto));
      await expect(radioDeVelocidad(page, texto)).toBeChecked();
      await expect.poll(() => atributoDelDetalle(page, 'data-velocidad')).toBe(velocidad);
      await esperarReproduciendo(page, true);

      await page.waitForTimeout(300);
      const muestras = await muestrearPosicion(page, 2000, 100);
      expect(muestras.length).toBeGreaterThan(10);
      const nominal = velocidad / PERIODO_FIGURA_DE_OCHO;
      // El desenvuelto solo es fiable si entre dos lecturas no avanza ni media vuelta.
      const mayorSalto = Math.max(
        ...muestras.slice(1).map((m, k) => (m.segundos - muestras[k]!.segundos) * nominal),
      );
      expect(mayorSalto, `${texto}: avance máximo entre lecturas`).toBeLessThan(0.5);
      const pendiente = pendienteDePosicion(muestras);
      expect(
        Math.abs(pendiente / nominal - 1),
        `${texto}: pendiente ${pendiente.toFixed(4)} frente a ${nominal.toFixed(4)} por segundo`,
      ).toBeLessThanOrEqual(0.1);

      // Solo la opción marcada está subrayada, y en ámbar.
      for (const [k, otro] of TEXTOS_DE_VELOCIDAD.entries()) {
        const subrayado = await subrayadoDe(radioDeVelocidad(page, otro));
        if (k === i) {
          expect(subrayado?.linea, `${otro} marcada`).toContain('underline');
          expect(subrayado?.color).toBe(AMBAR);
        } else {
          expect(subrayado, `${otro} sin marcar`).toBeNull();
        }
      }
    }
  });

  test('GRV-04 · criterio 25: el deslizador de posición pausa, fija la posición y la telemetría la sigue', async () => {
    await partirDe(page, { enMarcha: true });
    const deslizador = posicion(page);

    await deslizador.fill('0.5');
    await esperarReproduciendo(page, false);
    await expect(botonAnimacion(page)).toHaveText(/reproducir animación/i);
    await expect
      .poll(() => leerPosicion(page), { timeout: 500, intervals: [25, 50, 50, 100] })
      .toBe(0.5);
    expect(
      Math.abs(Number(await deslizador.inputValue()) - (await leerPosicion(page))),
    ).toBeLessThan(0.002);

    // La telemetría muestra la lectura de u = 0,5, no la inicial.
    const esperadas = cifrasEsperadas('figura-de-ocho', 0.5);
    expect(esperadas.tiempo).toBe('3,16');
    await expect.poll(() => leerCifras(page), { timeout: 1500 }).toEqual(esperadas);
    await expect(page.locator('[data-cifra="fase"]')).toHaveAttribute('data-valor', '0.500');
    expect(await textoDeColumna(page, 'tiempo')).toContain(textoDeFase('figura-de-ocho', 0.5));
    expect(await textoDeColumna(page, 'tiempo')).toContain('50,0 %');
    expect(normalizar(await deslizador.getAttribute('aria-valuetext'))).toBe(
      '50,0 % del periodo (t = 3,16 de 6,33)',
    );

    // Teclado: una flecha es un paso de 0,001 (no de 0,01); Inicio y Fin llevan a los extremos.
    await deslizador.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => Number(await deslizador.inputValue())).toBeCloseTo(0.501, 6);
    await expect.poll(() => distanciaA(page, 0.501), { timeout: 2000 }).toBeLessThan(0.002);

    await page.keyboard.press('Home');
    await expect.poll(async () => Number(await deslizador.inputValue())).toBe(0);
    await expect.poll(() => leerPosicion(page), { timeout: 2000 }).toBe(0);
    await expect.poll(async () => (await leerCifras(page)).tiempo, { timeout: 2000 }).toBe('0,00');

    await page.keyboard.press('End');
    await expect.poll(async () => Number(await deslizador.inputValue())).toBeCloseTo(0.999, 6);
    await expect.poll(() => distanciaA(page, 0.999), { timeout: 2000 }).toBeLessThan(0.002);
    await expect
      .poll(async () => textoDeColumna(page, 'tiempo'), { timeout: 2000 })
      .toContain('99,9 %');

    // Ratón: arrastrar desde el extremo hasta el 25 % del recorrido.
    const caja = (await deslizador.boundingBox())!;
    const radioDelPulgar = 8;
    const y = caja.y + caja.height / 2;
    await page.mouse.move(caja.x + caja.width - radioDelPulgar, y);
    await page.mouse.down();
    await page.mouse.move(caja.x + radioDelPulgar + 0.25 * (caja.width - 2 * radioDelPulgar), y, {
      steps: 12,
    });
    await page.mouse.up();
    const arrastrado = Number(await deslizador.inputValue());
    expect(Math.abs(arrastrado - 0.25)).toBeLessThanOrEqual(0.03);
    await expect
      .poll(async () =>
        Math.abs((await leerPosicion(page)) - Number(await deslizador.inputValue())),
      )
      .toBeLessThan(0.002);
    expect(await reproduciendo(page)).toBe('false');

    // Reproducir continúa desde ahí, no desde el principio.
    const valorFijado = Number(await deslizador.inputValue());
    const inicio = await ahoraEnSegundos(page);
    await botonAnimacion(page).click();
    await esperarReproduciendo(page, true);
    let tras = await leerPosicionConHora(page);
    await expect
      .poll(
        async () => {
          tras = await leerPosicionConHora(page);
          return distanciaCircular(valorFijado, tras.posicion);
        },
        { timeout: 5_000 },
      )
      .toBeGreaterThan(0.02);
    const salto = distanciaCircular(valorFijado, tras.posicion);
    expect(salto).toBeLessThan((tras.segundos - inicio + 0.4) / PERIODO_FIGURA_DE_OCHO);
    expect(distanciaCircular(0, tras.posicion)).toBeGreaterThan(0.1);

    // En marcha y sin tocarlo ni enfocarlo, el deslizador sigue a data-posicion.
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await expect
      .poll(async () => distanciaCircular(valorFijado, await leerPosicion(page)), {
        timeout: 10_000,
      })
      .toBeGreaterThan(0.2);
    await expect
      .poll(
        () =>
          page.evaluate(
            ({ contenedor }) => {
              const control = document.querySelector<HTMLInputElement>(
                'input[type="range"][min="0"][max="0.999"]',
              );
              const u = Number(document.querySelector(contenedor)?.getAttribute('data-posicion'));
              const v = Number(control?.value);
              const d = Math.abs(u - v);
              return Math.min(d, 1 - d);
            },
            { contenedor: CONTENEDOR },
          ),
        { timeout: 5_000 },
      )
      .toBeLessThan(0.05);
    expect(await reproduciendo(page)).toBe('true');
  });

  test('GRV-04 · criterio 26: la longitud de la estela cambia lo que se dibuja', async () => {
    await partirDe(page, { enMarcha: false });
    await posicion(page).fill('0.5');
    const deslizador = estela(page);

    await deslizador.fill('0.05');
    await expect.poll(() => atributoDelDetalle(page, 'data-longitud-estela')).toBeCloseTo(0.05, 6);
    expect(normalizar(await deslizador.getAttribute('aria-valuetext'))).toBe('5 % del periodo');
    const corta = contarColoresDeLosCuerpos(await capturaEstable(page));

    await deslizador.fill('1');
    await expect.poll(() => atributoDelDetalle(page, 'data-longitud-estela')).toBe(1);
    expect(normalizar(await deslizador.getAttribute('aria-valuetext'))).toBe('100 % del periodo');
    const larga = contarColoresDeLosCuerpos(await capturaEstable(page));

    const suma = (cuentas: number[]) => cuentas.reduce((a, b) => a + b, 0);
    // El umbral de la spec es el doble; se calibra en el primer verde sin bajarlo de 1,5.
    expect(suma(corta), 'píxeles de color con la estela corta').toBeGreaterThan(50);
    expect(suma(larga), `corta ${suma(corta)}, larga ${suma(larga)}`).toBeGreaterThanOrEqual(
      2 * suma(corta),
    );
  });

  test('GRV-04 · criterio 27: reproducir, pausar y restablecer la vista', async () => {
    await partirDe(page, { enMarcha: true });
    const boton = botonAnimacion(page);

    // El botón violeta alterna.
    await boton.click();
    await esperarReproduciendo(page, false);
    await expect(boton).toHaveText(/reproducir animación/i);

    // En pausa nada cambia durante 600 ms: ni la posición, ni la vista, ni las cifras.
    await esperarAsentado(page);
    const quieta = {
      posicion: await leerPosicion(page),
      vista: await leerVistaTexto(page),
      cifras: await leerCifras(page),
    };
    await page.waitForTimeout(600);
    expect({
      posicion: await leerPosicion(page),
      vista: await leerVistaTexto(page),
      cifras: await leerCifras(page),
    }).toEqual(quieta);
    // Prueba de que la página procesaba: un cambio de deslizador sí se refleja.
    await posicion(page).fill('0.3');
    await expect.poll(() => distanciaA(page, 0.3), { timeout: 2000 }).toBeLessThan(0.002);

    // Espacio con el lienzo enfocado alterna igual.
    await page.locator(LIENZO).focus();
    await page.keyboard.press('Space');
    await esperarReproduciendo(page, true);
    await expect(boton).toHaveText(/pausar animación/i);

    // En marcha y sin tocar nada, la vista no se mueve sola (el detalle no gira).
    const vistaEnMarcha = await leerVistaTexto(page);
    await page.waitForTimeout(2000);
    expect(await leerVistaTexto(page)).toBe(vistaEnMarcha);

    await page.keyboard.press('Space');
    await esperarReproduciendo(page, false);
    await expect(boton).toHaveText(/reproducir animación/i);

    // Restablecer vista, con el ratón y con Enter.
    await page.locator(LIENZO).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => leerVistaTexto(page)).not.toBe('0.600 1.000 1.000');
    await restablecer(page).click();
    await expect.poll(() => leerVistaTexto(page)).toBe('0.600 1.000 1.000');

    await page.locator(LIENZO).focus();
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await expect.poll(() => leerVistaTexto(page)).not.toBe('0.600 1.000 1.000');
    await restablecer(page).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => leerVistaTexto(page)).toBe('0.600 1.000 1.000');
  });

  test('GRV-04 · criterio 30: la telemetría en vivo conserva E y P, se mueve a unos 10 Hz y no sigue a cada fotograma', async () => {
    await partirDe(page, { enMarcha: true });
    const trayectoria = trayectoriaDe('figura-de-ocho');
    const lecturas = await muestrearTelemetria(page, 3000, 100);
    comprobarTelemetriaEnVivo(lecturas, trayectoria, {
      energia: `${MENOS}1,287`,
      distintosDeDistanciaYVelocidad: 3,
    });

    // Los textos estáticos son los de la ficha, dentro de su frase.
    await comprobarResumenes(page, 'figura-de-ocho');
  });

  test('GRV-04 · criterio 30: en pausa el contador no avanza, una posición fijada se refleja al instante y el estilo es el del diseño', async () => {
    await partirDe(page, { enMarcha: false });
    await esperarAsentado(page);

    const antes = await leerActualizaciones(page);
    await page.waitForTimeout(1000);
    expect(await leerActualizaciones(page)).toBe(antes);

    // Girar la cámara repinta la escena sin mover la posición: las cifras no se reescriben.
    const fotogramasAntes = await leerFotogramas(page);
    const vistaAntes = await leerVista(page);
    await page.locator(LIENZO).focus();
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowLeft');
    await expect.poll(() => leerVista(page), { timeout: 5_000 }).not.toEqual(vistaAntes);
    await esperarAsentado(page);
    expect(await leerFotogramas(page)).toBeGreaterThan(fotogramasAntes);
    expect(await leerActualizaciones(page)).toBe(antes);

    await posicion(page).fill('0.5');
    await expect
      .poll(() => leerActualizaciones(page), { timeout: 500, intervals: [25, 50, 50, 100] })
      .toBeGreaterThan(antes);

    // Dos posiciones fijadas casi a la vez: la última manda (en pausa no se limita el ritmo).
    // Los dos eventos `input` salen dentro de un mismo evaluate, sin ningún margen entre ellos: un
    // límite de ritmo que también actuara en pausa descartaría el segundo y dejaría la lectura de 0,3.
    await posicion(page).evaluate((el) => {
      const control = el as HTMLInputElement;
      const fijar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      for (const valor of ['0.3', '0.7']) {
        fijar.call(control, valor);
        control.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
    await expect
      .poll(() => leerCifras(page), { timeout: 1500 })
      .toEqual(cifrasEsperadas('figura-de-ocho', 0.7));
    await expect
      .poll(() => textoDeColumna(page, 'tiempo'), { timeout: 1500 })
      .toContain(textoDeFase('figura-de-ocho', 0.7));
    // La lectura no vuelve a la del primer valor ni se queda a medias.
    await esperarAsentado(page);
    expect(await leerCifras(page)).toEqual(cifrasEsperadas('figura-de-ocho', 0.7));

    // La barra de fase sigue a la posición.
    const fase = Number(await page.locator('[data-cifra="fase"]').getAttribute('data-valor'));
    expect(distanciaCircular(fase, await leerPosicion(page))).toBeLessThan(0.05);

    await comprobarEstiloDeLaTelemetria(page, { ancho: 1440 });
  });

  test('GRV-04 · criterio 31: árbol de accesibilidad, nombres, foco visible, flechas y deslizador enfocado', async () => {
    await partirDe(page, { enMarcha: true });

    // La parte viva no aparece en el árbol: dos instantes separados 1,5 s dan lo mismo.
    const telemetria = page.locator(TELEMETRIA);
    const primero = await telemetria.ariaSnapshot();
    await page.waitForTimeout(1500);
    const segundo = await telemetria.ariaSnapshot();
    expect(segundo).toBe(primero);
    for (const etiqueta of [
      'Tiempo',
      'Energía E',
      'Momento lineal |P|',
      'Distancia mínima',
      'Velocidad máxima',
    ]) {
      expect(primero, etiqueta).toContain(etiqueta);
    }
    const { resumenes } = textosIniciales('figura-de-ocho');
    for (const valor of Object.values(resumenes)) {
      expect(primero, valor).toContain(valor);
    }

    // Todas las cifras en vivo están ocultas a los lectores de pantalla.
    const ocultas = await page
      .locator('[data-cifra]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('aria-hidden')));
    expect(ocultas.length).toBeGreaterThanOrEqual(6);
    expect(ocultas.every((valor) => valor === 'true')).toBe(true);

    // Nada que anuncie cambios; el único role=status es el del visor.
    await expect(
      page.locator(
        `${DETALLE} [aria-live], ${DETALLE} output, ${DETALLE} [role="timer"], ${DETALLE} [role="alert"], ${DETALLE} [role="log"]`,
      ),
    ).toHaveCount(0);
    await expect(page.locator(`${DETALLE} [role="status"]`)).toHaveCount(1);

    // Nombres accesibles.
    await expect(botonAnimacion(page)).toHaveCount(1);
    await expect(grupoDeVelocidad(page)).toHaveCount(1);
    await expect(posicion(page)).toHaveCount(1);
    await expect(estela(page)).toHaveCount(1);
    await expect(restablecer(page)).toHaveCount(1);
    const rotulo = await grupoDeVelocidad(page).evaluate((el) => {
      const id = el.getAttribute('aria-labelledby');
      return id ? (document.getElementById(id)?.textContent ?? null) : null;
    });
    expect(rotulo?.trim().toLowerCase()).toBe('velocidad de reproducción');

    // Foco visible por teclado: contorno blanco de 2 px en cada control.
    await page.locator(LIENZO).focus();
    for (const [i, elemento] of [
      botonAnimacion(page),
      radioDeVelocidad(page, '1×'),
      posicion(page),
      estela(page),
      restablecer(page),
    ].entries()) {
      await page.keyboard.press('Tab');
      await expect(elemento, `parada ${i + 1}`).toBeFocused();
      expect(await contornoDeFoco(page), `contorno de la parada ${i + 1}`).toEqual(FOCO);
    }

    // Las flechas cambian la velocidad dentro del grupo.
    await radioDeVelocidad(page, '1×').focus();
    await page.keyboard.press('ArrowRight');
    await expect(radioDeVelocidad(page, '2×')).toBeChecked();
    await expect.poll(() => atributoDelDetalle(page, 'data-velocidad')).toBe(2);
    await page.keyboard.press('ArrowLeft');
    await expect(radioDeVelocidad(page, '1×')).toBeChecked();
    await expect.poll(() => atributoDelDetalle(page, 'data-velocidad')).toBe(1);

    // Con el foco en el deslizador y la escena en marcha, ni value ni aria-valuetext cambian,
    // pero el texto visible de al lado sí.
    await esperarReproduciendo(page, true);
    const deslizador = posicion(page);
    await deslizador.focus();
    const textoVisible = () =>
      deslizador.evaluate((el) => {
        let nodo = el.parentElement;
        while (nodo && !nodo.querySelector('span[aria-hidden="true"]')) nodo = nodo.parentElement;
        return nodo?.querySelector('span[aria-hidden="true"]')?.textContent ?? null;
      });
    const lectura = async () => ({
      valor: await deslizador.inputValue(),
      texto: await deslizador.getAttribute('aria-valuetext'),
    });
    const quieto = await lectura();
    const visibleAntes = await textoVisible();
    expect(visibleAntes).not.toBeNull();
    await expect.poll(textoVisible, { timeout: 5_000 }).not.toBe(visibleAntes);
    expect(await lectura()).toEqual(quieto);
    expect(await reproduciendo(page)).toBe('true');

    // Objetivos táctiles de al menos 44 px a 375 y a 1440 px.
    for (const [ancho, alto] of [
      [375, 812],
      [1440, 900],
    ] as const) {
      await page.setViewportSize({ width: ancho, height: alto });
      await expect
        .poll(
          async () => {
            const cajas = await medirObjetivos(page);
            return cajas.filter((c) => c.ancho < 44 || c.alto < 44).map((c) => c.nombre);
          },
          { timeout: 5_000, message: `objetivos menores de 44 px a ${ancho} px` },
        )
        .toEqual([]);
      // Dos botones, dos deslizadores y las cinco etiquetas de la velocidad.
      expect((await medirObjetivos(page)).length).toBe(2 + 2 + 5);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  });
});

/** Botones, deslizadores y etiquetas de radio del detalle, con su caja. */
async function medirObjetivos(page: Page) {
  return page.locator(CONTROLES).evaluate((region) => {
    const objetivos: { nombre: string; el: Element }[] = [];
    region
      .querySelectorAll('button')
      .forEach((el) => objetivos.push({ nombre: `botón ${el.textContent}`, el }));
    region
      .querySelectorAll('input[type="range"]')
      .forEach((el) => objetivos.push({ nombre: `deslizador ${el.getAttribute('min')}`, el }));
    region.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach((el) => {
      const etiqueta = el.labels?.[0];
      if (etiqueta) objetivos.push({ nombre: `radio ${etiqueta.textContent}`, el: etiqueta });
    });
    return objetivos.map(({ nombre, el }) => {
      const caja = el.getBoundingClientRect();
      return { nombre, ancho: caja.width, alto: caja.height };
    });
  });
}

type Trayectoria = ReturnType<typeof trayectoriaDe>;

/** Comprobaciones comunes de la telemetría en vivo (criterio 30) sobre lecturas tomadas en marcha. */
function comprobarTelemetriaEnVivo(
  lecturas: readonly LecturaDePagina[],
  trayectoria: Trayectoria,
  {
    energia,
    distintosDeDistanciaYVelocidad,
  }: { energia: string; distintosDeDistanciaYVelocidad: number },
) {
  expect(lecturas.length).toBeGreaterThanOrEqual(25);
  expect(lecturas.map((l) => l.cifras.energia)).toEqual(lecturas.map(() => energia));
  expect(lecturas.map((l) => l.cifras.momento)).toEqual(lecturas.map(() => '0,000'));

  const distintos = (cifra: Cifra) => new Set(lecturas.map((l) => l.cifras[cifra])).size;
  expect(distintos('tiempo'), 'valores distintos de tiempo').toBeGreaterThanOrEqual(5);
  if (distintosDeDistanciaYVelocidad > 0) {
    expect(distintos('distancia-minima')).toBeGreaterThanOrEqual(distintosDeDistanciaYVelocidad);
    expect(distintos('velocidad-maxima')).toBeGreaterThanOrEqual(distintosDeDistanciaYVelocidad);
  }
  for (const l of lecturas) {
    expect(deTexto(l.cifras['distancia-minima'])).toBeGreaterThanOrEqual(
      0.95 * trayectoria.distanciaMinima,
    );
    expect(deTexto(l.cifras['velocidad-maxima'])).toBeLessThanOrEqual(
      1.05 * trayectoria.velocidadMaxima,
    );
    // Nunca más escrituras que fotogramas.
    expect(l.actualizaciones).toBeLessThanOrEqual(l.fotogramas);
    expect(distanciaCircular(l.fase, l.posicion)).toBeLessThan(0.05);
  }

  const primera = lecturas[0]!;
  const ultima = lecturas[lecturas.length - 1]!;
  const segundos = ultima.segundos - primera.segundos;
  const porSegundo = (ultima.actualizaciones - primera.actualizaciones) / segundos;
  const fps = (ultima.fotogramas - primera.fotogramas) / segundos;
  expect(fps, 'fotogramas por segundo').toBeGreaterThanOrEqual(20);
  expect(
    porSegundo,
    `escrituras de telemetría por segundo (${fps.toFixed(0)} fps)`,
  ).toBeGreaterThanOrEqual(2);
  expect(
    porSegundo,
    `escrituras de telemetría por segundo (${fps.toFixed(0)} fps)`,
  ).toBeLessThanOrEqual(12);
}

/** Los cinco textos estáticos, cada uno dentro de su frase, con los valores de la ficha. */
async function comprobarResumenes(page: Page, slug: Parameters<typeof textosIniciales>[0]) {
  const { resumenes } = textosIniciales(slug);
  const frases = {
    periodo: `Periodo ${resumenes.periodo}`,
    energia: `Se conserva: ${resumenes.energia}`,
    momento: `Se conserva: ${resumenes.momento}`,
    'distancia-minima': `Mínima del periodo: ${resumenes['distancia-minima']}`,
    'velocidad-maxima': `Máxima del periodo: ${resumenes['velocidad-maxima']}`,
  } as const;
  for (const [clave, frase] of Object.entries(frases)) {
    const dato = page.locator(`[data-resumen="${clave}"]`);
    await expect(dato, clave).toHaveCount(1);
    await expect(dato, clave).toHaveText(resumenes[clave as keyof typeof resumenes]);
    const columna = await dato.evaluate((el) => el.closest('[data-columna]')?.textContent ?? null);
    expect(normalizar(columna), `${clave}: frase dentro de su columna`).toContain(frase);
  }
}

/** Tamaño, peso y estilo de las cifras y las etiquetas de la telemetría según el ancho (criterio 30). */
async function comprobarEstiloDeLaTelemetria(page: Page, { ancho }: { ancho: number }) {
  const cifras = await page.locator(TELEMETRIA).evaluate((region) =>
    ['tiempo', 'energia', 'momento', 'distancia-minima', 'velocidad-maxima'].map((nombre) => {
      const e = getComputedStyle(region.querySelector(`[data-cifra="${nombre}"]`)!);
      return {
        nombre,
        tamano: parseFloat(e.fontSize),
        peso: e.fontWeight,
        numeros: e.fontVariantNumeric,
      };
    }),
  );
  const tamanoMinimo = ancho >= 900 ? 42 : 27;
  const peso = ancho >= 640 ? '200' : '300';
  for (const c of cifras) {
    expect(c.numeros, `${c.nombre}: cifras tabulares`).toContain('tabular-nums');
    expect(c.tamano, `${c.nombre}: tamaño a ${ancho} px`).toBeGreaterThanOrEqual(tamanoMinimo);
    expect(c.peso, `${c.nombre}: peso a ${ancho} px`).toBe(peso);
  }

  const etiquetas = await page.locator(`${TELEMETRIA} dt`).evaluateAll((els) =>
    els.map((el) => {
      const e = getComputedStyle(el);
      return { color: e.color, mayusculas: e.textTransform, tamano: e.fontSize };
    }),
  );
  expect(etiquetas).toHaveLength(5);
  for (const etiqueta of etiquetas) {
    expect(etiqueta).toEqual({ color: AMBAR, mayusculas: 'uppercase', tamano: '14px' });
  }

  const columnas = await page.locator('[data-columna]').evaluateAll((els) =>
    els.map((el) => {
      const e = getComputedStyle(el);
      return {
        bordes: [e.borderTopWidth, e.borderRightWidth, e.borderBottomWidth, e.borderLeftWidth],
        sombra: e.boxShadow,
        fondo: e.backgroundColor,
      };
    }),
  );
  expect(columnas).toHaveLength(5);
  for (const columna of columnas) {
    expect(columna).toEqual({
      bordes: ['0px', '0px', '0px', '0px'],
      sombra: 'none',
      fondo: 'rgba(0, 0, 0, 0)',
    });
  }
}

test.describe('telemetría de Goggles', () => {
  test('GRV-04 · criterio 30: Goggles conserva su propia energía y el momento, y se mueve', async ({
    page,
  }) => {
    await page.goto('/orbitas/goggles');
    await esperarLista(page);
    await expect(botonAnimacion(page)).toHaveText(/pausar animación/i);

    const lecturas = await muestrearTelemetria(page, 3000, 100);
    comprobarTelemetriaEnVivo(lecturas, trayectoriaDe('goggles'), {
      energia: `${MENOS}2,430`,
      distintosDeDistanciaYVelocidad: 0,
    });
    await comprobarResumenes(page, 'goggles');
    expect(orbitaDe('goggles').nombre).toBe('Goggles');
  });
});

test.describe('preferencias compartidas entre órbitas', () => {
  test('GRV-04 · criterio 28: la velocidad y la estela pasan a la órbita siguiente; la posición y la vista, no; una recarga lo olvida', async ({
    page,
  }) => {
    await page.goto('/orbitas/lagrange');
    await esperarLista(page);

    await elegirRadio(radioDeVelocidad(page, '2×'));
    await expect.poll(() => atributoDelDetalle(page, 'data-velocidad')).toBe(2);
    await estela(page).fill('1');
    await expect.poll(() => atributoDelDetalle(page, 'data-longitud-estela')).toBe(1);

    const antesDelClic = await ahoraEnSegundos(page);
    await page.getByRole('link', { name: 'Siguiente: Figura de ocho', exact: true }).click();
    await expect(page).toHaveURL(/\/orbitas\/figura-de-ocho$/);
    await expect(raizDelDetalle(page)).toHaveAttribute('data-detalle', 'figura-de-ocho');
    await esperarLista(page);

    await expect(radioDeVelocidad(page, '2×')).toBeChecked();
    expect(await atributoDelDetalle(page, 'data-velocidad')).toBe(2);
    expect(Number(await estela(page).inputValue())).toBe(1);
    expect(await atributoDelDetalle(page, 'data-longitud-estela')).toBe(1);

    // Posición y vista de una órbita nueva: empieza en 0 y avanza a 2×.
    const { posicion: u, segundos } = await leerPosicionConHora(page);
    expect(distanciaCircular(0, u)).toBeLessThan(
      ((segundos - antesDelClic + 0.5) * 2) / PERIODO_FIGURA_DE_OCHO,
    );
    expect(await leerVista(page)).toEqual(VISTA_INICIAL);

    await page.reload();
    await esperarLista(page);
    await expect(radioDeVelocidad(page, '1×')).toBeChecked();
    expect(await atributoDelDetalle(page, 'data-velocidad')).toBe(1);
    expect(Number(await estela(page).inputValue())).toBe(0.5);
    expect(await atributoDelDetalle(page, 'data-longitud-estela')).toBe(0.5);
  });
});

test.describe('reanudación sin movimiento reducido', () => {
  test('GRV-04 · criterio 29: al volver a una órbita en marcha, sigue desde donde se dejó', async ({
    page,
  }) => {
    // Yin-Yang I (periodo 17,33 s): un reinicio a 0 queda muy lejos de la cota del enunciado.
    await page.goto('/orbitas/yin-yang-i');
    await esperarLista(page);
    const periodo = orbitaDe('yin-yang-i').periodo;

    await posicion(page).fill('0.5');
    await esperarReproduciendo(page, false);
    await botonAnimacion(page).click();
    await esperarReproduciendo(page, true);
    await page.waitForTimeout(300);
    const referencia = await leerPosicionConHora(page);
    expect(distanciaCircular(0, referencia.posicion)).toBeGreaterThan(0.4);

    await volver(page).click();
    await expect(page).toHaveURL(/\/#galeria$/);
    await page.locator('#galeria a[data-orbita="yin-yang-i"]').click();
    await expect(page).toHaveURL(/\/orbitas\/yin-yang-i$/);
    await esperarLista(page);
    await expect(raizDelDetalle(page)).toHaveAttribute('data-detalle', 'yin-yang-i');

    const regreso = await leerPosicionConHora(page);
    const cota = (regreso.segundos - referencia.segundos + 0.6) / periodo;
    expect(distanciaCircular(referencia.posicion, regreso.posicion)).toBeLessThan(cota);
    expect(distanciaCircular(0, regreso.posicion)).toBeGreaterThan(0.3);
  });
});

test.describe('detalle responsive', () => {
  for (const [ancho, alto] of [
    [375, 812],
    [768, 1024],
    [1440, 900],
  ] as const) {
    test(`GRV-04 · criterio 32: a ${ancho} px no desborda, el visor y la telemetría caben y la telemetría no se mueve al llegar a lista (incluye el estilo del criterio 30)`, async ({
      browser,
      baseURL,
    }) => {
      test.setTimeout(120_000);
      const contexto = await browser.newContext({
        baseURL,
        viewport: { width: ancho, height: alto },
      });
      contexto.setDefaultTimeout(20_000);
      try {
        // Estado `cargando` estable: un Worker que nunca responde deja la escena sin lista.
        const muda = await contexto.newPage();
        let cargando: Awaited<ReturnType<typeof geometria>> | null = null;
        if (ancho !== 768) {
          await muda.addInitScript(workerQueNuncaResponde);
          await muda.goto('/orbitas/figura-de-ocho');
          await expect(muda.locator(CONTENEDOR)).toHaveAttribute('data-estado-escena', 'cargando');
          await muda.evaluate(() => document.fonts.ready);
          cargando = await geometria(muda);
          expect(cargando.desborda, 'desbordamiento en cargando').toBe(false);
          expect(cargando.controles).toEqual({ inerte: true, visibilidad: 'hidden' });
        }

        const normal = await contexto.newPage();
        await normal.goto('/orbitas/figura-de-ocho');
        await expect(normal.locator('h1')).toBeVisible();
        expect((await geometria(normal)).desborda, 'desbordamiento antes de lista').toBe(false);
        await esperarLista(normal);
        await normal.evaluate(() => document.fonts.ready);
        const lista = await geometria(normal);

        expect(lista.desborda, 'desbordamiento en lista').toBe(false);
        expect(lista.h1.peso).toBe('400');
        expect(lista.h1.tamano).toBeGreaterThanOrEqual(ancho >= 1440 ? 78 : 46);
        if (ancho === 375) {
          expect(lista.lienzo.ancho).toBeGreaterThanOrEqual(327);
          expect(lista.lienzo.alto).toBeGreaterThanOrEqual(360);
        }
        if (ancho === 1440) {
          expect(lista.lienzo.ancho).toBeGreaterThanOrEqual(800);
          expect(lista.lienzo.alto).toBeGreaterThanOrEqual(480);
        }
        expect(lista.controlesFuera, 'controles fuera del ancho').toEqual([]);

        // Cinco columnas visibles, dentro de la ventana y sin solaparse.
        await normal.locator(TELEMETRIA).scrollIntoViewIfNeeded();
        const columnas = await normal.locator('[data-columna]').evaluateAll((els) =>
          els.map((el) => {
            const r = el.getBoundingClientRect();
            return {
              x0: r.left,
              y0: r.top,
              x1: r.right,
              y1: r.bottom,
              nombre: el.getAttribute('data-columna'),
            };
          }),
        );
        expect(columnas).toHaveLength(5);
        for (const c of columnas) {
          expect(c.x1 - c.x0, c.nombre ?? '').toBeGreaterThan(0);
          expect(c.y1 - c.y0, c.nombre ?? '').toBeGreaterThan(0);
          expect(c.x0, c.nombre ?? '').toBeGreaterThanOrEqual(-0.5);
          expect(c.x1, c.nombre ?? '').toBeLessThanOrEqual(ancho + 0.5);
          expect(c.y0, c.nombre ?? '').toBeGreaterThanOrEqual(-0.5);
          expect(c.y1, c.nombre ?? '').toBeLessThanOrEqual(alto + 0.5);
        }
        for (const [i, a] of columnas.entries()) {
          for (const b of columnas.slice(i + 1)) {
            const solapa =
              a.x0 < b.x1 - 0.5 && b.x0 < a.x1 - 0.5 && a.y0 < b.y1 - 0.5 && b.y0 < a.y1 - 0.5;
            expect(solapa, `${a.nombre} y ${b.nombre} se solapan`).toBe(false);
          }
        }

        // Por debajo de 900 px la telemetría va justo bajo el visor, antes que los controles.
        if (ancho < 900) {
          expect(
            lista.telemetria.arriba,
            'la telemetría empieza bajo el visor',
          ).toBeGreaterThanOrEqual(lista.abajoDelVisor - 1);
          expect(lista.telemetria.arriba, 'la telemetría va antes que los controles').toBeLessThan(
            lista.arribaDeLosControles,
          );
        }

        // La telemetría no se desplaza al pasar de cargando a lista.
        if (cargando) {
          expect(
            Math.abs(lista.telemetria.arriba - cargando.telemetria.arriba),
            `borde superior de la telemetría: cargando ${cargando.telemetria.arriba}, lista ${lista.telemetria.arriba}`,
          ).toBeLessThan(2);
        }

        if (ancho === 375) {
          // Con la telemetría pegada al borde inferior de la ventana, se sigue viendo el visor.
          const visible = await normal.evaluate(
            ({ telemetria, contenedor }) => {
              const t = document.querySelector(telemetria)!.getBoundingClientRect();
              window.scrollTo(0, window.scrollY + t.bottom - window.innerHeight);
              const lienzo = document
                .querySelector(`${contenedor} canvas`)!
                .getBoundingClientRect();
              return Math.min(lienzo.bottom, window.innerHeight) - Math.max(lienzo.top, 0);
            },
            { telemetria: TELEMETRIA, contenedor: CONTENEDOR },
          );
          expect(visible, 'píxeles del lienzo visibles').toBeGreaterThanOrEqual(100);
        }
        if (ancho === 1440) {
          // El orden visual es el del DOM: visor, controles, telemetría, navegación.
          const tops = await normal.evaluate(
            ({ contenedor, controles, telemetria }) =>
              [contenedor, controles, telemetria, 'nav[aria-label="Entre órbitas"]'].map(
                (selector) => document.querySelector(selector)!.getBoundingClientRect().top,
              ),
            { contenedor: CONTENEDOR, controles: CONTROLES, telemetria: TELEMETRIA },
          );
          for (let i = 1; i < tops.length; i++) {
            expect(tops[i]!, `el elemento ${i} no va antes que el ${i - 1}`).toBeGreaterThanOrEqual(
              tops[i - 1]! - 1,
            );
          }
        }

        await comprobarEstiloDeLaTelemetria(normal, { ancho });
      } finally {
        await contexto.close();
      }
    });
  }

  test('GRV-04 · criterio 32: con el lienzo fuera de la ventana el bucle se detiene y al volver sigue sin saltos', async ({
    browser,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    const contexto = await browser.newContext({ baseURL, viewport: { width: 375, height: 600 } });
    contexto.setDefaultTimeout(20_000);
    try {
      const page = await contexto.newPage();
      await page.goto('/orbitas/figura-de-ocho');
      await esperarLista(page);
      await expect(botonAnimacion(page)).toHaveText(/pausar animación/i);

      // Se desplaza hasta que el lienzo sale por completo de la ventana.
      await page.evaluate((contenedor) => {
        const lienzo = document.querySelector(`${contenedor} canvas`)!.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + lienzo.bottom + 20);
      }, CONTENEDOR);
      expect(
        await page.evaluate(
          (contenedor) =>
            document.querySelector(`${contenedor} canvas`)!.getBoundingClientRect().bottom,
          CONTENEDOR,
        ),
      ).toBeLessThan(0);

      await esperarAsentado(page);
      await page.waitForTimeout(300);
      const parado = {
        fotogramas: Number(await page.locator(CONTENEDOR).getAttribute('data-fotogramas')),
        actualizaciones: await leerActualizaciones(page),
        posicion: await leerPosicion(page),
      };
      await page.waitForTimeout(3000);
      expect(Number(await page.locator(CONTENEDOR).getAttribute('data-fotogramas'))).toBe(
        parado.fotogramas,
      );
      expect(await leerActualizaciones(page)).toBe(parado.actualizaciones);
      expect(await leerPosicion(page)).toBe(parado.posicion);

      // Al volver a mostrarlo, en 1 s hay al menos 20 fotogramas y 2 escrituras de telemetría.
      const inicio = await ahoraEnSegundos(page);
      await page.evaluate((contenedor) => {
        const lienzo = document.querySelector(`${contenedor} canvas`)!;
        lienzo.scrollIntoView({ block: 'center' });
      }, CONTENEDOR);
      await page.waitForTimeout(1000);
      expect(
        Number(await page.locator(CONTENEDOR).getAttribute('data-fotogramas')) - parado.fotogramas,
        'fotogramas en 1 s',
      ).toBeGreaterThanOrEqual(20);
      expect(
        (await leerActualizaciones(page)) - parado.actualizaciones,
        'escrituras de telemetría en 1 s',
      ).toBeGreaterThanOrEqual(2);

      // La posición no salta: avanza como mucho lo que ha pasado desde que se mostró, más 0,4 s de margen.
      const ahora = await leerPosicionConHora(page);
      expect(distanciaCircular(parado.posicion, ahora.posicion)).toBeLessThan(
        (ahora.segundos - inicio + 0.4) / PERIODO_FIGURA_DE_OCHO,
      );
    } finally {
      await contexto.close();
    }
  });
});

/** Geometría y estilos del detalle en un instante, para el criterio 32. */
async function geometria(page: Page) {
  await expect(page.locator(CONTROLES), 'región de controles').toHaveCount(1);
  await expect(page.locator(TELEMETRIA), 'región de telemetría').toHaveCount(1);
  return page.evaluate(
    ({ telemetria, controles, contenedor }) => {
      const region = document.querySelector<HTMLElement>(controles)!;
      const lienzo = document.querySelector(`${contenedor} canvas`);
      const caja = lienzo?.getBoundingClientRect();
      const estiloH1 = getComputedStyle(document.querySelector('h1')!);
      const anchoVentana = document.documentElement.clientWidth;
      const fuera = Array.from(region.querySelectorAll('button, input, label'))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.left < -0.5 || r.right > anchoVentana + 0.5);
        })
        .map((el) => el.tagName.toLowerCase() + ':' + (el.textContent ?? '').trim());
      return {
        desborda: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        h1: { peso: estiloH1.fontWeight, tamano: parseFloat(estiloH1.fontSize) },
        lienzo: { ancho: caja?.width ?? 0, alto: caja?.height ?? 0 },
        controles: { inerte: region.inert, visibilidad: getComputedStyle(region).visibility },
        controlesFuera: fuera,
        telemetria: {
          arriba: document.querySelector(telemetria)!.getBoundingClientRect().top + window.scrollY,
        },
        abajoDelVisor:
          document.querySelector(contenedor)!.getBoundingClientRect().bottom + window.scrollY,
        arribaDeLosControles: region.getBoundingClientRect().top + window.scrollY,
      };
    },
    { telemetria: TELEMETRIA, controles: CONTROLES, contenedor: CONTENEDOR },
  );
}
