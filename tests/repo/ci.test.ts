import { describe, expect, it } from 'vitest';
import { existe, leer } from './utils';

const flujo = '.github/workflows/ci.yml';

const sinComentarios = () =>
  leer(flujo)
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('#'))
    .join('\n');

const comandos = () =>
  [...sinComentarios().matchAll(/^\s*-\s*run:\s*(.+)$/gm)].map((coincidencia) =>
    (coincidencia[1] ?? '').trim(),
  );

describe('GRV-01 · criterio 7: CI en cada PR', () => {
  it('existe el workflow de CI', () => {
    expect(existe(flujo)).toBe(true);
  });

  it('se ejecuta en los PR hacia develop y main', () => {
    const ramas = sinComentarios().match(/pull_request:\s*\n\s*branches:\s*\[([^\]]*)\]/)?.[1];
    expect(ramas).toBeDefined();
    expect(ramas).toContain('develop');
    expect(ramas).toContain('main');
  });

  it.each([
    'npm ci',
    'npm run lint',
    'npm run typecheck',
    'npm run format:check',
    'npm test',
    'npm run build',
    'npm run test:e2e',
    'npm run comprobar:commits',
  ])('ejecuta %s en un paso activo', (comando) => {
    const activo = comandos().some((paso) => paso === comando || paso.startsWith(`${comando} `));
    expect(activo).toBe(true);
  });
});
