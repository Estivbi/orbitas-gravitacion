# Estado del repositorio

Actualizado el 28 de octubre de 2026.

## Tickets

| ID | Ticket | Estado |
|---|---|---|
| GRV-01 | Base del repositorio | Hecho y fusionado |
| GRV-02 | Motor de física y catálogo | Hecho y fusionado |
| GRV-03 | Sistema de diseño y escena 3D | En la rama `feature/sistema-de-diseno-y-escena-3d`, pendiente de abrir el PR |
| GRV-04 | Galería, detalle y rutas | Pendiente (siguiente) |
| GRV-05 | Parte A: ley interactiva y tutor | Pendiente |
| GRV-06 | Rendimiento y accesibilidad | Pendiente |
| GRV-07 | Entrega | Pendiente |

## Qué hay en `develop`

- Proyecto Next.js 16 (App Router) con React 19, TypeScript 6.0 estricto y Tailwind CSS v4.
- Portada mínima con los tokens de color de `DESIGN.md`.
- Motor de física en `src/lib/fisica/` (RK4 con duplicación de paso, nodos adaptativos e interpolación de Hermite, métricas y catálogo de las seis órbitas) y su Web Worker en `src/workers/`.
- Vitest (física, Worker, invariantes del repositorio y script de commits) y Playwright (humo E2E, incluida la comprobación de Tailwind).
- CI en GitHub Actions: lint, tipos, formato, tests, compilación, E2E y formato de commits.
- Documentación de los tickets en `docs/tickets/` y decisiones en `docs/adr/` (0001 a 0004).

## Qué cambia en la rama de GRV-03

Aún sin fusionar. Cuando se fusione, `develop` incorporará:

- **Sistema de diseño:** tokens completos en `@theme static` de `src/app/globals.css` (colores, escala tipográfica, `--spacing: 6px`, radio, ancho máximo y punto de corte `columnas`), Inter autoalojada con `next/font/local`, peso del texto según el ancho, foco visible y `prefers-reduced-motion`. `DESIGN.md` documenta cada token.
- **Layout accesible:** enlace de salto, cabecera, `main` (`#contenido`) y pie.
- **Núcleo puro de la escena** en `src/lib/escena/`: cámara, estelas, reloj, miniatura y campo ambiental, sin React, DOM ni three.
- **Escena 3D** en `src/components/escena/` con three (`EscenaOrbita`, `VisorOrbita`, `MiniaturaOrbita`): tres cuerpos, estelas de triángulos, campo ambiental, cámara por ratón, tacto y teclado, giro automático y botón de animación. three se carga aparte con `next/dynamic` y `ssr: false`.
- **Portada:** la figura de ocho en 3D, con una miniatura SVG calculada en el servidor y un aviso si no hay WebGL2 o falla el cálculo. Primera página que usa el Worker de física en un navegador.
- **Pruebas:** tests unitarios de la escena en `tests/unit/escena/`, invariantes de tokens en `tests/repo/sistemaDeDiseno.test.ts` y E2E de diseño y escena en `tests/e2e/`. `tests/unit/layout.test.ts` simula `next/font/local`.
- **Herramientas:** regla de ESLint que confina `three` a `src/components/escena/`, y `playwright.config.ts` con WebGL por software, `timeout` de 60 s y un reintento en CI.
- **Dependencias nuevas:** `three` y `@fontsource-variable/inter`; en desarrollo, `@types/three`, `pngjs` y `@types/pngjs`.
- **Documentación:** ADR 0005 (escena, estelas y color), ticket `docs/tickets/GRV-03-sistema-de-diseno-y-escena-3d.md` y propiedad de `src/lib/escena/` y de `DESIGN.md` en `AGENTS.md`.

## Pendientes conocidos de GRV-03

- El peso de three (549 KB sin comprimir, 136 KB con gzip) se vigila en GRV-06.
- La conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion` con la interfaz y la limpieza al desmontar se probarán en GRV-04.
- El WebGL por software aún no se ha ejecutado en GitHub Actions: se verá en el primer PR.
- Detalle completo en `docs/tickets/GRV-03-sistema-de-diseno-y-escena-3d.md`.

## Comandos

`npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (Vitest) y `npm run test:e2e` (Playwright; la primera vez, `npx playwright install chromium`). La lista completa está en `AGENTS.md`.

## Siguiente

GRV-04: galería de las seis órbitas, detalle de cada una con los controles de reproducción y las rutas. Reutiliza `EscenaOrbita`, `fijarPosicion` y `avanzarPosicion`, y aporta la primera navegación para probar la limpieza al desmontar la escena.

## Qué falta

Galería, detalle, ley interactiva y tutor.
