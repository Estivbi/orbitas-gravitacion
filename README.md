# Órbitas

Aplicación web que explica la ley de gravitación universal de Newton con una demostración interactiva y un tutor, y que reúne seis soluciones periódicas del problema de los tres cuerpos: Lagrange, figura de ocho, Butterfly I, Goggles, Moth I y Yin-Yang I.

> En construcción. Este README crece con cada ticket; el resultado final incluirá la versión desplegada, las decisiones técnicas y sus límites.

## Requisitos

- Node 22 (ver `.nvmrc`) y npm

## Ejecutarlo en local

```bash
npm ci
npm run dev
```

La aplicación queda en <http://localhost:3000>.

## Variables de entorno

Copia `.env.example` a `.env.local`. Las variables del modelo de lenguaje se explican en el propio archivo; sin clave, el tutor funcionará en modo reducido.

## Comprobaciones

```bash
npm run lint          # ESLint
npm run typecheck     # tipos
npm run format:check  # Prettier
npm test              # pruebas unitarias
npm run test:e2e      # pruebas de extremo a extremo (Playwright)
npm run build         # compilación de producción
npm run comprobar:commits  # formato de los commits de la rama (por defecto, frente a origin/develop)
npm run medir:fisica  # medición independiente del motor de física
```

Si Playwright no encuentra su navegador, instálalo con `npx playwright install chromium` o apunta a uno existente con la variable `PLAYWRIGHT_CHROMIUM_PATH`.

## Documentación

- `docs/specs/`: qué se construye en cada ticket y cómo se comprueba.
- `docs/adr/`: decisiones técnicas con su razón y su coste.
- `docs/estado.md`: estado actual del repositorio.
- `DESIGN.md`: sistema visual.
