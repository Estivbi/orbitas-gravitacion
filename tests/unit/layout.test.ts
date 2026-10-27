import { describe, expect, it } from 'vitest';
import { metadata } from '../../src/app/layout';

describe('GRV-01 · criterio 5: prueba de humo unitaria', () => {
  it('el layout declara título y descripción', () => {
    expect(typeof metadata.title).toBe('string');
    expect(String(metadata.title).length).toBeGreaterThan(0);
    expect(metadata.description?.length ?? 0).toBeGreaterThan(0);
  });
});
