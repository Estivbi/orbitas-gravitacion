#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TIPOS = ['feat', 'fix', 'test', 'docs', 'refactor', 'chore', 'ci', 'build'];
const CABECERA = new RegExp(`^(${TIPOS.join('|')})\\(GRV-\\d{2,}\\): \\S`);
const FUSION = /^Merge /;
const RANGO_POR_DEFECTO = 'origin/develop..HEAD';

export function validarMensaje(mensaje) {
  const cabecera = mensaje.split('\n')[0] ?? '';
  if (FUSION.test(cabecera) || CABECERA.test(cabecera)) {
    return { valido: true };
  }
  return {
    valido: false,
    motivo: `se esperaba «tipo(GRV-xx): descripción» con tipo en ${TIPOS.join(', ')}`,
  };
}

function comprobarRango(rango) {
  const salida = execFileSync('git', ['log', '--format=%s%x00', rango], { encoding: 'utf8' });
  const cabeceras = salida
    .split('\0')
    .map((linea) => linea.trim())
    .filter(Boolean);
  const errores = cabeceras
    .map((cabecera) => ({ cabecera, ...validarMensaje(cabecera) }))
    .filter((resultado) => !resultado.valido);

  for (const { cabecera, motivo } of errores) {
    console.error(`✗ «${cabecera}»: ${motivo}`);
  }
  return errores.length === 0;
}

const esEjecucionDirecta =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (esEjecucionDirecta) {
  const rango = process.argv[2] ?? RANGO_POR_DEFECTO;
  process.exit(comprobarRango(rango) ? 0 : 1);
}
