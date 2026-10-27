#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TIPOS = ['feat', 'fix', 'test', 'docs', 'refactor', 'chore', 'ci', 'build'];
const CABECERA = new RegExp(`^(${TIPOS.join('|')})\\(GRV-\\d{2,}\\): \\S`);
const FUSION = /^Merge (branch|remote-tracking branch|pull request) /;
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

function leerAsuntos(rango) {
  const salida = execFileSync('git', ['log', '--format=%s%x00', '--end-of-options', rango], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return salida
    .split('\0')
    .slice(0, -1)
    .map((asunto) => asunto.trim());
}

function comprobarRango(rango) {
  let asuntos;
  try {
    asuntos = leerAsuntos(rango);
  } catch (error) {
    const detalle = String(error.stderr ?? error.message)
      .trim()
      .split('\n')[0];
    console.error(`No se pudo leer el rango «${rango}»: ${detalle}`);
    return 2;
  }

  const errores = asuntos
    .map((asunto) => ({ asunto, ...validarMensaje(asunto) }))
    .filter((resultado) => !resultado.valido);

  for (const { asunto, motivo } of errores) {
    console.error(`✗ «${asunto}»: ${motivo}`);
  }
  if (errores.length > 0) {
    return 1;
  }

  const unidad = asuntos.length === 1 ? 'commit comprobado' : 'commits comprobados';
  console.log(`${asuntos.length} ${unidad} en ${rango}`);
  return 0;
}

const esEjecucionDirecta =
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));

if (esEjecucionDirecta) {
  process.exit(comprobarRango(process.argv[2] ?? RANGO_POR_DEFECTO));
}
