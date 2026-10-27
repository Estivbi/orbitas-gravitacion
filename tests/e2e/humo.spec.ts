import { expect, test } from '@playwright/test';

test.describe('GRV-01 · criterio 6: prueba de humo E2E', () => {
  test('la portada responde con idioma, titular y fondo negro', async ({ page }) => {
    const respuesta = await page.goto('/');

    expect(respuesta?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const fondo = await page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(fondo).toBe('rgb(0, 0, 0)');
  });

  test('las clases utilitarias de Tailwind se aplican con los tokens', async ({ page }) => {
    await page.goto('/');

    const etiqueta = page.getByText('Gravitación universal');
    const color = await etiqueta.evaluate((el) => getComputedStyle(el).color);
    expect(color).toBe('rgb(255, 184, 41)');

    const peso = await page
      .getByRole('heading', { level: 1 })
      .evaluate((el) => getComputedStyle(el).fontWeight);
    expect(peso).toBe('400');
  });
});
