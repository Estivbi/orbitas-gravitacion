import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

/** Lista blanca: cualquier importación que no sea exactamente una de las permitidas es un error. */
const soloImportar = (...permitidos) => [
  'error',
  {
    patterns: [
      {
        regex: `^(?!(${permitidos.map(escapar).join('|')})$)`,
        message: `Este archivo solo puede importar: ${permitidos.join(', ')}.`,
      },
    ],
  },
];

const sinImportacionDinamica = [
  'error',
  {
    selector: 'ImportExpression',
    message: 'No se permite import() dinámico: saltaría las reglas de importación.',
  },
];

const patronThree = {
  regex: '^three(/|$)',
  message: 'three solo puede importarse desde src/components/escena/.',
};

const patronZustand = {
  regex: '^zustand(/|$)',
  message: 'zustand solo puede importarse desde src/store/.',
};

/** Cubre import('three') e import('zustand'), que no pasan por no-restricted-imports. */
const importacionDinamica = (modulo) => ({
  selector: `ImportExpression[source.type='Literal'][source.value=/^${modulo}(\\/|$)/]`,
  message: `${modulo} solo puede importarse desde ${modulo === 'three' ? 'src/components/escena/' : 'src/store/'}.`,
});

const patronesDeLib = [
  {
    regex: '^(react|react-dom|next|three|zustand)(/|$)',
    message: 'src/lib es TypeScript puro: no puede importar React, Next, three ni zustand.',
  },
  {
    regex: '^@/(app|components|store|workers)(/|$)',
    message: 'src/lib no puede depender de la interfaz ni de los Workers.',
  },
];

/** El barril @/lib/fisica arrastra el catálogo: el código de cliente solo importa tipos, tipos.ts y metricas.ts. */
const barrilSoloTipos = {
  name: '@/lib/fisica',
  allowTypeImports: true,
  message:
    'El código de cliente no importa valores del barril @/lib/fisica: usa @/lib/fisica/tipos o @/lib/fisica/metricas.',
};

const globalesDelNavegador = [
  'window',
  'document',
  'self',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'fetch',
  'XMLHttpRequest',
  'Worker',
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // three solo se importa desde la escena (src/components/escena/) y zustand solo desde el almacén (src/store/).
    files: ['src/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    ignores: ['src/components/escena/**', 'src/store/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [patronThree, patronZustand] }],
      'no-restricted-syntax': [
        'error',
        importacionDinamica('three'),
        importacionDinamica('zustand'),
      ],
    },
  },
  {
    // La escena puede importar three, pero no zustand.
    files: ['src/components/escena/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [patronZustand] }],
      'no-restricted-syntax': ['error', importacionDinamica('zustand')],
    },
  },
  {
    // El almacén puede importar zustand, pero no three.
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [patronThree] }],
      'no-restricted-syntax': ['error', importacionDinamica('three')],
    },
  },
  {
    // src/lib es TypeScript puro: se prueba en Node y se ejecuta también dentro de un Worker.
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { patterns: patronesDeLib }],
      'no-restricted-globals': [
        'error',
        ...globalesDelNavegador.map((name) => ({
          name,
          message: 'src/lib no puede usar globales del navegador.',
        })),
      ],
      'no-restricted-syntax': sinImportacionDinamica,
    },
  },
  // Código de cliente: nada de valores del barril @/lib/fisica. Cada bloque sustituye por completo al
  // no-restricted-imports de su zona, así que repite los patrones que le corresponden.
  {
    files: ['src/components/{galeria,detalle,comunes}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [barrilSoloTipos], patterns: [patronThree, patronZustand] },
      ],
    },
  },
  {
    files: ['src/store/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [barrilSoloTipos], patterns: [patronThree] }],
    },
  },
  {
    files: ['src/lib/galeria/{orden,formato,controles,navegacion,telemetria}.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [barrilSoloTipos], patterns: patronesDeLib }],
    },
  },
  {
    // El Worker, su protocolo y su cliente solo conocen el motor de física y el protocolo.
    files: ['src/workers/fisica.worker.ts'],
    rules: {
      'no-restricted-imports': soloImportar('@/lib/fisica', './protocolo'),
      'no-restricted-syntax': sinImportacionDinamica,
    },
  },
  {
    files: ['src/workers/protocolo.ts'],
    rules: {
      'no-restricted-imports': soloImportar('@/lib/fisica'),
      'no-restricted-syntax': sinImportacionDinamica,
    },
  },
  {
    files: ['src/workers/clienteFisica.ts'],
    rules: {
      'no-restricted-imports': soloImportar('@/lib/fisica', './protocolo'),
      'no-restricted-syntax': sinImportacionDinamica,
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'next-env.d.ts',
  ]),
]);
