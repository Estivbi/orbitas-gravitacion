# Estado del repositorio

Actualizado el 28 de octubre de 2026.

## Tickets

| ID | Ticket | Estado |
|---|---|---|
| GRV-01 | Base del repositorio | Hecho y fusionado |
| GRV-02 | Motor de física y catálogo | Hecho y fusionado |
| GRV-03 | Sistema de diseño y escena 3D | Hecho y fusionado |
| GRV-04 | Galería, detalle y rutas | En la rama `feature/galeria-y-detalle-de-orbitas`, pendiente de abrir la PR |
| GRV-05 | Parte A: ley interactiva y tutor | Pendiente (siguiente) |
| GRV-06 | Rendimiento y accesibilidad | Pendiente |
| GRV-07 | Entrega | Pendiente |

## Qué hay en `develop`

- Proyecto Next.js 16 (App Router) con React 19, TypeScript 6.0 estricto y Tailwind CSS v4.
- **Sistema de diseño:** tokens completos en `@theme static` de `src/app/globals.css` (colores, escala tipográfica, `--spacing: 6px`, radio, ancho máximo y punto de corte `columnas`), Inter autoalojada, peso del texto según el ancho, foco visible y `prefers-reduced-motion`. `DESIGN.md` documenta cada token. Layout accesible con enlace de salto, cabecera, `main` (`#contenido`) y pie.
- **Motor de física** en `src/lib/fisica/` (RK4 con duplicación de paso, nodos adaptativos e interpolación de Hermite, métricas y catálogo de las seis órbitas) y su Web Worker en `src/workers/`.
- **Escena 3D** en `src/components/escena/` con three (`EscenaOrbita`, `VisorOrbita`, `MiniaturaOrbita`), apoyada en el núcleo puro de `src/lib/escena/` (cámara, estelas, reloj, miniatura y campo ambiental). La portada muestra la figura de ocho con una miniatura SVG calculada en el servidor.
- Vitest (física, Worker, escena, tokens e invariantes del repositorio) y Playwright (humo, diseño y escena, con WebGL por software).
- CI en GitHub Actions: lint, tipos, formato, tests, compilación, E2E y formato de commits. Una regla de ESLint confina `three` a `src/components/escena/`.
- Documentación de los tickets en `docs/tickets/` y decisiones en `docs/adr/` (0001 a 0005).

## Qué cambia en la rama de GRV-04

Aún sin fusionar. Cuando se fusione, `develop` incorporará:

- **Galería** en la portada (`#galeria`): las seis soluciones con su miniatura SVG calculada en el servidor, periodo y energía, y un selector de orden (catálogo, periodo, energía). Al volver del detalle se conservan el orden y el foco en la miniatura de la órbita visitada.
- **Detalle por órbita** en `/orbitas/[slug]`: rutas estáticas (`generateStaticParams`, `dynamicParams = false`), visor 3D grande, controles de reproducción (Reproducir/Pausar, velocidad de 0,25× a 4×, posición, longitud de la estela, restablecer vista), telemetría en vivo a unos 10 Hz (tiempo, energía, momento lineal, distancia mínima y velocidad máxima), crédito, enlace de vuelta y navegación cíclica a la órbita anterior y siguiente.
- **Estado de interfaz** en `src/store/` con Zustand: un almacén por proveedor en el layout raíz (nunca una instancia de módulo) que guarda el orden de la galería, la última órbita, la velocidad y la estela compartidas, y la posición y la vista de cada órbita visitada. Sin persistencia: se pierde al recargar.
- **Núcleo puro** en `src/lib/galeria/` (orden, formato, controles, navegación, telemetría, fichas de servidor, URL del sitio y metadatos), ahora propiedad de `frontend`.
- **Rutas y metadatos:** página 404 propia, metadatos por órbita (título, descripción, canonical y Open Graph sin imagen), `sitemap.xml` con siete URL e icono SVG de la aplicación.
- **Cambios en la escena de GRV-03,** todos opcionales: reproducción controlada, tamaño grande, `vistaRestablecida` y callbacks por fotograma. Cierran lo que GRV-03 dejó pendiente (conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion`, limpieza al desmontar, pausa por `IntersectionObserver` y favicon).
- **Herramientas:** tres bloques de ESLint que confinan `zustand` y `three`, y otros tres que prohíben importar valores del barril `@/lib/fisica` desde el código de cliente; `URL_SITIO` en `.env.example`.
- **Pruebas:** unitarias de `src/lib/galeria/` y del almacén, invariantes del repositorio (`tests/repo/galeria.test.ts`) y E2E de rutas, galería, detalle y estados alternativos.
- **Dependencia nueva:** `zustand` (`^5`).
- **Documentación:** ADR 0006 (estado de interfaz, rutas y metadatos), ticket `docs/tickets/GRV-04-galeria-detalle-y-rutas.md`, `DESIGN.md` (selector de texto, telemetría, deslizadores y excepción de color del icono) y `AGENTS.md` (propiedad de `src/lib/galeria/`, regla de `zustand` y `URL_SITIO`).

Mediciones: el JS inicial de `/` pasa de 181 502 B a 183 932 B con gzip (+2 430 B; tope +8 KB), el HTML de `/` de 21 330 B a 135 695 B y el de los detalles va de 33,9 a 44,4 KB. El build en frío tarda unos 12 s.

## Pendientes conocidos de GRV-04

- Sin buscador de órbitas propias, sin estado en la URL, sin imágenes Open Graph y sin persistencia tras recargar; la reanudación por órbita es solo de sesión.
- `/orbitas` da 404 (no hay ruta índice) y `/favicon.ico` sigue dando 404 en navegadores sin soporte de icono SVG.
- `URL_SITIO` se lee al compilar. El `ARG` correspondiente en el Dockerfile queda para GRV-07; sin él, las páginas compiladas en Docker llevarían `http://localhost:3000`.
- El HTML de la portada crece a 135 KB por las miniaturas de la galería; GRV-06 puede revisarlo.
- La regla de ESLint solo detecta `import()` con un literal.
- La restauración del foco depende del orden de efectos de Next y de dos señales de navegación (`#galeria` y `popstate`); los criterios 19, 20 y 36 lo vigilan.
- El peso de three (549 KB sin comprimir, 136 KB con gzip) se sigue vigilando en GRV-06.
- Detalle completo en `docs/tickets/GRV-04-galeria-detalle-y-rutas.md`.

## Comandos

`npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (Vitest) y `npm run test:e2e` (Playwright; la primera vez, `npx playwright install chromium`). Para las pruebas de este ticket: `npx vitest run tests/unit/galeria tests/unit/store tests/repo/galeria.test.ts` y `npx playwright test tests/e2e/rutas.spec.ts tests/e2e/galeria.spec.ts tests/e2e/detalle.spec.ts tests/e2e/detalle-alternativas.spec.ts`. La lista completa está en `AGENTS.md`.

## Siguiente

GRV-05: parte A del producto, la ley de gravitación interactiva y el tutor de lenguaje. Cuando el tutor deba abrir una órbita usará `rutaDeOrbita`, de `src/lib/galeria/navegacion.ts`.

## Qué falta

Ley interactiva y tutor (GRV-05), rendimiento y accesibilidad (GRV-06) y entrega (GRV-07).
