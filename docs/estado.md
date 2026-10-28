# Estado del repositorio

Actualizado el 28 de octubre de 2026.

## Tickets

| ID | Ticket | Estado |
|---|---|---|
| GRV-01 | Base del repositorio | Hecho y fusionado |
| GRV-02 | Motor de física y catálogo | En revisión: código y tests en verde, a falta de abrir el PR |
| GRV-03 | Sistema de diseño y escena 3D | Pendiente |
| GRV-04 | Galería, detalle y rutas | Pendiente |
| GRV-05 | Parte A: ley interactiva y tutor | Pendiente |
| GRV-06 | Rendimiento y accesibilidad | Pendiente |
| GRV-07 | Entrega | Pendiente |

## Qué hay

- Proyecto Next.js 16 (App Router) con React 19, TypeScript 6.0 estricto y Tailwind CSS v4.
- Portada mínima con los tokens de color de `DESIGN.md`.
- Motor de física en `src/lib/fisica/` (RK4 con duplicación de paso, nodos adaptativos e interpolación de Hermite, métricas y catálogo de las seis órbitas) y su Web Worker en `src/workers/`.
- Vitest (268 pruebas: física, Worker, invariantes del repositorio y script de commits) y Playwright (humo E2E, incluida la comprobación de Tailwind).
- CI en GitHub Actions: lint, tipos, formato, tests, compilación, E2E y formato de commits.
- Documentación de los tickets en `docs/tickets/` y decisiones en `docs/adr/` (0001 a 0004).

## Qué falta

Escena 3D, galería, detalle, ley interactiva y tutor.
