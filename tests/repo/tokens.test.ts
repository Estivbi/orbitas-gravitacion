import { describe, expect, it } from 'vitest';
import { leer } from './utils';

describe('GRV-01 · criterio 10: tokens de DESIGN.md y @theme coinciden', () => {
  const tokens = [
    ...leer('src/app/globals.css').matchAll(/(--color-[a-z-]+):\s*(#[0-9a-fA-F]{6})/g),
  ].map(([, nombre, valor]) => [nombre ?? '', (valor ?? '').toLowerCase()] as const);

  it('@theme define los ocho colores del sistema visual', () => {
    expect(tokens).toHaveLength(8);
  });

  it.each(tokens)('DESIGN.md documenta %s con el valor %s', (nombre, valor) => {
    const fila = leer('DESIGN.md')
      .split('\n')
      .find((linea) => linea.includes(`\`${nombre}\``));
    expect(fila?.toLowerCase()).toContain(valor);
  });
});
