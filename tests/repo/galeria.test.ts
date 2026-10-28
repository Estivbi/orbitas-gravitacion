import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { existe, leer, leerJson, raiz } from './utils';

/** Archivos de código (ts, tsx) bajo una carpeta, con rutas relativas a la raíz. */
function archivosDe(carpeta: string, extension = /\.(ts|tsx)$/): string[] {
  try {
    return readdirSync(join(raiz, carpeta)).flatMap((nombre) => {
      const relativa = `${carpeta}/${nombre}`;
      return statSync(join(raiz, relativa)).isDirectory()
        ? archivosDe(relativa, extension)
        : extension.test(relativa)
          ? [relativa]
          : [];
    });
  } catch {
    return [];
  }
}

/** Importaciones estáticas, dinámicas y require de un módulo (o de sus subrutas). */
function importa(codigo: string, modulo: string): boolean {
  const nombre = modulo.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  return new RegExp(
    `(?:from\\s*|import\\s*\\(\\s*|import\\s+|require\\s*\\(\\s*)['"]${nombre}(?:/[^'"]*)?['"]`,
  ).test(codigo);
}

/** Código sin comentarios de bloque ni de línea (un «no persiste» en un comentario no es persistencia). */
function sinComentarios(codigo: string): string {
  return codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/.*$/gm, '');
}

