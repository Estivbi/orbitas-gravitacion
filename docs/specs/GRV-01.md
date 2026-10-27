# GRV-01 · Base del repositorio

**Estado:** borrador, pendiente de aprobación · **Tamaño:** M · **Rama:** `feature/base-del-repositorio` → `develop`

## Contexto

El repositorio solo tiene el commit inicial, la base de trabajo y los agentes. Antes de escribir física, interfaz o tutor hace falta un esqueleto que compile, se pruebe y se valide solo en cada PR, y que deje por escrito las reglas del proyecto (`AGENTS.md`, `DESIGN.md`) para que los siguientes tickets no tengan que decidirlas.

## Alcance

1. **Proyecto Next.js** (App Router) con TypeScript `strict`, gestionado con npm (`package-lock.json`). Una página mínima en `src/app/` para poder compilar y probar.
2. **Estilos**: Tailwind CSS v4 instalado, con los tokens de color de `DESIGN.md` en `@theme`. La escala tipográfica y las fuentes llegan en GRV-03.
3. **Calidad**: ESLint, Prettier y comprobación de tipos como scripts independientes.
4. **Pruebas**: Vitest (unitarias) y Playwright (E2E) con una prueba de humo cada una.
5. **CI** en GitHub Actions: lint, tipos, tests unitarios, build y formato de los mensajes de commit, en cada PR hacia `develop` y `main`.
6. **Documentación viva**: `AGENTS.md` y `DESIGN.md` rellenos (sin `{{...}}`), `README.md` mínimo, `docs/estado.md` y el ADR `0001` con las decisiones de herramientas.
7. **Entorno**: `.env.example` con los nombres de variables del tutor (valores ficticios) y `.nvmrc`.
8. **Higiene del repositorio**: `docs/privado/` ignorado y sin menciones ajenas al proyecto en archivos versionados.

## Fuera de alcance

Motor de física, escena 3D, escala tipográfica, fuentes y estilos de componentes (GRV-03), rutas de galería y detalle (GRV-04), tutor y su API (GRV-05), presupuesto de rendimiento y `npm run analizar` (GRV-06), Dockerfile, despliegue y README final (GRV-07). La protección de ramas en GitHub la configura la persona responsable.

## Decisiones propuestas (a confirmar al aprobar)

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Versiones | Las que instale `create-next-app` hoy (Next 16.4.x, React 19.x) y se fijan en `package-lock.json` | Evita saltos de versión durante la semana. Obliga a no actualizar a mitad de proyecto |
| TypeScript | La versión que `create-next-app` instale. Si Next 16 no compila con TypeScript 7, se fija la última 5.x | TypeScript 7 es muy reciente y Next declara compatibilidad con `>=3.3.1`, sin garantía real. Se comprueba con `npm run build` y `npm run typecheck` antes de decidir |
| Estilos | Tailwind CSS v4 con `@tailwindcss/postcss` (4.3.x). Los tokens viven en un único bloque `@theme` de `src/app/globals.css`. Los componentes usan clases utilitarias; CSS propio solo para SVG y escena | Es el formato en que viene la referencia de estilo y acelera los componentes. Coste: una dependencia más, las maquetas en CSS plano hay que reescribirlas en clases y los valores sueltos tipo `bg-[#8052ff]` quedan prohibidos por la regla de tokens (lo vigila la revisión) |
| Estructura | Carpeta `src/`: `app/`, `components/`, `lib/` (con `lib/fisica` en GRV-02), `store/` | Una sola raíz de código y separación clara entre dominio e interfaz |
| Node | 22 (LTS), fijado en `.nvmrc` y en `engines` | CI, Docker y local usan la misma versión |
| Rigor de tipos | `strict: true` y `noUncheckedIndexedAccess: true` | Los arrays de estado de la física (`Float64Array`) se benefician de índices comprobados. Algo más de código defensivo |
| CI | Un único workflow `ci.yml` con un job por comprobación. Playwright en un job aparte desde GRV-03 | Los fallos se leen rápido. Más minutos de CI, aceptable en un repositorio público |

## Contratos

**Scripts npm** (todos sin argumentos obligatorios):

| Script | Hace |
|---|---|
| `dev` | Servidor de desarrollo |
| `build` | Compilación de producción |
| `start` | Sirve la compilación |
| `lint` | ESLint, sin avisos permitidos |
| `format` / `format:check` | Prettier (escribe / solo comprueba) |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest, una pasada |
| `test:e2e` | Playwright |
| `comprobar:commits` | Falla si algún commit del rango no sigue Conventional Commits en español con ticket `GRV-xx` |

**Estructura inicial** (solo carpetas con contenido):

