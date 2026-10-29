# GRV-01 · Base del repositorio

Qué se construyó, cómo replicarlo y qué se aprendió. Spec: `docs/specs/GRV-01.md`. Decisiones de herramientas: `docs/adr/0001-herramientas-y-estructura.md`.

## Qué se construyó

- Proyecto Next.js 16 (App Router) con React 19, TypeScript 6.0 estricto (`strict` y `noUncheckedIndexedAccess`) y Tailwind CSS v4. Los tokens de color viven en `@theme` de `src/app/globals.css`.
- Una portada mínima (`src/app/page.tsx`) que usa los tokens y sirve de objetivo de las pruebas.
- Calidad: ESLint sin avisos, Prettier y `tsc --noEmit`, cada uno como script.
- Pruebas: Vitest (invariantes del repositorio en `tests/repo/` y humo unitario en `tests/unit/`) y Playwright (humo E2E en `tests/e2e/`).
- `scripts/comprobar-commits.mjs`: valida que los commits de un rango siguen Conventional Commits en castellano con ticket `GRV-xx`.
- CI en GitHub Actions con cuatro jobs: calidad, compilación, E2E y formato de commits.
- Documentación viva: `AGENTS.md`, `DESIGN.md`, `README.md`, `docs/estado.md`, ADR 0001 y `.env.example`.

## Cómo replicarlo

1. Crear las ramas `main` y `develop`, y una rama `feature/base-del-repositorio` desde `develop`.
2. Escribir la spec y aprobarla antes de nada.
3. Instalar solo las herramientas de test (`vitest`, `@playwright/test`, `typescript`, `@types/node`) y escribir los tests desde los criterios. Comprobar que fallan por el motivo correcto.
4. Instalar `next`, `react`, `react-dom`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `prettier` y los tipos de React.
5. Crear la configuración (`tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc.json`, `.nvmrc`), la portada y el script de commits hasta que todo pase.
6. Añadir el workflow de CI y rellenar la documentación.

## Decisiones y desvíos respecto a la spec

- **TypeScript 6.0.3 en lugar de 7.** `tsc` 7 funcionaba, pero `typescript-eslint` solo admite hasta `<6.1.0`. Es la alternativa de reserva que la spec ya preveía.
- **El E2E corre en CI desde este ticket.** La spec lo situaba en GRV-03. Se adelantó porque es la prueba de que Tailwind y los tokens están conectados.
- **El CI usa varios jobs agrupados por tipo de comprobación**, no uno por comando. La spec y el ADR decían «un job por comprobación»; se corrigieron.
- **Pruebas reforzadas tras la revisión.** Una revisión independiente demostró, quitando `@import 'tailwindcss'`, que el E2E original seguía pasando. Se añadió una aserción sobre una clase utilitaria (el color de la etiqueta). También se endureció el test del CI, que se engañaba con un comando comentado.
- **Spec ajustada** en los criterios 6, 8 y 10 para reflejar esas pruebas reforzadas.

## Verificación

| Criterio                                | Prueba                                                           |
| --------------------------------------- | ---------------------------------------------------------------- |
| 1 Compila                               | `npm run build` y el job `compilacion`                           |
| 2 Tipado estricto                       | `tests/repo/tipado.test.ts`                                      |
| 3 Solo npm                              | `tests/repo/gestor-y-scripts.test.ts`                            |
| 4 Calidad                               | Contrato de scripts y jobs de CI                                 |
| 5 Humo unitario                         | `tests/unit/layout.test.ts`                                      |
| 6 Humo E2E                              | `tests/e2e/humo.spec.ts`                                         |
| 7 CI en cada PR                         | `tests/repo/ci.test.ts` y el propio PR                           |
| 8 Formato de commits                    | `tests/repo/commits.test.ts`                                     |
| 9 Privado fuera del repo                | `tests/repo/higiene.test.ts`                                     |
| 10 Sin placeholders y tokens coherentes | `tests/repo/documentacion.test.ts` y `tests/repo/tokens.test.ts` |
| 11 Entorno documentado                  | `tests/repo/documentacion.test.ts`                               |
| 12 Documentación mínima                 | `tests/repo/documentacion.test.ts`                               |
| 13 Neutralidad                          | `tests/repo/higiene.test.ts` en local y revisión con `git grep`  |

**Excepción conocida.** El test del criterio 13 se salta en CI, porque la lista de términos vive en un archivo privado que no se versiona. Se ejecuta en local y lo repasa la revisión del PR.

## Interfaz: capturas y accesibilidad

Medido sobre la compilación de producción, en tres anchos. Las capturas se adjuntan al PR.

| Ancho               | Desborde horizontal | Titular         | Fondo          |
| ------------------- | ------------------- | --------------- | -------------- |
| Móvil, 375 px       | No                  | 48 px, peso 400 | `rgb(0, 0, 0)` |
| Tablet, 768 px      | No                  | 72 px, peso 400 | `rgb(0, 0, 0)` |
| Escritorio, 1440 px | No                  | 72 px, peso 400 | `rgb(0, 0, 0)` |

- **Contraste:** texto blanco sobre negro 21:1; etiqueta ámbar `#ffb829` sobre negro ≈12:1. Ambos superan el 4,5:1 exigido.
- **Estructura:** `<html lang="es">` y un único `h1`.
- **Teclado y foco:** la portada no tiene todavía elementos interactivos, así que no hay nada que enfocar. Se evalúa en GRV-03 y GRV-04.
- **Provisional:** la portada usa la escala por defecto de Tailwind (`px-4`, `text-5xl`). La unidad de 6 px y los titulares de 78 a 113 px de `DESIGN.md` llegan en GRV-03.

## Qué se aprendió

- Las versiones recientes no siempre combinan: comprobar la cadena completa (`tsc`, linter, framework) antes de fijar TypeScript.
- Un test que pasa antes de la implementación o que sobrevive a una mutación del código no prueba nada. Merece la pena romper la implementación a propósito para ver si el test lo detecta.
- Next reescribe `tsconfig.json` al compilar; hay que formatearlo con Prettier para que el CI no falle.

## Límites

- Playwright usa por defecto el Chromium que instala `npx playwright install`. En un entorno con otra versión se puede apuntar a un binario con la variable `PLAYWRIGHT_CHROMIUM_PATH`.
- `comprobar:commits` valida la estructura del asunto, no que la descripción esté en castellano ni en infinitivo. `Revert` y `fixup!` se rechazan a propósito.
