# Estado del repositorio

Actualizado el 29 de octubre de 2026.

## Tickets

| ID     | Ticket                        | Estado                                           |
| ------ | ----------------------------- | ------------------------------------------------ |
| GRV-01 | Base del repositorio          | Hecho y fusionado                                |
| GRV-02 | Motor de física y catálogo    | Hecho y fusionado                                |
| GRV-03 | Sistema de diseño y escena 3D | Hecho y fusionado                                |
| GRV-04 | Galería, detalle y rutas      | Hecho y fusionado                                |
| GRV-05 | Ley interactiva y tutor       | Hecho y fusionado                                |
| GRV-06 | Rendimiento y accesibilidad   | En la rama `feature/rendimiento-y-accesibilidad` |
| GRV-07 | Entrega                       | Hecho y fusionado                                |

## Qué hay en `develop`

- Proyecto Next.js 16 (App Router) con React 19, TypeScript 6.0 estricto y Tailwind CSS v4.
- **Sistema de diseño:** tokens completos en `@theme static` de `src/app/globals.css` (colores, escala tipográfica, `--spacing: 6px`, radio, ancho máximo y punto de corte `columnas`), Inter autoalojada, peso del texto según el ancho, foco visible y `prefers-reduced-motion`. `DESIGN.md` documenta cada token. Layout accesible con enlace de salto, cabecera, `main` (`#contenido`) y pie.
- **Motor de física** en `src/lib/fisica/` (RK4 con duplicación de paso, nodos adaptativos e interpolación de Hermite, métricas y catálogo de las seis órbitas) y su Web Worker en `src/workers/`.
- **Escena 3D** en `src/components/escena/` con three (`EscenaOrbita`, `VisorOrbita`, `MiniaturaOrbita`), apoyada en el núcleo puro de `src/lib/escena/`.
- **Galería** en la portada (`#galeria`): las seis soluciones con miniatura SVG calculada en el servidor, periodo y energía, y selector de orden. Al volver del detalle se conservan el orden y el foco.
- **Detalle por órbita** en `/orbitas/[slug]` (rutas estáticas): visor 3D grande, controles de reproducción, telemetría en vivo a unos 10 Hz, crédito y navegación cíclica entre órbitas. Página 404 propia, metadatos por órbita, `sitemap.xml` e icono SVG.
- **Estado de interfaz** en `src/store/` con Zustand: un almacén por proveedor en el layout raíz, nunca una instancia de módulo y sin persistencia.
- Vitest (física, Worker, escena, galería, almacén e invariantes del repositorio) y Playwright (humo, diseño, escena, rutas, galería y detalle, con WebGL por software).
- CI en GitHub Actions: lint, tipos, formato, tests, compilación, E2E y formato de commits. Reglas de ESLint que confinan `three` a `src/components/escena/` y `zustand` a `src/store/`.
- Documentación de los tickets en `docs/tickets/` y decisiones en `docs/adr/` (0001 a 0006).

## Lo incorporado con GRV-05

Ya en `develop`:

- **Ley interactiva** (`#ley`, entre el hero y la galería): dos masas en SVG, deslizadores de m₁, m₂ y r, masa derecha arrastrable (también con flechas), `F = G·m₁·m₂/r²` con G = 1 y la frase «a doble distancia la fuerza sería…», calculada con la fórmula. Núcleo puro en `src/lib/ley/`; componentes en `src/components/ley/`.
- **Tutor de lenguaje** con la ruta `src/app/api/tutor/route.ts` (Vercel AI SDK y Gemini) sobre `src/lib/tutor/`: manejador inyectable que se prueba sin red ni clave, prompt acotado a la gravitación, topes de entrada y de salida, y tres herramientas que ejecuta el cliente (`ajustar_ley`, `mostrar_orbita`, `registrar_respuesta`).
- **Modo reducido** sin clave o sin cuota: preguntas y correcciones fijas por nivel, con aviso visible.
- **Límites de uso:** 10 peticiones por minuto y por IP en memoria de la instancia (no escala); en el cliente, una petición cada vez, 2 s entre envíos y 20 mensajes por conversación.
- **Almacén ampliado** con la ley y el nivel del tutor; el chat se carga en un chunk aparte.
- **Herramientas:** regla de ESLint que confina `ai` y `@ai-sdk/*` a `src/lib/tutor/` y `src/components/ley/`; `GOOGLE_GENERATIVE_AI_API_KEY`, `LLM_PROVIDER` y `LLM_MODEL` en `.env.example`.
- **Dependencias nuevas:** `ai`, `@ai-sdk/google`, `@ai-sdk/react` y `zod`.
- **Documentación:** ticket `docs/tickets/GRV-05-ley-interactiva-y-tutor.md`.

## Qué cambia en la rama de GRV-07

Aún sin fusionar. Cuando se fusione, `develop` incorporará:

- **README** reescrito para quien llega al repositorio: qué es, cómo ejecutarlo (Node 22 o `docker compose up --build`, en <http://localhost:3000>), variables de entorno, cómo probar el tutor con clave propia, pruebas, arquitectura, decisiones con su coste, mediciones, límites, seguridad y créditos de las fuentes físicas.
- **Entrega con Docker:** `Dockerfile` y `docker-compose.yml` (los crea `devops` en la misma rama; el README describe el comando).
- **Marcadores que quedan por rellenar:** `URL_DESPLEGADA_PENDIENTE` en el README (la pone la persona responsable tras desplegar) y la sección «Mediciones», sin cifras de Lighthouse hasta GRV-06.
- **Documentación:** ticket `docs/tickets/GRV-07-entrega.md`.

## Pendientes conocidos

De GRV-04:

- Sin buscador de órbitas propias, sin estado en la URL, sin imágenes Open Graph y sin persistencia tras recargar.
- `/orbitas` da 404 y `/favicon.ico` sigue dando 404 en navegadores sin soporte de icono SVG.
- `URL_SITIO` se lee al compilar; en Docker va como `ARG` de la etapa de build (GRV-07).
- El HTML de la portada pesa 135 KB por las miniaturas de la galería; GRV-06 puede revisarlo.
- La restauración del foco depende del orden de efectos de Next. El peso de three se sigue vigilando en GRV-06.

De GRV-05:

- Un solo proveedor de modelo (Google); `LLM_PROVIDER` distinto de `google` degrada a modo reducido.
- El límite por IP está en memoria de la instancia y no escala; no hay límite distribuido.
- La restricción de tema es por instrucciones y no es infalible; no se evalúa el acierto del modelo.
- No existe un E2E propio para la cuota o el 429: solo Vitest y la lógica del cliente.
- Sin persistencia de conversaciones, adaptación fina, voz ni analítica.
- Detalle en `docs/tickets/GRV-04-galeria-detalle-y-rutas.md` y `docs/tickets/GRV-05-ley-interactiva-y-tutor.md`.

## Comandos

`npm ci`, `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (Vitest) y `npm run test:e2e` (Playwright; la primera vez, `npx playwright install chromium`). Para las pruebas de GRV-05: `npx vitest run tests/unit/ley tests/unit/tutor` y `npx playwright test tests/e2e/ley.spec.ts`. Sin `GOOGLE_GENERATIVE_AI_API_KEY` la aplicación arranca en modo reducido. La lista completa está en `AGENTS.md`.

## Siguiente

Fusionar GRV-06 y poner la URL desplegada en el README. Mejora futura: bajar el bloqueo del hilo principal que causa la escena 3D.

## Qué falta

La URL desplegada en el README (`URL_DESPLEGADA_PENDIENTE`) y la fusión de GRV-06.
