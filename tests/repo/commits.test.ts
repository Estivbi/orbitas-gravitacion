import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validarMensaje } from '../../scripts/comprobar-commits.mjs';
import { raiz } from './utils';

describe('GRV-01 · criterio 8: formato de commits (mensajes)', () => {
  it.each([
    'feat(GRV-01): crear la página mínima',
    'test(GRV-02): comprobar que la energía se conserva',
    'fix(GRV-04): corregir el estado al volver a la galería',
    'docs(GRV-01): redactar la spec de la base del repositorio',
    'chore(GRV-01): ignorar docs/privado, entorno y compilación',
    'refactor(GRV-03): extraer la creación de estelas',
    'ci(GRV-01): añadir el workflow de integración continua',
    'build(GRV-07): preparar la imagen de Docker',
    "Merge branch 'develop' into feature/motor-de-fisica",
    'Merge pull request #3 from Estivbi/feature/base-del-repositorio',
  ])('acepta «%s»', (mensaje) => {
    expect(validarMensaje(mensaje).valido).toBe(true);
  });

  it.each([
    ['sin tipo ni ticket', 'arreglos varios'],
    ['sin ámbito', 'feat: crear la página mínima'],
    ['tipo fuera de la lista', 'wip(GRV-01): probando cosas'],
    ['ámbito que no es un ticket', 'feat(core): crear la página'],
    ['ticket en minúsculas', 'feat(grv-01): crear la página'],
    ['sin descripción', 'feat(GRV-01):'],
    ['sin espacio tras los dos puntos', 'feat(GRV-01):crear la página'],
    ['mensaje vacío', ''],
  ])('rechaza un mensaje %s', (_caso, mensaje) => {
    const resultado = validarMensaje(mensaje);
    expect(resultado.valido).toBe(false);
    expect(resultado.motivo).toBeTruthy();
  });
});

describe('GRV-01 · criterio 8: formato de commits (rango de un PR)', () => {
  let repo = '';

  const git = (...args: string[]) =>
    spawnSync(
      'git',
      ['-c', 'user.name=Prueba', '-c', 'user.email=prueba@example.com', '-c', 'commit.gpgsign=false', ...args],
      { cwd: repo, encoding: 'utf8' },
    );

  const comprobar = (rango: string) =>
    spawnSync('node', [join(raiz, 'scripts', 'comprobar-commits.mjs'), rango], {
      cwd: repo,
      encoding: 'utf8',
    });

  beforeAll(() => {
    repo = mkdtempSync(join(tmpdir(), 'grv01-commits-'));
    git('init', '-q');
    git('commit', '-q', '--allow-empty', '-m', 'chore(GRV-01): iniciar el repositorio');
    git('commit', '-q', '--allow-empty', '-m', 'feat(GRV-01): crear la página mínima');
    git('commit', '-q', '--allow-empty', '-m', 'arreglos varios');
  });

  afterAll(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('termina bien si todos los commits del rango son válidos', () => {
    expect(comprobar('HEAD~2..HEAD~1').status).toBe(0);
  });

  it('falla y nombra el commit que no cumple', () => {
    const resultado = comprobar('HEAD~2..HEAD');
    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain('arreglos varios');
  });
});
