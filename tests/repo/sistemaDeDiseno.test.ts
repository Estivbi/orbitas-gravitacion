import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { leer, raiz } from './utils';

const css = leer('src/app/globals.css');
const bloqueTema = /@theme static\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';

const TAMANOS = [
  'etiqueta',
  'cuerpo',
  'titular-xs',
  'subtitulo',
  'titular-sm',
  'titular',
  'titular-lg',
  'display',
];

const COLORES = [
  'void',
  'bone-white',
  'ash-gray',
  'silver-mist',
  'electric-iris',
  'saffron-spark',
  'deep-verdant',
  'orbit-teal',
];

const TOKENS_ESPERADOS = [
  ...COLORES.map((c) => `--color-${c}`),
  '--font-sans',
  ...TAMANOS.flatMap((t) => [
    `--text-${t}`,
    `--text-${t}--line-height`,
    `--text-${t}--letter-spacing`,
  ]),
  '--spacing',
  '--radius-boton',
  '--container-pagina',
];

function declaraciones(): Map<string, string> {
  return new Map(
    [...bloqueTema.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(
      ([, nombre, valor]) => [nombre ?? '', (valor ?? '').trim()] as const,
    ),
  );
}

function archivosDe(carpeta: string): string[] {
  const ruta = join(raiz, carpeta);
  try {
    return readdirSync(ruta).flatMap((nombre) => {
      const relativa = `${carpeta}/${nombre}`;
      return statSync(join(raiz, relativa)).isDirectory() ? archivosDe(relativa) : [relativa];
    });
  } catch {
    return [];
  }
}

describe('GRV-03 · criterio 1: tokens completos', () => {
  it('el tema se declara con @theme static', () => {
    expect(bloqueTema.length).toBeGreaterThan(0);
  });

  it.each(TOKENS_ESPERADOS)('@theme static define %s', (nombre) => {
    expect(declaraciones().has(nombre)).toBe(true);
  });

  it('el espaciado base es de 6 px y el radio y el ancho máximo son los del diseño', () => {
    const valores = declaraciones();
    expect(valores.get('--spacing')).toBe('6px');
    expect(valores.get('--radius-boton')).toBe('24px');
    expect(valores.get('--container-pagina')).toBe('1280px');
  });

  it.each(TOKENS_ESPERADOS)('DESIGN.md documenta %s con su valor', (nombre) => {
    const valor = declaraciones().get(nombre) ?? '';
    const fila = leer('DESIGN.md')
      .split('\n')
      .find((linea) => linea.includes(`\`${nombre}\``));
    expect(fila).toBeDefined();
    if (/^(#[0-9a-fA-F]{6}|\d+(\.\d+)?px)$/.test(valor)) {
      const numero = valor.replace(/px$/, '');
      const patron = valor.startsWith('#') ? valor.toLowerCase() : `${numero}\\s?px`;
      expect((fila ?? '').toLowerCase()).toMatch(new RegExp(patron));
    }
  });

  it.each(['src/components/escena', 'src/lib/escena'])(
    '%s existe y no contiene colores hexadecimales',
    (carpeta) => {
      const fuentes = archivosDe(carpeta).filter((ruta) => /\.(ts|tsx)$/.test(ruta));
      expect(fuentes.length).toBeGreaterThan(0);
      const conColor = fuentes.filter((ruta) =>
        /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/.test(leer(ruta)),
      );
      expect(conColor).toEqual([]);
    },
  );
});

describe('GRV-03 · criterio 2: fuente local', () => {
  it('src no usa next/font/google ni googleapis', () => {
    const fuentes = archivosDe('src').filter((ruta) => /\.(ts|tsx|css)$/.test(ruta));
    const infractores = fuentes.filter((ruta) => /next\/font\/google|googleapis/.test(leer(ruta)));
    expect(infractores).toEqual([]);
  });

  it('el layout carga la fuente con next/font/local', () => {
    expect(leer('src/app/layout.tsx')).toContain('next/font/local');
  });
});