/** Persistencia en el navegador: localStorage, sessionStorage, la función persist o su middleware. */
const PERSISTENCIA = /\b(?:localStorage|sessionStorage)\b|\bpersist\s*\(|zustand\/middleware/;

/** La misma expresión de GRV-03 (tests/repo/sistemaDeDiseno.test.ts), aplicada a las carpetas nuevas. */
const COLOR_LITERAL =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|\b0x[0-9a-fA-F]{6}\b|\b(?:rgba?|hsla?)\s*\(/i;

describe('GRV-04 · criterio 10: zustand solo vive en src/store', () => {
  it('la detección de importaciones reconoce todas las formas', () => {
    for (const codigo of [
      "import { create } from 'zustand'",
      'import { createStore } from "zustand/vanilla"',
      "const m = await import('zustand')",
      "const z = require('zustand/shallow')",
      "import 'zustand'",
    ]) {
      expect(importa(codigo, 'zustand'), codigo).toBe(true);
    }
    for (const codigo of [
      "import x from 'zustand-otro'",
      "import x from './zustand'",
      '// zustand',
    ]) {
      expect(importa(codigo, 'zustand'), codigo).toBe(false);
    }
  });

  it('src/store existe y es el único sitio que importa zustand', () => {
    const almacen = archivosDe('src/store');
    expect(almacen.length).toBeGreaterThan(0);
    expect(almacen.some((ruta) => importa(leer(ruta), 'zustand'))).toBe(true);

    const fuera = archivosDe('src')
      .filter((ruta) => !ruta.startsWith('src/store/'))
      .filter((ruta) => importa(leer(ruta), 'zustand'));
    expect(fuera).toEqual([]);
  });

  it('la detección de persistencia ignora los comentarios y reconoce el uso real', () => {
    for (const codigo of [
      '// el estado no persiste tras recargar',
      '/* nada de localStorage\n   ni de sessionStorage */',
      'const persistente = false;',
      'const url = "http://x"; // sessionStorage no',
    ]) {
      expect(sinComentarios(codigo), codigo).not.toMatch(PERSISTENCIA);
    }
    for (const codigo of [
      'window.localStorage.setItem("a", "b");',
      'sessionStorage.clear();',
      'export const useA = create(persist((set) => ({}), { name: "a" }));',
      "import { persist } from 'zustand/middleware';",
      '// nota\nconst x = localStorage;',
    ]) {
      expect(sinComentarios(codigo), codigo).toMatch(PERSISTENCIA);
    }
  });

  it('src/store no usa localStorage, sessionStorage ni persist', () => {
    const almacen = archivosDe('src/store');
    expect(almacen.length).toBeGreaterThan(0);
    for (const ruta of almacen) {
      expect(sinComentarios(leer(ruta)), ruta).not.toMatch(PERSISTENCIA);
    }
  });

  it('src/store no instancia el almacén en el ámbito del módulo', () => {
    const modulo = leer('src/store/almacenInterfaz.ts');
    expect(modulo).not.toMatch(/^export\s+const\s+\w+\s*=\s*(?:create|createStore)\s*[(<]/m);
    expect(modulo).not.toMatch(/^const\s+\w+\s*=\s*crearAlmacenInterfaz\(/m);
  });

  it('package.json declara zustand en dependencies con un rango ^5', () => {
    const paquete = leerJson<{
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    }>('package.json');
    expect(paquete.dependencies?.zustand).toMatch(/^\^5\./);
    expect(paquete.devDependencies?.zustand).toBeUndefined();
  });

  it('el layout raíz envuelve a children en ProveedorAlmacen', () => {
    const layout = leer('src/app/layout.tsx');
    expect(layout).toMatch(
      /import\s*\{\s*ProveedorAlmacen\s*\}\s*from\s*['"][^'"]*ProveedorAlmacen['"]/,
    );
    expect(layout).toMatch(/<ProveedorAlmacen>\s*\{children\}\s*<\/ProveedorAlmacen>/);
  });
});

describe('GRV-04 · criterio 10: sin colores literales en el código nuevo', () => {
  const CARPETAS = [
    'src/components/galeria',
    'src/components/detalle',
    'src/components/comunes',
    'src/store',
    'src/lib/galeria',
  ];

  it.each(CARPETAS)('%s existe y no contiene literales de color', (carpeta) => {
    const fuentes = archivosDe(carpeta);
    expect(fuentes.length).toBeGreaterThan(0);
    expect(fuentes.filter((ruta) => COLOR_LITERAL.test(leer(ruta)))).toEqual([]);
  });

  it('los .tsx de src/app no contienen literales de color', () => {
    const fuentes = archivosDe('src/app', /\.tsx$/);
    expect(fuentes.length).toBeGreaterThan(0);
    expect(fuentes.filter((ruta) => COLOR_LITERAL.test(leer(ruta)))).toEqual([]);
  });
});

describe('GRV-04 · criterio 10: icono, entorno y tema', () => {
  it('src/app/icon.svg es el triángulo de la cabecera con el color del acento', () => {
    expect(existe('src/app/icon.svg')).toBe(true);
    const svg = leer('src/app/icon.svg');
    expect(svg).toContain('<polygon');
    expect(svg).toMatch(/viewBox="0 0 20 19"/);
    expect(svg).toMatch(/points="10,1 19,18 1,18"/);

    const acento = /--color-electric-iris:\s*(#[0-9a-fA-F]{6})/.exec(
      leer('src/app/globals.css'),
    )?.[1];
    expect(acento).toBeDefined();
    const relleno = /<polygon[^>]*\sfill="(#[0-9a-fA-F]{6})"/.exec(svg)?.[1];
    expect(relleno?.toLowerCase()).toBe(acento?.toLowerCase());
  });

  it('.env.example contiene URL_SITIO=http://localhost:3000', () => {
    const lineas = leer('.env.example')
      .split('\n')
      .map((linea) => linea.trim());
    expect(lineas).toContain('URL_SITIO=http://localhost:3000');
  });
});

describe('GRV-04 · criterio 10: reglas de importación de ESLint (lintText)', () => {
  let eslint: ESLint;

  beforeAll(() => {
    eslint = new ESLint({ cwd: raiz });
  });

  /** Mensajes de las reglas de restricción de importaciones para un código en una ruta simulada. */
  async function restricciones(ruta: string, codigo: string) {
    const [resultado] = await eslint.lintText(codigo, { filePath: join(raiz, ruta) });
    return (resultado?.messages ?? []).filter(
      (m) =>
        m.severity === 2 &&
        (m.ruleId === 'no-restricted-imports' || m.ruleId === 'no-restricted-syntax'),
    );
  }

  const THREE = "import { Scene } from 'three';\nexport const escena = Scene;\n";
  const ZUSTAND =
    "import { createStore } from 'zustand/vanilla';\nexport const crear = createStore;\n";
  const ZUSTAND_BARRIL = "import { create } from 'zustand';\nexport const crear = create;\n";
  const THREE_DINAMICO = "export const cargar = () => import('three');\n";
  const ZUSTAND_DINAMICO = "export const cargar = () => import('zustand');\n";
  const BARRIL = "import { SLUGS } from '@/lib/fisica';\nexport const slugs = SLUGS;\n";
  const SOLO_TIPOS = "import type { Slug } from '@/lib/fisica';\nexport type Otro = Slug;\n";
  const TIPOS_Y_METRICAS =
    "import { SLUGS } from '@/lib/fisica/tipos';\nimport { energia } from '@/lib/fisica/metricas';\nexport const x = [SLUGS, energia];\n";

  const TIMEOUT = 60_000;

  describe('three y zustand', () => {
    it.each([
      ['src/app/x.tsx', THREE],
      ['src/app/x.tsx', ZUSTAND],
      ['src/app/x.tsx', ZUSTAND_BARRIL],
      ['src/components/galeria/x.tsx', ZUSTAND],
      ['src/components/detalle/x.tsx', ZUSTAND],
      ['src/components/comunes/x.tsx', ZUSTAND],
      ['src/components/detalle/x.tsx', THREE],
      ['src/components/escena/x.ts', ZUSTAND],
      ['src/components/escena/x.ts', ZUSTAND_BARRIL],
      ['src/store/x.ts', THREE],
      ['src/lib/galeria/orden.ts', ZUSTAND],
      ['tests/unit/x.test.ts', ZUSTAND],
      ['tests/unit/x.test.ts', THREE],
    ])(
      '%s: importar esto da error',
      async (ruta, codigo) => {
        expect((await restricciones(ruta, codigo)).length, `${ruta}\n${codigo}`).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    it.each([
      ['src/components/escena/x.ts', THREE],
      ['src/store/x.ts', ZUSTAND],
      ['src/store/x.ts', ZUSTAND_BARRIL],
    ])(
      '%s: importar esto es válido',
      async (ruta, codigo) => {
        expect(await restricciones(ruta, codigo), `${ruta}\n${codigo}`).toEqual([]);
      },
      TIMEOUT,
    );

    it.each([
      ['src/app/x.tsx', ZUSTAND_DINAMICO],
      ['src/app/x.tsx', THREE_DINAMICO],
      ['src/components/galeria/x.tsx', ZUSTAND_DINAMICO],
      ['src/components/detalle/x.tsx', THREE_DINAMICO],
      ['src/components/escena/x.ts', ZUSTAND_DINAMICO],
      ['src/store/x.ts', THREE_DINAMICO],
    ])(
      '%s: import() dinámico prohibido da error',
      async (ruta, codigo) => {
        expect((await restricciones(ruta, codigo)).length, `${ruta}\n${codigo}`).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    it(
      'import() dinámico de three sigue permitido en la escena',
      async () => {
        expect(await restricciones('src/components/escena/x.ts', THREE_DINAMICO)).toEqual([]);
      },
      TIMEOUT,
    );
  });

  describe('el barril de la física no se importa por valor en el código de cliente', () => {
    const CLIENTE = [
      'src/components/galeria/x.tsx',
      'src/components/galeria/x.ts',
      'src/components/detalle/x.tsx',
      'src/components/comunes/x.tsx',
      'src/store/x.ts',
      'src/lib/galeria/orden.ts',
      'src/lib/galeria/formato.ts',
      'src/lib/galeria/controles.ts',
      'src/lib/galeria/navegacion.ts',
      'src/lib/galeria/telemetria.ts',
    ];

    it.each(CLIENTE)(
      '%s: importar un valor de @/lib/fisica da error',
      async (ruta) => {
        expect((await restricciones(ruta, BARRIL)).length, ruta).toBeGreaterThan(0);
      },
      TIMEOUT,
    );

    it.each(CLIENTE)(
      '%s: solo tipos y los archivos tipos y metricas no dan error',
      async (ruta) => {
        expect(await restricciones(ruta, SOLO_TIPOS), `${ruta} (import type)`).toEqual([]);
        expect(await restricciones(ruta, TIPOS_Y_METRICAS), `${ruta} (tipos y metricas)`).toEqual(
          [],
        );
      },
      TIMEOUT,
    );

    it.each([
      'src/lib/galeria/fichas.ts',
      'src/lib/galeria/sitio.ts',
      'src/lib/galeria/metadatos.ts',
      'src/components/escena/x.ts',
    ])(
      '%s: el barril sigue permitido en el código de servidor y en la escena',
      async (ruta) => {
        expect(await restricciones(ruta, BARRIL), ruta).toEqual([]);
      },
      TIMEOUT,
    );

    it(
      'el bloque del barril repite los patrones de three y de zustand de cada zona',
      async () => {
        // Un bloque posterior sustituye por completo a los anteriores: si olvida repetirlos, estas
        // importaciones, que sí estaban prohibidas, volverían a estar permitidas.
        for (const ruta of ['src/components/galeria/x.tsx', 'src/components/detalle/x.tsx']) {
          expect((await restricciones(ruta, THREE)).length, `${ruta} three`).toBeGreaterThan(0);
          expect((await restricciones(ruta, ZUSTAND)).length, `${ruta} zustand`).toBeGreaterThan(0);
          expect(
            (await restricciones(ruta, ZUSTAND_DINAMICO)).length,
            `${ruta} import()`,
          ).toBeGreaterThan(0);
        }
        expect((await restricciones('src/store/x.ts', THREE)).length).toBeGreaterThan(0);
        expect((await restricciones('src/lib/galeria/orden.ts', ZUSTAND)).length).toBeGreaterThan(
          0,
        );
        expect(
          (
            await restricciones(
              'src/lib/galeria/orden.ts',
              "import React from 'react';\nexport const r = React;\n",
            )
          ).length,
        ).toBeGreaterThan(0);
        // El código de dominio tampoco puede subir a las capas de interfaz (patrón `^@/(app|components|store|workers)`).
        for (const modulo of ['@/store/x', '@/components/galeria/x', '@/app/x', '@/workers/x']) {
          expect(
            (
              await restricciones(
                'src/lib/galeria/orden.ts',
                `import { x } from '${modulo}';\nexport const y = x;\n`,
              )
            ).length,
            `src/lib/galeria/orden.ts importa ${modulo}`,
          ).toBeGreaterThan(0);
        }
        // Y en el almacén, zustand sigue permitido aunque el bloque del barril lo cubra.
        expect(await restricciones('src/store/x.ts', ZUSTAND)).toEqual([]);
      },
      TIMEOUT,
    );
  });
});
