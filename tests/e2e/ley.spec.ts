import { expect, test, type Page, type Route } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatearNumero, fuerza } from '../../src/lib/ley/ley';
import { PREGUNTAS_FIJAS } from '../../src/lib/tutor/reducido';
import { esperarHidratacion } from './ayudas';

test.use({ actionTimeout: 20_000 });

const deslizador = (page: Page, nombre: string) =>
  page.getByRole('slider', { name: nombre, exact: true });
const masaDerecha = (page: Page) => deslizador(page, 'Masa derecha: distancia');
const valorDe = async (page: Page, nombre: string) =>
  Number(await deslizador(page, nombre).inputValue());

async function leyActual(page: Page) {
  return {
    m1: await valorDe(page, 'Masa 1'),
    m2: await valorDe(page, 'Masa 2'),
    r: await valorDe(page, 'Distancia'),
  };
}

async function esperarFuerzaDe(page: Page) {
  const { m1, m2, r } = await leyActual(page);
  await expect(page.getByTestId('fuerza')).toHaveText(formatearNumero(fuerza(m1, m2, r), 2));
}

test('GRV-05 · criterio 7: deslizadores y teclado mueven la ley y la ley va entre el hero y la galería, y el tutor después', async ({
  page,
}) => {
  await page.goto('/');
  await esperarHidratacion(page);
  // El tutor se carga aparte y, al montarse, pone la ley de su primera pregunta: hay que esperarlo.
  await expect(page.getByTestId('etiqueta-pregunta')).toBeVisible();
  await expect(page.locator('#ley')).toBeVisible();
  const y = async (selector: string) => (await page.locator(selector).boundingBox())!.y;
  expect(await y('h1')).toBeLessThan(await y('#ley'));
  expect(await y('#ley')).toBeLessThan(await y('#galeria'));
  expect(await y('#galeria')).toBeLessThan(await y('#tutor'));

  for (const nombre of ['Masa 1', 'Masa 2', 'Distancia']) {
    expect((await deslizador(page, nombre).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  await deslizador(page, 'Masa 1').fill('8');
  await deslizador(page, 'Distancia').fill('2');
  await esperarFuerzaDe(page);
  expect(await leyActual(page)).toEqual({ m1: 8, m2: 2, r: 2 });
  await expect(page.getByTestId('fuerza')).toHaveText('4,00');
  await expect(page.getByTestId('frase')).toHaveText(
    'A doble distancia (4,0) la fuerza sería 1,00, la cuarta parte. Con el doble de masa en un cuerpo sería 8,00, el doble.',
  );

  await deslizador(page, 'Masa 2').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  expect(await valorDe(page, 'Masa 2')).toBe(3);
  await esperarFuerzaDe(page);
});

test('GRV-05 · criterio 8: la masa derecha se arrastra y se opera con flechas, siempre en [1, 10]', async ({
  page,
}) => {
  await page.goto('/');
  await esperarHidratacion(page);
  // El tutor se carga aparte y, al montarse, pone la ley de su primera pregunta: hay que esperarlo.
  await expect(page.getByTestId('etiqueta-pregunta')).toBeVisible();
  const masa = masaDerecha(page);
  await masa.scrollIntoViewIfNeeded();
  const caja = (await masa.boundingBox())!;
  const centro = { x: caja.x + caja.width / 2, y: caja.y + caja.height / 2 };

  await page.mouse.move(centro.x, centro.y);
  await page.mouse.down();
  await page.mouse.move(centro.x + 2000, centro.y, { steps: 5 });
  await page.mouse.up();
  expect(await valorDe(page, 'Distancia')).toBe(10);
  await expect(masa).toHaveAttribute('aria-valuenow', '10');

  const nueva = (await masa.boundingBox())!;
  await page.mouse.move(nueva.x + nueva.width / 2, nueva.y + nueva.height / 2);
  await page.mouse.down();
  await page.mouse.move(-500, nueva.y + nueva.height / 2, { steps: 5 });
  await page.mouse.up();
  expect(await valorDe(page, 'Distancia')).toBe(1);

  await masa.focus();
  await page.keyboard.press('ArrowRight');
  expect(await valorDe(page, 'Distancia')).toBe(1.5);
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  expect(await valorDe(page, 'Distancia')).toBe(10);
});

test('GRV-05 · criterio 9: sin clave el chat avisa, propone una pregunta y sube de dificultad tras dos aciertos', async ({
  page,
}) => {
  await page.goto('/');
  await esperarHidratacion(page);
  await expect(
    page.getByText(
      'El chat con inteligencia artificial no está activo ahora. Mientras tanto, practica con estas preguntas.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comprueba lo que has aprendido' })).toBeVisible();
  await expect(page.getByTestId('etiqueta-pregunta')).toHaveText(
    /^Pregunta 1 de \d+ · Dificultad: básica$/,
  );

  for (let i = 0; i < 2; i++) {
    const texto = await page.getByTestId('pregunta').innerText();
    const pregunta = PREGUNTAS_FIJAS.find((p) => p.pregunta === texto)!;
    const correcta = pregunta.opciones.find((o) => o.acierto)!;
    await page.getByRole('button', { name: correcta.texto, exact: true }).click();
    await expect(page.getByTestId('correccion')).toHaveText(correcta.correccion);
    await page.getByRole('button', { name: 'Otra pregunta' }).click();
  }
  await expect(page.getByTestId('etiqueta-pregunta')).toContainText('Dificultad: media');
});

/** Respuesta en el protocolo de flujo de mensajes de la interfaz del SDK. */
function flujo(chunks: object[]) {
  const cuerpo = [...chunks, '[DONE]']
    .map((c) => `data: ${typeof c === 'string' ? c : JSON.stringify(c)}\n\n`)
    .join('');
  return { status: 200, headers: { 'x-vercel-ai-ui-message-stream': 'v1' }, body: cuerpo };
}
const conHerramientas = (llamadas: { toolName: string; input: object }[]) =>
  flujo([
    { type: 'start', messageId: crypto.randomUUID() },
    { type: 'start-step' },
    ...llamadas.map((l, i) => ({
      type: 'tool-input-available',
      toolCallId: `llamada-${crypto.randomUUID()}-${i}`,
      ...l,
    })),
    { type: 'finish-step' },
    { type: 'finish' },
  ]);
const conTexto = (texto: string, messageId: string) =>
  flujo([
    { type: 'start', messageId },
    { type: 'start-step' },
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: texto },
    { type: 'text-end', id: 't' },
    { type: 'finish-step' },
    { type: 'finish' },
  ]);

test('GRV-05 · criterio 10: ajustar_ley y mostrar_orbita simuladas mueven la ley y no admiten valores fuera de rango', async ({
  page,
}) => {
  const guion = [
    [
      { toolName: 'ajustar_ley', input: { m1: 8, m2: 2, r: 2 } },
      { toolName: 'mostrar_orbita', input: { slug: 'lagrange' } },
    ],
    [{ toolName: 'ajustar_ley', input: { m1: 50, m2: 1, r: 1 } }],
  ];
  let siguiente = 0;
  await page.route('**/api/tutor', async (ruta: Route) => {
    const peticion = ruta.request();
    if (peticion.method() === 'GET') return ruta.fulfill({ json: { modo: 'modelo' } });
    const { mensajes } = peticion.postDataJSON() as { mensajes: { role: string; id: string }[] };
    const ultimo = mensajes.at(-1)!;
    // Tras ejecutar una herramienta el cliente reenvía solo: ahí responde el "modelo" con texto,
    // continuando el mismo mensaje (como hace el servidor al recibir `originalMessages`).
    if (ultimo.role === 'assistant') return ruta.fulfill(conTexto('Hecho.', ultimo.id));
    return ruta.fulfill(conHerramientas(guion[siguiente++]!));
  });
  await page.goto('/');
  await esperarHidratacion(page);

  const entrada = page.getByLabel('Pregunta al tutor');
  const enviar = page.getByRole('button', { name: 'Enviar' });
  await entrada.fill('Muéstrame una ley');
  await enviar.click();
  await expect(page.getByRole('link', { name: 'Abrir órbita Lagrange' })).toHaveAttribute(
    'href',
    '/orbitas/lagrange',
  );
  await expect(deslizador(page, 'Distancia')).toHaveValue('2');
  expect(await leyActual(page)).toEqual({ m1: 8, m2: 2, r: 2 });

  await entrada.fill('Ahora algo imposible');
  await expect(enviar).toBeEnabled({ timeout: 10_000 });
  await enviar.click();
  await expect.poll(() => siguiente).toBe(2);
  await expect(page.getByText('Hecho.').last()).toBeVisible();
  expect(await leyActual(page)).toEqual({ m1: 8, m2: 2, r: 2 });
});

function archivosJs(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith('.js'))
    .map((e) => join(e.parentPath, e.name));
}

