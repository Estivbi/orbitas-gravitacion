import { describe, expect, it } from 'vitest';
import { archivosVersionados, existe, leer, leerJson } from './utils';

interface Paquete {
  scripts?: Record<string, string>;
  engines?: { node?: string };
}

describe('GRV-01 · criterio 3: solo npm', () => {
  it('versiona package-lock.json', () => {
    expect(archivosVersionados()).toContain('package-lock.json');
  });

  it.each(['yarn.lock', 'pnpm-lock.yaml'])('no versiona %s', (archivo) => {
    expect(archivosVersionados()).not.toContain(archivo);
  });
});

describe('GRV-01 · criterios 1 y 4: contrato de scripts y de Node', () => {
  const requeridos = [
    'dev',
    'build',
    'start',
    'lint',
    'format',
    'format:check',
    'typecheck',
    'test',
    'test:e2e',
    'comprobar:commits',
  ];

  it.each(requeridos)('define el script %s', (nombre) => {
    expect(leerJson<Paquete>('package.json').scripts?.[nombre]).toBeTruthy();
  });

  it('exige Node 22 o superior en engines', () => {
    expect(leerJson<Paquete>('package.json').engines?.node).toMatch(/^>=\s?22/);
  });

  it('fija Node 22 en .nvmrc', () => {
    expect(existe('.nvmrc')).toBe(true);
    expect(leer('.nvmrc').trim()).toMatch(/^22(\.|$)/);
  });
});
