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
    // src/lib es TypeScript puro: se prueba en Node y se ejecuta también dentro de un Worker.
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(react|react-dom|next|three|zustand)(/|$)',
              message:
                'src/lib es TypeScript puro: no puede importar React, Next, three ni zustand.',
            },
            {
              regex: '^@/(app|components|store|workers)(/|$)',
              message: 'src/lib no puede depender de la interfaz ni de los Workers.',
            },
          ],
        },
      ],
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
