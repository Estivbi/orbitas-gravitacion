import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // src/lib es TypeScript puro: se prueba en Node y se ejecuta también en un Worker.
    files: ['src/lib/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'next',
                'next/*',
                'three',
                'three/*',
              ],
              message: 'src/lib es TypeScript puro: no puede importar React, Next ni three.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'Worker'].map((name) => ({
          name,
          message: 'src/lib no puede usar globales del navegador.',
        })),
      ],
    },
  },
  {
    // El Worker solo conoce el motor de física y su protocolo. Los patrones no admiten una lista
    // blanca fiable, así que se prohíbe todo lo demás que podría colarse.
    files: ['src/workers/fisica.worker.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'next',
                'next/*',
                'three',
                'three/*',
                '../*',
                '@/lib/fisica/*',
                '@/app/*',
                '@/components/*',
                '@/store/*',
              ],
              message: 'El Worker solo puede importar @/lib/fisica y ./protocolo.',
            },
          ],
        },
      ],
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
