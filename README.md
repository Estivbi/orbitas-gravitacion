# Órbitas

Aplicación web que enseña la ley de gravitación universal de Newton con una demostración interactiva y un tutor de lenguaje, y que reúne seis soluciones periódicas del problema de los tres cuerpos con simulación 3D animada: Lagrange, figura de ocho, Butterfly I, Goggles, Moth I y Yin-Yang I (variante Ia, anotada en el catálogo).

- **Ley interactiva** (`#ley`): dos masas, deslizadores de m₁, m₂ y r, masa arrastrable y `F = G·m₁·m₂/r²` (G = 1, unidades arbitrarias). La frase «a doble distancia la fuerza sería…» sale de la fórmula.
- **Tutor**: propone predicciones, corrige y sube o baja de nivel. Puede mover los deslizadores y enlazar una órbita.
- **Galería y detalle**: seis miniaturas ordenables y una página por órbita con visor 3D, controles de reproducción y telemetría en vivo (≈ 10 Hz).

## Cómo verlo

Versión desplegada: URL_DESPLEGADA_PENDIENTE

## Cómo ejecutarlo

Con Node 22 (ver `.nvmrc`) y npm:

```bash
npm ci
npm run dev
```

Con Docker, un comando:

```bash
docker compose up --build
```

En los dos casos queda en <http://localhost:3000>. El WebGL necesita un navegador con WebGL2; sin él se ve la miniatura SVG con un aviso.

## Variables de entorno

Copia `.env.example` a `.env` (Next lo lee en local y Docker puede leerlo igual). Nunca subas claves reales.

| Variable                       | Para qué                                                              | Por defecto             |
| ------------------------------ | --------------------------------------------------------------------- | ----------------------- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Clave de Google AI Studio para el tutor                               | vacía (modo reducido)   |
| `LLM_PROVIDER`                 | Proveedor del modelo; solo `google`                                   | `google`                |
| `LLM_MODEL`                    | Identificador del modelo de Google                                    | `gemini-2.5-flash-lite` |
| `URL_SITIO`                    | Origen público para el canonical y el sitemap; se lee **al compilar** | `http://localhost:3000` |

## Probar el tutor con tu propia clave

Sin clave, la aplicación no falla: el tutor pasa a un **modo reducido** con preguntas de práctica y correcciones fijas por nivel, y lo avisa en pantalla. Para conversar con el modelo, crea una clave en Google AI Studio, ponla en `GOOGLE_GENERATIVE_AI_API_KEY` dentro de `.env` y arranca de nuevo (`npm run dev` o `docker compose up --build`). `GET /api/tutor` devuelve `{ "modo": "modelo" }` cuando la clave está activa.

## Pruebas

```bash
npm run lint && npm run typecheck && npm run format:check
npm test                  # Vitest: física, Worker, escena, galería, almacén, tutor e invariantes del repo
npx playwright install chromium   # solo la primera vez
npm run test:e2e          # Playwright: compila, sirve y prueba en navegador (WebGL por software)
npm run medir:fisica      # contrasta con un integrador independiente las cifras de los ADR de física
```

## Arquitectura en 10 líneas

1. `src/lib/` es TypeScript puro (sin React ni DOM): `fisica/`, `escena/`, `galeria/`, `ley/` y `tutor/`.
2. La física (RK4 con paso adaptativo) corre en un Web Worker de `src/workers/`; la interfaz nunca integra.
3. `three` solo se importa desde `src/components/escena/` y se carga con `next/dynamic` y `ssr: false`, en un chunk aparte.
4. Las miniaturas SVG se calculan en el servidor al prerenderizar.
5. Las rutas de detalle son estáticas (`generateStaticParams`): seis HTML, sin servidor en tiempo de petición.
6. `zustand` solo vive en `src/store/`, con un almacén por proveedor y sin persistencia.
7. El tutor es `src/app/api/tutor/route.ts`, un cableado fino sobre un manejador inyectable de `src/lib/tutor/`, con Vercel AI SDK y Gemini.
8. La clave del modelo solo se lee en el servidor, sin prefijo `NEXT_PUBLIC_`.
9. Las herramientas del tutor no tienen `execute` en el servidor: las ejecuta el cliente, tras validar con zod.
10. ESLint confina `three`, `zustand` y el SDK de IA a sus carpetas; los tokens de color viven solo en `@theme` (`DESIGN.md`).

## Decisiones técnicas y su coste

Detalle en `docs/adr/` y en `docs/tickets/`.

| Decisión                                                    | Coste                                                                                    |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| RK4 con paso adaptativo e interpolación de Hermite          | Más código que un paso fijo; la precisión está medida contra un integrador independiente |
| Trayectorias calculadas en un Worker                        | Un instante inicial en el que solo se ve la miniatura                                    |
| `three` con imports con nombre y chunk aparte (136 KB gzip) | No entra en la primera pintura, pero pesa; solo WebGL2                                   |
| Miniaturas SVG en el servidor                               | El HTML de `/` pasa a 135 KB (desde 21 KB)                                               |
| Zustand por proveedor, no por módulo                        | Algo más de ceremonia; evita filtrar estado entre peticiones                             |
| Vercel AI SDK + Gemini                                      | Un solo proveedor; el tutor depende de una cuota externa                                 |
| Páginas estáticas con `generateStaticParams`                | `/orbitas` da 404; `URL_SITIO` se fija al compilar                                       |
| Tailwind v4 con tokens en `@theme`                          | Prohíbe valores sueltos; cada color nuevo pasa por `DESIGN.md`                           |
| Inter autoalojada                                           | Un `woff2` más en el build, pero sin llamadas a terceros                                 |

