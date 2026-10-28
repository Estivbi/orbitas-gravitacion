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

/** Tamaños de texto fijos en px; titular-lg y display usan clamp. */
const TAMANOS_EN_PX: [string, string][] = [
  ['etiqueta', '14px'],
  ['cuerpo', '18px'],
  ['titular-xs', '27px'],
  ['subtitulo', '36px'],
  ['titular-sm', '42px'],
  ['titular', '48px'],
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

/** Literales de color en código: #rgb, #rrggbb, #rrggbbaa, 0xRRGGBB, rgb(, rgba(, hsl( y hsla(. */
const COLOR_LITERAL =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|\b0x[0-9a-fA-F]{6}\b|\b(?:rgba?|hsla?)\s*\(/i;

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

  it.each(TAMANOS_EN_PX)('el tamaño de texto %s vale %s', (tamano, valor) => {
    expect(declaraciones().get(`--text-${tamano}`)).toBe(valor);
  });

  it.each([
    ['titular-lg', '78px'],
    ['display', '113px'],
  ])('--text-%s usa clamp desde 46 px en móvil hasta %s en escritorio', (tamano, maximo) => {
    const valor = declaraciones().get(`--text-${tamano}`) ?? '';
    expect(valor).toMatch(/^clamp\(/);
    expect(valor).toContain('46px');
    expect(valor).toContain(maximo);
  });

  // Los colores ya los cubre tests/repo/tokens.test.ts: aquí solo los tokens nuevos.
  it.each(TOKENS_ESPERADOS.filter((nombre) => !nombre.startsWith('--color-')))(
    'DESIGN.md documenta %s con su valor',
    (nombre) => {
      const valor = declaraciones().get(nombre) ?? '';
      const fila = leer('DESIGN.md')
        .split('\n')
        .find((linea) => linea.includes(`\`${nombre}\``));
      expect(fila).toBeDefined();
      if (/^\d+(\.\d+)?px$/.test(valor)) {
        const numero = valor.replace(/px$/, '');
        expect((fila ?? '').toLowerCase()).toMatch(new RegExp(`(?<![\\d.])${numero}\\s?px`));
      }
    },
  );

  it('la expresión de colores literales detecta todas las formas y no da falsos positivos', () => {
    for (const literal of [
      "'#fff'",
      "'#8052ff'",
      "'#8052ff80'",
      'new Color(0x8052ff)',
      'rgb(1, 2, 3)',
      'rgba(0,0,0,0.5)',
      'hsl(10 20% 30%)',
      'hsla(10, 20%, 30%, 1)',
    ]) {
      expect(COLOR_LITERAL.test(literal), literal).toBe(true);
    }
    for (const limpio of [
      "getPropertyValue('--color-void')",
      'const semilla = 0x6d2b79f5',
      'document.getElementById("contenido")',
      "href='#contenido'",
    ]) {
      expect(COLOR_LITERAL.test(limpio), limpio).toBe(false);
    }
  });

  it.each(['src/components/escena', 'src/lib/escena'])(
    '%s existe y no contiene colores literales',
    (carpeta) => {
      const fuentes = archivosDe(carpeta).filter((ruta) => /\.(ts|tsx)$/.test(ruta));
      expect(fuentes.length).toBeGreaterThan(0);
      const conColor = fuentes.filter((ruta) => COLOR_LITERAL.test(leer(ruta)));
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
