import { describe, expect, it } from 'vitest';
import { existe, leerJson } from './utils';

interface Tsconfig {
  compilerOptions?: { strict?: boolean; noUncheckedIndexedAccess?: boolean };
}

describe('GRV-01 · criterio 2: tipado estricto', () => {
  it('existe tsconfig.json', () => {
    expect(existe('tsconfig.json')).toBe(true);
  });

  it('activa strict', () => {
    expect(leerJson<Tsconfig>('tsconfig.json').compilerOptions?.strict).toBe(true);
  });

  it('activa noUncheckedIndexedAccess', () => {
    expect(leerJson<Tsconfig>('tsconfig.json').compilerOptions?.noUncheckedIndexedAccess).toBe(
      true,
    );
  });
});