## Mediciones

Medidas en GRV-04 (gzip nivel 9, scripts que referencia el HTML de `/`): JS inicial de `/` de 183 932 B frente a 181 502 B de base (+2,4 KB); HTML de `/` de 135 KB y de cada detalle, entre 34 y 44 KB; build en frío de ≈ 12 s; telemetría a ≈ 10 Hz; tras 12 idas y vueltas queda 1 contexto WebGL vivo.

**Lighthouse** (móvil, compilación de producción, 29 de octubre de 2026, WebGL por software en un contenedor sin GPU):

| Página                              | Rendimiento | Accesibilidad | Buenas prácticas | SEO | LCP   | CLS | TBT      |
| ----------------------------------- | ----------- | ------------- | ---------------- | --- | ----- | --- | -------- |
| `/`                                 | 73          | 100           | 100              | 100 | 1,0 s | 0   | 1 790 ms |
| `/orbitas/butterfly-i`              | 82          | 100           | 100              | 100 | 0,8 s | 0   | 720 ms   |
| `/` sin WebGL (`--disable-3d-apis`) | 89          | n/d           | n/d              | n/d | 0,9 s | 0   | 430 ms   |

Accesibilidad, buenas prácticas y SEO cumplen el objetivo (≥ 95). **El rendimiento no llega a 90 en móvil** y el tiempo de bloqueo (TBT) queda lejos de los 200 ms: casi todo viene de dibujar la escena 3D con WebGL por software en la CPU, que Lighthouse mide aquí sin GPU (sin WebGL, el rendimiento sube a 89). En un móvil real con GPU se espera menos bloqueo, pero no se ha medido. Lo que sí se cumple: LCP ≤ 2,5 s, CLS ≤ 0,05 y JS inicial sin three ≤ 110 KB gzip.

## Límites

Qué se recortó y por qué:

- **Sin buscador de órbitas propias**: quedó fuera de alcance para acotar el trabajo.
- **Sin estado en la URL**: la URL identifica la órbita; velocidad, estela, posición y vista no se comparten.
- **Sin imágenes Open Graph**: el `openGraph` lleva título, descripción y URL, pero ninguna imagen.
- **Tutor solo con Google**: otro `LLM_PROVIDER` degrada a modo reducido.
- **Límite por IP en memoria** (10 peticiones por minuto): se reinicia con cada instancia y no escala; no hay límite distribuido.
- **La restricción de tema es por prompt** y no es infalible; se prueba el prompt, no la obediencia del modelo.
- **Sin persistencia**: nada sobrevive a recargar (ni `localStorage` ni conversaciones).
- **`/orbitas` da 404**: no hay ruta índice; la galería está en `/#galeria`.
- **El hero no es un sistema solar**: muestra la figura de ocho como invitación a las órbitas.
- **Rendimiento móvil por debajo del objetivo**: 73 en la portada y 82 en un detalle (objetivo 90), por el coste de la escena 3D con WebGL por software; no se ha medido en un dispositivo real.
- **WebGL2 obligatorio** para la escena 3D.
- No se ha consultado el artículo original de Moore (1993); las demás fuentes sí se cotejaron (ADR 0004).

## Seguridad básica

- La clave del modelo solo existe en el servidor; los E2E comprueban que no aparece en el HTML ni en los scripts del cliente.
- Los errores del proveedor nunca se reenvían tal cual (podrían citar la clave).
- Al desplegar, usa una clave **sin facturación** (plan gratuito de Google AI Studio) para acotar el coste de un abuso.
- Entrada del tutor acotada (32 KB, 20 mensajes, 1000 caracteres por mensaje, 400 tokens de salida) y validada con zod.

## Créditos de las fuentes físicas

- Lagrange, J.-L. (1772). Solución equilátera del problema de los tres cuerpos.
- Moore, C. (1993). Figura de ocho. _Phys. Rev. Lett._ 70, 3675.
- Chenciner, A. y Montgomery, R. (2000). Existencia de la figura de ocho. _Ann. Math._ 152, 881–901 (condiciones iniciales de C. Simó).
- Šuvakov, M. y Dmitrašinović, V. (2013). Butterfly I, Goggles, Moth I y Yin-Yang I. _Phys. Rev. Lett._ 110, 114301.

## Documentación

- `docs/specs/`: qué se construye en cada ticket y cómo se comprueba.
- `docs/tickets/`: qué se construyó, paso a paso, y qué se aprendió.
- `docs/adr/`: decisiones técnicas con su razón y su coste.
- `docs/estado.md`: estado actual del repositorio.
- `DESIGN.md`: sistema visual.
