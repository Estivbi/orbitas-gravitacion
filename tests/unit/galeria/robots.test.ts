import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('GRV-06 · criterio 1: robots.txt', () => {
  it('permite todo y apunta al sitemap con la URL del sitio', () => {
    const resultado = robots();
    expect(resultado.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(resultado.sitemap).toMatch(/^https?:\/\/[^/]+\/sitemap\.xml$/);
  });
});
