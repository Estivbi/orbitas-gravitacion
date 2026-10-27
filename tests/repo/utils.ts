import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const raiz = fileURLToPath(new URL('../..', import.meta.url));

export function archivosVersionados(): string[] {
  return execFileSync('git', ['ls-files'], { cwd: raiz, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

export function existe(ruta: string): boolean {
  return existsSync(join(raiz, ruta));
}

export function leer(ruta: string): string {
  return readFileSync(join(raiz, ruta), 'utf8');
}

export function leerJson<T>(ruta: string): T {
  return JSON.parse(leer(ruta)) as T;
}

export function estaIgnorado(ruta: string): boolean {
  return spawnSync('git', ['check-ignore', '-q', ruta], { cwd: raiz }).status === 0;
}