test('GRV-05 · criterio 11: GET /api/tutor solo devuelve { modo } y la clave no llega al cliente', async ({
  request,
}) => {
  const respuesta = await request.get('/api/tutor');
  expect(respuesta.status()).toBe(200);
  expect(Object.keys(await respuesta.json())).toEqual(['modo']);

  expect(await (await request.get('/')).text()).not.toContain('GOOGLE_GENERATIVE_AI_API_KEY');
  const scripts = archivosJs(join(process.cwd(), '.next', 'static'));
  expect(scripts.length).toBeGreaterThan(0);
  for (const archivo of scripts) {
    expect(readFileSync(archivo, 'utf8'), archivo).not.toContain('GOOGLE_GENERATIVE_AI_API_KEY');
  }
});

test('GRV-05 · criterio 12: la portada no desborda a 375, 768 y 1440 px y conserva hero, ley y galería', async ({
  page,
}) => {
  for (const [ancho, alto] of [
    [375, 800],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width: ancho, height: alto });
    await page.goto('/');
    await esperarHidratacion(page);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#ley')).toBeAttached();
    await expect(page.locator('#galeria')).toBeAttached();
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda, `${ancho} px`).toBe(false);
  }
});

test('GRV-06 · navegación de la portada: enlaces de cabecera, sección activa y llamadas a la acción', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await esperarHidratacion(page);
  const cabecera = page.getByRole('banner');
  for (const [nombre, href] of [
    ['Historia', '/#historia'],
    ['La ley', '/#ley'],
    ['Órbitas', '/#galeria'],
    ['Tutor', '/#tutor'],
  ] as const) {
    await expect(cabecera.getByRole('link', { name: nombre, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  }
  await expect(cabecera.getByRole('link', { name: 'Comenzar' })).toHaveAttribute('href', '/#ley');
  await expect(cabecera.locator('[aria-current="true"]')).toHaveCount(0);

  await page.evaluate(() => document.querySelector('#galeria')!.scrollIntoView());
  await expect(cabecera.locator('[aria-current="true"]')).toHaveText('Órbitas');

  const enlaceA = (nombre: string, href: string) =>
    expect(page.getByRole('link', { name: nombre, exact: true })).toHaveAttribute('href', href);
  await enlaceA('Explorar ahora', '#galeria');
  await enlaceA('Ver las órbitas', '#galeria');
  await enlaceA('Hablar con el tutor', '#tutor');
  await enlaceA('Volver a la ley', '#ley');
  await enlaceA('Comenzar ahora', '#ley');
  await expect(page.getByRole('heading', { name: 'El universo te está esperando.' })).toBeVisible();
});

test('GRV-06 · la historia se despliega hito a hito: el primero abierto y al abrir otro se cierra el anterior', async ({
  page,
}) => {
  await page.goto('/');
  const hitos = page.locator('#historia details');
  await expect(hitos).toHaveCount(6);
  await expect(hitos.nth(0)).toHaveAttribute('open', '');
  await hitos.nth(1).locator('summary').click();
  await expect(hitos.nth(1)).toHaveAttribute('open', '');
  await expect(hitos.nth(0)).not.toHaveAttribute('open', '');
  await hitos.nth(1).locator('summary').click();
  await expect(hitos.nth(1)).not.toHaveAttribute('open', '');
});
