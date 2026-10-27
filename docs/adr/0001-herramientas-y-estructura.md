# ADR 0001 · Herramientas y estructura del proyecto

**Fecha:** 27 de octubre de 2026 · **Ticket:** GRV-01 · **Estado:** aceptada

## Contexto

El proyecto tiene que arrancar con un esqueleto que compile, se pruebe solo y deje fijadas las herramientas, para que los siguientes tickets no las discutan. El enunciado exige TypeScript, Next.js y npm.

## Decisiones

| Tema | Decisión | Opciones descartadas | Coste |
|---|---|---|---|
| Framework | Next.js 16.4 (App Router) con React 19 | Vite con React | Lo exige el enunciado |
| TypeScript | **6.0.3**, con `strict` y `noUncheckedIndexedAccess` | La 7.0.2 (la última publicada) | `tsc` 7 funcionaba con Next, pero `typescript-eslint` declara soporte solo hasta `<6.1.0` y el linter fallaba al arrancar. Se revisa cuando `typescript-eslint` admita la 7 |
| Linter | ESLint 9 con `eslint-config-next` | ESLint 10 | npm resuelve la 9 por los pares de `eslint-config-next`; no se fuerza la 10 |
| Estilos | Tailwind CSS v4 con `@tailwindcss/postcss`; tokens en `@theme` de `src/app/globals.css` | CSS Modules con variables CSS | Una dependencia más; las maquetas en CSS plano se reescriben en clases; los valores sueltos tipo `bg-[#...]` quedan prohibidos por la regla de tokens |
| Pruebas | Vitest 5 (unitarias e invariantes del repositorio) y Playwright (E2E) | Jest | Playwright necesita descargar un navegador en CI |
| Gestor | npm con `package-lock.json` | pnpm | Instalaciones algo más lentas |
| Node | 22 (LTS), fijado en `.nvmrc` y en `engines` | Node 20 | Local, CI y Docker usan la misma versión |
| Estructura | Todo el código bajo `src/` (`app/`, `components/`, `lib/`, `workers/`, `store/`) | Código en la raíz | Una carpeta más |
| CI | Un workflow con un job por comprobación | Un único job | Más minutos de CI, aceptables en un repositorio público |

## Consecuencias

- Las versiones quedan fijadas en `package-lock.json`; no se actualizan a mitad de proyecto.
- El formato de los commits (Conventional Commits en castellano con ticket `GRV-xx`) se valida en cada PR con `npm run comprobar:commits`.
- El E2E de GRV-01 ya se ejecuta en CI, antes de lo previsto en la spec, porque es la comprobación de que Tailwind y los tokens están conectados.
