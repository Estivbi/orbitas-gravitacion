import { describe, expect, it } from 'vitest';
import { existe, leer } from './utils';

const flujo = '.github/workflows/ci.yml';

describe('GRV-01 · criterio 7: CI en cada PR', () => {
  it('existe el workflow de CI', () => {
    expect(existe(flujo)).toBe(true);
  });

  it('se ejecuta en los PR hacia develop y main', () => {
    const texto = leer(flujo);
    expect(texto).toContain('pull_request');
    expect(texto).toContain('develop');
    expect(texto).toContain('main');
  });

  it.each([
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run format:check',
    'npm test',
    'npm run build',
    'npm run comprobar:commits',
  ])('ejecuta %s', (comando) => {
    expect(leer(flujo)).toContain(comando);
  });
});
