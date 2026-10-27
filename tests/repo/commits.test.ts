import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
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
    "Merge remote-tracking branch 'origin/develop' into feature/motor-de-fisica",
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
    ['fusión que no es de rama ni de PR', 'Merge cualquier cosa sin ticket'],
  ])('rechaza un mensaje %s', (_caso, mensaje) => {
    const resultado = validarMensaje(mensaje);
    expect(resultado.valido).toBe(false);
    expect(resultado.motivo).toBeTruthy();
  });
});

describe('GRV-01 · criterio 8: formato de commits (rango de un PR)', () => {
  const repos: string[] = [];

  const git = (dir: string, ...args: string[]) =>
    spawnSync(
      'git',
      [
        '-c',
        'user.name=Prueba',
        '-c',
        'user.email=prueba@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args,
      ],
      { cwd: dir, encoding: 'utf8' },
    );

  const crearRepo = (mensajes: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'grv01-commits-'));
    repos.push(dir);
    git(dir, 'init', '-q');
    for (const mensaje of mensajes) {
      git(dir, 'commit', '-q', '--allow-empty', '--allow-empty-message', '-m', mensaje);
    }
    return dir;
  };

  const comprobar = (dir: string, rango: string) =>
    spawnSync('node', [join(raiz, 'scripts', 'comprobar-commits.mjs'), rango], {
      cwd: dir,
      encoding: 'utf8',
    });

  afterAll(() => {
    for (const dir of repos) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('termina bien si todos los commits del rango son válidos', () => {
    const dir = crearRepo([
      'chore(GRV-01): iniciar el repositorio',
      'feat(GRV-01): crear la página mínima',
    ]);
    const resultado = comprobar(dir, 'HEAD~1..HEAD');
    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain('1 commit');
  });

  it('falla y nombra el commit que no cumple', () => {
    const dir = crearRepo(['chore(GRV-01): iniciar el repositorio', 'arreglos varios']);
    const resultado = comprobar(dir, 'HEAD~1..HEAD');
    expect(resultado.status).toBe(1);
    expect(resultado.stderr).toContain('arreglos varios');
  });

  it('falla con un commit de asunto vacío', () => {
    const dir = crearRepo(['chore(GRV-01): iniciar el repositorio', '']);
    expect(comprobar(dir, 'HEAD~1..HEAD').status).toBe(1);
  });

  it('avisa de que no hay commits que comprobar en un rango vacío', () => {
    const dir = crearRepo(['chore(GRV-01): iniciar el repositorio']);
    const resultado = comprobar(dir, 'HEAD..HEAD');
    expect(resultado.status).toBe(0);
    expect(resultado.stdout).toContain('0 commits');
  });

  it('explica con claridad un rango que no existe', () => {
    const dir = crearRepo(['chore(GRV-01): iniciar el repositorio']);
    const resultado = comprobar(dir, 'no-existe..HEAD');
    expect(resultado.status).toBe(2);
    expect(resultado.stderr).toContain('rango');
    expect(resultado.stderr).not.toContain('node:internal');
  });

  it('no trata un argumento con forma de opción como opción de git', () => {
    const dir = crearRepo(['chore(GRV-01): iniciar el repositorio']);
    const resultado = comprobar(dir, '--version');
    expect(resultado.status).toBe(2);
    expect(resultado.stdout).not.toContain('git version');
  });
});
