import { describe, expect, it, vi } from 'vitest';

// Vitest no ejecuta next/font/local fuera de Next: se sustituye por una fuente de mentira.
vi.mock('next/font/local', () => ({
  default: () => ({ className: 'f', variable: 'v', style: {} }),
}));

import { metadata } from '../../../src/app/layout';
import { resolverUrlSitio } from '../../../src/lib/galeria/sitio';

describe('GRV-04 · criterio 35: el layout conserva su contrato y añade metadataBase', () => {
  it('el título sigue siendo una cadena (GRV-01) y la descripción no está vacía', () => {
    expect(typeof metadata.title).toBe('string');
    expect(metadata.title).toBe('Órbitas');
    expect(metadata.description?.length ?? 0).toBeGreaterThan(0);
  });

  it('metadataBase es el origen que resuelve URL_SITIO', () => {
    expect(metadata.metadataBase).toBeInstanceOf(URL);
    expect((metadata.metadataBase as URL).origin).toBe(resolverUrlSitio(process.env).origin);
  });
});