```
src/app/            layout.tsx, page.tsx, globals.css (Tailwind y @theme)
tests/repo/         pruebas de invariantes del repositorio
tests/e2e/          pruebas de humo
scripts/            comprobar-commits.mjs
docs/               specs/, adr/, estado.md, diseno/referencia/
.github/workflows/  ci.yml
```

**Variables de entorno** (`.env.example`): `GOOGLE_GENERATIVE_AI_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`, con valores ficticios. El nombre exacto de la primera se verifica en GRV-05 contra la documentación de la versión instalada.

## Criterios de aceptación

Cada uno tiene su prueba. Las de repositorio viven en `tests/repo/` y se escriben en rojo antes de crear el proyecto.

1. **Compila.** Dado un clon limpio, cuando se ejecuta `npm ci` y `npm run build`, entonces ambos terminan sin error. *(CI)*
2. **Tipado estricto.** Dado `tsconfig.json`, cuando se lee, entonces `strict` y `noUncheckedIndexedAccess` son `true`. *(Vitest)*
3. **Solo npm.** Dado el repositorio, cuando se listan los archivos versionados, entonces existe `package-lock.json` y no existen `yarn.lock` ni `pnpm-lock.yaml`. *(Vitest)*
4. **Calidad automatizada.** Dado el código base, cuando se ejecutan `npm run lint`, `npm run typecheck` y `npm run format:check`, entonces los tres pasan. *(CI)*
5. **Prueba de humo unitaria.** Dado el proyecto, cuando se ejecuta `npm test`, entonces Vitest ejecuta al menos una prueba de la aplicación y todas pasan. *(Vitest)*
6. **Prueba de humo E2E.** Dada la aplicación en marcha, cuando Playwright abre `/`, entonces la página responde 200, `<html lang="es">`, hay un `h1` visible y el fondo calculado del `body` es `rgb(0, 0, 0)`, lo que comprueba que Tailwind y el token `--color-void` están conectados. *(Playwright)*
7. **CI en cada PR.** Dado un PR hacia `develop` o `main`, cuando se abre o se actualiza, entonces se ejecutan lint, tipos, tests, build y `comprobar:commits`, y la PR muestra su resultado. *(se comprueba en el propio PR de GRV-01)*
8. **Formato de commits.** Dado el rango de commits de un PR, cuando se ejecuta `npm run comprobar:commits`, entonces todos siguen Conventional Commits en español con ticket `GRV-xx`. *(script, con su prueba unitaria en `tests/repo/`)*
9. **Privado fuera del repo.** Dado el repositorio, cuando se listan los archivos versionados, entonces ninguno está bajo `docs/privado/` y `.gitignore` contiene esa ruta. *(Vitest)*
10. **Sin placeholders.** Dados `AGENTS.md` y `DESIGN.md`, cuando se leen, entonces no contienen `{{`. *(Vitest)*
11. **Entorno documentado.** Dado `.env.example`, cuando se lee, entonces contiene los tres nombres de variable, ningún valor parece una clave real y `.env` está ignorado. *(Vitest)*
12. **Documentación mínima.** Dado el repositorio, cuando se listan sus archivos, entonces existen `README.md` (qué es y cómo ejecutarlo en local), `docs/estado.md` y `docs/adr/0001-herramientas-y-estructura.md`. *(Vitest)*
13. **Neutralidad.** Dados los archivos versionados fuera de `docs/diseno/referencia/`, cuando se buscan los términos de la lista de privacidad del proyecto, entonces no aparece ninguno. *(revisión del `pr-reviewer` con `git grep`; la lista vive en `docs/privado/`, no en el repositorio)*

## Orden de trabajo

1. `test(GRV-01)`: pruebas de repositorio 2, 3, 9, 10, 11, 12 y la del script de commits (8), en rojo.
2. `chore(GRV-01)`: crear el proyecto Next, scripts y configuración (1, 4, 5).
3. `feat(GRV-01)`: página mínima y prueba E2E (6).
4. `ci(GRV-01)`: workflow (7).
5. `docs(GRV-01)`: `AGENTS.md`, `DESIGN.md`, README mínimo, `docs/estado.md`, ADR 0001.
6. Revisión (`pr-reviewer`) y entrega del enlace para abrir el PR.

## Traspasos tras la aprobación

`frontend` (proyecto y página), `devops` (CI y `comprobar:commits`), `documentacion` (README, estado, `AGENTS.md`), `arquitecto` (ADR 0001 y `DESIGN.md`).

## Riesgos

- TypeScript 7 o ESLint 10 pueden no ser plenamente compatibles con Next 16.4: se comprueba el build antes de fijar versiones.
- Tailwind v4 se configura por CSS (`@import "tailwindcss"` y `@theme`), sin `tailwind.config.js`. Se comprueba con la prueba E2E 6 que Next 16 lo compila.
- Playwright necesita navegadores; en CI se instalan con `npx playwright install --with-deps chromium`.
