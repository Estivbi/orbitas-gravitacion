# AGENTS.md — Contrato del equipo de agentes de orbitas-gravitacion

Fuente de verdad para los agentes y las personas que trabajan en este repositorio.

**Reglas comunes (flujo SDD/TDD, ramas, commits, diseño, seguridad):** `.claude/base/base.md`. Léelas antes de empezar. Si algo de este archivo choca con la base, manda este archivo.

## Qué es orbitas-gravitacion

Aplicación web que enseña la ley de gravitación universal de Newton con un elemento interactivo y un tutor de lenguaje, y que reúne seis soluciones periódicas del problema de los tres cuerpos con simulación animada.

Tickets: identificadores `GRV-xx`, trazados en `docs/specs/`, en los commits y en `docs/estado.md`. Decisiones de arquitectura en `docs/adr/`. Estado actual en `docs/estado.md`.

## Stack

- Frontend: Next.js (App Router), React, TypeScript estricto, Tailwind CSS v4, three.js (solo en cliente), Zustand
- Backend: rutas de Next.js (`src/app/api/`) con Vercel AI SDK para el tutor
- Base de datos: ninguna
- Despliegue: Vercel y `docker compose up --build`

## Equipo de agentes

Los subagentes viven en `.claude/agents/<nombre>.md`.

| Agente | Rol | Es dueño de | Puede escribir |
|---|---|---|---|
| arquitecto | Diseño, specs y ADRs | `docs/adr/`, `docs/specs/` | Solo documentación |
| frontend | Interfaz | `src/app/` (salvo `api/`), `src/components/`, `src/store/`, `tests/e2e/` | Sí |
| backend | Física, worker y API del tutor | `src/lib/`, `src/workers/`, `src/app/api/`, `scripts/medir-fisica.mjs` | Sí |
| seguridad | Revisión de seguridad | — | No (solo informa) |
| devops | CI, contenedores, despliegue | `.github/`, `Dockerfile`, `docker-compose.yml`, `scripts/` (salvo `medir-fisica.mjs`) | Sí |
| documentacion | Docs de ticket y estado | `docs/tickets/`, `docs/estado.md`, `README.md` | Solo documentación |
| pr-reviewer | Revisión de la rama contra su spec | — | No (solo informa) |

## Estructura del repositorio

```
src/app/            rutas y layout (api/ para el servidor)
src/components/     componentes de interfaz y escena
src/lib/            lógica de dominio sin React (fisica/, tutor/)
src/workers/        Web Workers
src/store/          estado compartido (Zustand)
tests/repo/         invariantes del repositorio
tests/unit/         pruebas unitarias
tests/e2e/          pruebas de extremo a extremo
scripts/            utilidades de Node
docs/               specs/, tickets/, adr/, estado.md, diseno/referencia/
.github/workflows/  integración continua
```

Las carpetas se crean cuando el ticket que las necesita las introduce; no se versionan carpetas vacías.

## Arquitectura

- `src/lib/` es TypeScript puro: no importa React, el DOM ni `src/app/`. Es lo que prueban los tests unitarios.
- `src/workers/` consume `src/lib/fisica` y no toca la interfaz.
- `three` solo se importa desde `src/components/` y se carga en cliente con `next/dynamic` y `ssr: false`.
- La clave del modelo de lenguaje solo existe en el servidor (`src/app/api/`), nunca en el cliente.
- Los componentes no hacen `fetch` sueltos: los datos entran por funciones tipadas de `src/lib/`.

## Entorno y comandos

Node 22 (`.nvmrc`) y npm.

| Comando | Hace |
|---|---|
| `npm ci` | Instala las dependencias del lock |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compila y sirve |
| `npm run lint` | ESLint, sin avisos |
| `npm run typecheck` | Comprobación de tipos |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright |
| `npm run comprobar:commits` | Valida el formato de los commits del rango (por defecto `origin/develop..HEAD`) |
| `npm run medir:fisica` | Mide con un integrador independiente las cifras de los ADR de física |

## Particularidades del proyecto

- Interfaz, README, specs, ADRs y commits en castellano. Identificadores de código en inglés.
- Los colores solo se definen en `@theme` de `src/app/globals.css`. No se usan valores arbitrarios como `bg-[#8052ff]`.
- TypeScript está fijado en 6.0.x porque `typescript-eslint` aún no admite la 7 (ADR 0001).
- Sin gestor de tickets externo: la trazabilidad son los `GRV-xx`.
