import { describe, expect, it, vi } from 'vitest';

// Vitest no ejecuta next/font/local fuera de Next: se sustituye por una fuente de mentira.
vi.mock('next/font/local', () => ({
  default: () => ({ className: 'f', variable: 'v', style: {} }),
}));

import { metadata } from '../../src/app/layout';

describe('GRV-01 · criterio 5: prueba de humo unitaria', () => {
  it('el layout declara título y descripción', () => {
    expect(typeof metadata.title).toBe('string');
    expect(String(metadata.title).length).toBeGreaterThan(0);
    expect(metadata.description?.length ?? 0).toBeGreaterThan(0);
  });
});
