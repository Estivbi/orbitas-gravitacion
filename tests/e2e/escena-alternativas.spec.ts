import { expect, test } from '@playwright/test';
import { CONTENEDOR, esperarEstado, sinWebgl } from './ayudas';

function vigilarErrores(page: import('@playwright/test').Page): string[] {
  const errores: string[] = [];
  page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`));
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error' && !mensaje.text().includes('Failed to load resource')) {
      errores.push(`consola: ${mensaje.text()}`);
    }
  });
  return errores;
}

test.describe('GRV-03 · criterio 17: estados alternativos', () => {
  test('sin WebGL2 se queda la miniatura con un aviso y sin errores', async ({ page }) => {
    await page.addInitScript(sinWebgl);
    const errores = vigilarErrores(page);

    await page.goto('/');
    await esperarEstado(page, 'sin-webgl');

    const contenedor = page.locator(CONTENEDOR);
    await expect(contenedor.locator('svg').first()).toBeVisible();
    await expect(contenedor.locator('canvas')).toHaveCount(0);
    const aviso = contenedor.getByRole('status');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText(/escena 3D/i);
    await expect(page.getByRole('button', { name: /animación/i })).toHaveCount(0);

    expect(errores).toEqual([]);
  });

  test('si el Worker no carga, el estado es error y la miniatura sigue visible', async ({
    page,
  }) => {
    // Se sustituye window.Worker por una clase que emite `error`, en vez de abortar la petición del
    // Worker con page.route: la URL de su chunk lleva un hash que cambia en cada compilación y
    // Playwright no distingue las peticiones de Worker de las de otros scripts.
    await page.addInitScript(() => {
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
    });

    await page.goto('/');
    await esperarEstado(page, 'error');

    const contenedor = page.locator(CONTENEDOR);
    await expect(contenedor.locator('svg').first()).toBeVisible();
    const aviso = contenedor.getByRole('status');
    await expect(aviso).toBeVisible();
    expect((await aviso.innerText()).trim().length).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: /animación/i })).toHaveCount(0);
  });
});
