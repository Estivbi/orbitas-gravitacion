import { expect, test, type Page } from '@playwright/test';
import { PASOS_RECORRIDO, TOTAL_PASOS } from '../../src/lib/recorrido/pasos';
import { esperarHidratacion } from './ayudas';

test.use({ actionTimeout: 20_000 });

const tarjeta = (page: Page) => page.getByRole('dialog');
const botonGuia = (page: Page) => page.getByRole('button', { name: 'Guía', exact: true });

async function abrirPortada(page: Page) {
  await page.goto('/');
  await esperarHidratacion(page);
}

test('GRV-08 · criterios 1 y 2: la visita no se abre sola y «Guía» y la invitación la abren en el paso 1', async ({
  page,
}) => {
  await abrirPortada(page);
  for (const { id } of PASOS_RECORRIDO) {
    await expect(page.locator(`[data-recorrido="${id}"]`)).toHaveCount(1);
  }
  await expect(tarjeta(page)).toHaveCount(0);

  await botonGuia(page).click();
  await expect(tarjeta(page)).toBeVisible();
  await expect(tarjeta(page)).toContainText(`Paso 1 de ${TOTAL_PASOS}`);
  await expect(tarjeta(page)).toContainText(PASOS_RECORRIDO[0]!.titulo);
  await expect(page.locator('[data-recorrido="bienvenida"]')).toHaveAttribute(
    'data-recorrido-activo',
    'true',
  );

  await page.keyboard.press('Escape');
  await expect(tarjeta(page)).toHaveCount(0);
  await page.getByRole('button', { name: /visita guiada/i }).click();
  await expect(tarjeta(page)).toContainText(`Paso 1 de ${TOTAL_PASOS}`);
});

test('GRV-08 · criterio 3: Siguiente y Anterior cambian el paso y el resalte, y el último pasa a «Terminar»', async ({
  page,
}) => {
  await abrirPortada(page);
  await botonGuia(page).click();
  const anterior = tarjeta(page).getByRole('button', { name: 'Anterior' });
  await expect(anterior).toBeDisabled();

  for (let i = 1; i < TOTAL_PASOS; i++) {
    await tarjeta(page).getByRole('button', { name: 'Siguiente' }).click();
    await expect(tarjeta(page)).toContainText(`Paso ${i + 1} de ${TOTAL_PASOS}`);
    await expect(tarjeta(page)).toContainText(PASOS_RECORRIDO[i]!.titulo);
    await expect(page.locator('[data-recorrido-activo="true"]')).toHaveCount(1);
    await expect(page.locator(`[data-recorrido="${PASOS_RECORRIDO[i]!.id}"]`)).toHaveAttribute(
      'data-recorrido-activo',
      'true',
    );
  }
  await expect(tarjeta(page).getByRole('button', { name: 'Siguiente' })).toHaveCount(0);
  await expect(tarjeta(page).getByRole('button', { name: 'Terminar' })).toBeVisible();

  await anterior.click();
  await expect(tarjeta(page)).toContainText(`Paso ${TOTAL_PASOS - 1} de ${TOTAL_PASOS}`);
  await expect(page.locator('[data-recorrido-activo="true"]')).toHaveCount(1);
});

test('GRV-08 · criterio 4: Saltar, Terminar y Escape cierran, quitan el resalte y devuelven el foco', async ({
  page,
}) => {
  await abrirPortada(page);
  const cerrar = [
    () => tarjeta(page).getByRole('button', { name: 'Saltar' }).click(),
    () => page.keyboard.press('Escape'),
    async () => {
      for (let i = 1; i < TOTAL_PASOS; i++) {
        await tarjeta(page).getByRole('button', { name: 'Siguiente' }).click();
      }
      await tarjeta(page).getByRole('button', { name: 'Terminar' }).click();
    },
  ];
  for (const accion of cerrar) {
    await botonGuia(page).click();
    await expect(tarjeta(page)).toBeVisible();
    await accion();
    await expect(tarjeta(page)).toHaveCount(0);
    await expect(page.locator('[data-recorrido-activo]')).toHaveCount(0);
    await expect(botonGuia(page)).toBeFocused();
  }
});

test('GRV-08 · criterio 5: la tarjeta es un diálogo con nombre, recibe el foco y respeta el movimiento reducido', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Element.prototype.scrollIntoView;
    (window as unknown as { __desplazamientos: unknown[] }).__desplazamientos = [];
    Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) {
      (window as unknown as { __desplazamientos: unknown[] }).__desplazamientos.push(
        typeof arg === 'object' ? (arg.behavior ?? 'auto') : 'auto',
      );
      return original.call(this, arg as ScrollIntoViewOptions);
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await abrirPortada(page);
  await botonGuia(page).click();

  await expect(tarjeta(page)).toHaveAccessibleName(PASOS_RECORRIDO[0]!.titulo);
  await expect(tarjeta(page)).not.toHaveAttribute('aria-modal', 'true');
  expect(
    await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null),
  ).toBe(true);

  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(tarjeta(page)).toContainText(`Paso 2 de ${TOTAL_PASOS}`);

  const modos = await page.evaluate(
    () => (window as unknown as { __desplazamientos: string[] }).__desplazamientos,
  );
  expect(modos.length).toBeGreaterThan(0);
  expect(modos.every((modo) => modo !== 'smooth')).toBe(true);
});

for (const ancho of [375, 768, 1440]) {
  test(`GRV-08 · criterio 6: a ${ancho} px no desborda y la tarjeta cabe en pantalla sin tapar la sección`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: ancho, height: ancho === 375 ? 740 : 800 });
    await abrirPortada(page);
    if (ancho === 375) await page.getByRole('button', { name: 'Menú' }).click();
    await botonGuia(page).click();
    await tarjeta(page).getByRole('button', { name: 'Siguiente' }).click();
    await tarjeta(page).getByRole('button', { name: 'Siguiente' }).click();
    await expect(tarjeta(page)).toContainText('Paso 3');

    const medidas = await page.evaluate(() => ({
      desborde: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      alto: window.innerHeight,
    }));
    expect(medidas.desborde).toBeLessThanOrEqual(0);

    const caja = (await tarjeta(page).boundingBox())!;
    expect(caja.y).toBeGreaterThanOrEqual(0);
    expect(caja.y + caja.height).toBeLessThanOrEqual(medidas.alto + 1);
    expect(caja.height).toBeLessThanOrEqual(medidas.alto * 0.6);
    expect(caja.width).toBeLessThanOrEqual(ancho);

    const titulo = page.locator('[data-recorrido="ley"] h2');
    const cajaTitulo = (await titulo.boundingBox())!;
    const tapado =
      cajaTitulo.y >= caja.y && cajaTitulo.y + cajaTitulo.height <= caja.y + caja.height;
    expect(tapado).toBe(false);
  });
}
