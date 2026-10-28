# GRV-03 · Sistema de diseño y escena 3D

**Estado:** borrador revisado, pendiente de aprobación · **Tamaño:** L · **Rama:** `feature/sistema-de-diseno-y-escena-3d` → `develop`

## Contexto

GRV-01 dejó Tailwind y los ocho colores. GRV-02 dejó el motor que calcula las órbitas. Falta lo visible: el sistema de diseño completo (tipografía, escalas, accesibilidad base) y el componente de escena que dibuja una órbita en 3D. Lo usarán la portada (escena hero, en este ticket), el detalle de cada órbita (GRV-04) y el tutor (GRV-05). La portada es además la primera página que usa el Worker de GRV-02 en un navegador, así que el criterio 11 es su prueba permanente.

## Alcance

1. **Sistema de diseño.** Tokens completos en `@theme`, tipografía Inter autoalojada con `next/font` y reglas base: foco visible, peso del texto según el ancho y `prefers-reduced-motion`.
2. **Estructura accesible del layout.** Enlace de salto, cabecera, `main` y pie.
3. **Núcleo puro de la escena** en `src/lib/escena/`: cámara, estelas, miniatura y campo ambiental. TypeScript puro, sin three, probado en Node.
4. **`EscenaOrbita`**: componente con three que dibuja los tres cuerpos, sus estelas hechas de triángulos y un campo ambiental, con cámara controlable por ratón y teclado, y que se detiene cuando no se ve.
5. **`VisorOrbita`**: envoltorio que muestra primero la miniatura SVG, carga la escena y la trayectoria sin bloquear la primera pintura, ofrece el control de animación y, si no hay WebGL2 o falla el cálculo, deja la miniatura con un aviso.
6. **Portada.** La escena hero con la figura de ocho y su titular, que sustituyen al marcador provisional.

## Fuera de alcance

Controles de reproducción completos (velocidades, deslizador de posición y de longitud de estela), telemetría, rutas de detalle y galería (GRV-04). `fijarPosicion` y el estado inicial de posición y vista, que añadirá GRV-04 a la interfaz `ApiEscena`. Giro automático de la cámara y pellizco táctil (la cámara se mueve solo cuando el usuario actúa). La ley interactiva y el tutor (GRV-05). Medir el presupuesto de rendimiento y Lighthouse (GRV-06). Postprocesado.

## Decisiones propuestas

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Tipografía | Inter variable autoalojada: `next/font/local` sobre el archivo `latin` de `@fontsource-variable/inter` | El build no necesita llegar a Google Fonts, un archivo cubre los pesos 200 a 600 y la licencia es OFL. Si Turbopack no resuelve la ruta en `node_modules`, se copia el `woff2` y su licencia al repositorio. Coste: una dependencia más y solo el subconjunto latino |
| Espaciado | `--spacing: 6px` como unidad base de Tailwind | `p-1` a `p-20` son múltiplos de 6 y la escala 6, 12, 18, 24, 30, 36, 60, 96 y 120 sale de 1, 2, 3, 4, 5, 6, 10, 16 y 20. Cambia el significado de `p-4` y `gap-6` respecto a la portada actual |
| Colores en JavaScript | `@theme static` para que Tailwind emita siempre las variables; la escena lee `--color-*` del documento al montar | Los colores siguen viviendo solo en `globals.css`. Una prueba de repositorio impide literales hexadecimales en `src/components/escena` y `src/lib/escena` |
| three | Importaciones con nombre, cargado con `next/dynamic` y `ssr: false`; solo `ShaderMaterial`; `ColorManagement` desactivado y `outputColorSpace` lineal; lienzo opaco | Chunk aparte que no entra en la primera pintura, y los colores de pantalla son exactamente los de los tokens. `ColorManagement` es global: se toca una vez al cargar el módulo. Coste: código imperativo |
| Cuerpos | Un punto grande con halo radial, con el mismo sombreador que las marcas | Sin esfera, sprite ni textura. Menos código y un solo tratamiento de color |
| Cómo llega la órbita | La miniatura SVG se calcula en el servidor al prerenderizar; la trayectoria completa la pide el cliente al Worker | El HTML ya trae algo visible y no se envían ≈70 KB por la red. Coste: un instante en el que solo se ve la miniatura |
| Estelas | Polilínea con los nodos adaptativos, exacta en los encuentros cercanos, y marcas triangulares ancladas a una rejilla fija del periodo | Una estela de muestras uniformes cortaría las curvas (ADR 0002). Las marcas ancladas se calculan una vez con `muestrear` y no cuestan llamadas por fotograma. Coste: hasta ≈27 000 vértices en el peor caso (Goggles con estela completa) |
| Alfa de la estela | Función del tiempo (edad relativa), no del índice del vértice | Con nodos adaptativos, los encuentros acumulan cientos de nodos en un instante y el degradado por índice los comería |
| Ciclo de vida | El lienzo lo crea three en cada montaje y se añade a un `div` de React; la limpieza cancela el bucle, desconecta observadores, libera geometrías y materiales y pierde el contexto | Evita fugas de contexto WebGL y problemas con StrictMode. Las props cambian dentro del bucle por referencias, sin recrear el renderer |
| Detección | Una sonda previa con `getContext('webgl2')` sobre un lienzo desechable; un `webglcontextlost` se trata como falta de WebGL | three ≥ r163 solo admite WebGL2. Sin la sonda, three escribe un error en la consola antes de fallar |
| Pruebas de la escena | Playwright con el WebGL del Chromium; `pngjs` para contar píxeles; WebGL desactivado con un script de inicio que hace devolver `null` a `getContext` | Se comprueba que se dibuja de verdad. Coste: una dependencia de desarrollo y pruebas que dependen de WebGL por software en el CI |
| Control de animación | Botón «Pausar animación» o «Reproducir animación» junto a la escena, más la tecla Espacio | Lo exige la accesibilidad (WCAG 2.2.2) para todo movimiento automático |
| Lienzo accesible | `role="img"`, `tabindex="0"`, `aria-label` descriptivo y `aria-describedby` hacia un texto de instrucciones visible; el foco se dibuja hacia dentro | Es suficiente para el teclado y documenta su límite con lectores de pantalla |

## Contratos

```ts
// src/lib/escena/camara.ts  (sin three ni DOM)
export interface VistaCamara { acimut: number; polar: number; distancia: number } // distancia: múltiplo de distanciaInicial
export const VISTA_INICIAL: VistaCamara; // acimut 0,6; polar 1,0; distancia 1
export const POLAR_MINIMO = 0.12; // y POLAR_MAXIMO = π − 0,12
export const DISTANCIA_MINIMA: number; // 1,6 / 3,3
export const DISTANCIA_MAXIMA: number; // 10 / 3,3

export type OrdenCamara =
  | { tipo: 'girar'; dAcimut: number; dPolar: number }
  | { tipo: 'acercar'; factor: number } // factor < 1 acerca
  | { tipo: 'restablecer' };

export interface Modificadores { ctrl: boolean; meta: boolean; alt: boolean }
// Flechas giran 0,14 (acimut) y 0,1 (polar); + y = acercan con 0,88; - aleja con 1,14; Home restablece;
// el espacio devuelve 'alternar'. Con cualquier modificador, o con otra tecla, devuelve null.
export function ordenDeTecla(tecla: string, modificadores?: Modificadores): OrdenCamara | 'alternar' | null;
export function ordenDeArrastre(dx: number, dy: number): OrdenCamara; // 0,008 rad por píxel
export function ordenDeRueda(deltaY: number): OrdenCamara;           // factor exp(deltaY · 0,0012)
export function aplicarOrden(vista: VistaCamara, orden: OrdenCamara): VistaCamara; // respeta límites; acimut en [0, 2π)
export function distanciaInicial(radioMaximo: number, relacionAspecto: number): number; // 3,3 · radio; mayor si es vertical
export function posicionCamara(vista: VistaCamara, distanciaBase: number): [number, number, number]; // esféricas, z arriba
```

```ts
// src/lib/escena/estela.ts
export const MARCAS_POR_PERIODO = 240; // rejilla fija u_k = k / 240
export interface DatosCuerpo { linea: Float32Array; lineaAlfa: Float32Array; marcas: Float32Array; marcasAlfa: Float32Array }
export type DatosEstelas = [DatosCuerpo, DatosCuerpo, DatosCuerpo];
export function alfaDeEdad(edadRelativa: number): number; // (1 − e)^1,6, con e en [0, 1]
export function crearDatosEstelas(t: Trayectoria): DatosEstelas; // línea: n + 1 vértices por cuerpo; precalcula la rejilla con muestrear
export function construirEstelas(
  t: Trayectoria, u: number, longitud: number, destino: DatosEstelas,
): { vertices: number; marcas: number }; // RangeError si longitud no está en [0,05, 1] o u no es finito
```

Algoritmo de `construirEstelas`, en tiempo desenvuelto: `tFin = envolver(u) · T`, `tInicio = tFin − longitud · T` (puede ser negativo). Los vértices son `estadoEn` en el inicio, después los nodos con tiempo **estrictamente** entre inicio y fin recorridos con módulo y sin incluir nunca el último nodo, y al final `estadoEn(u)`. Las marcas son los puntos de la rejilla cuyo tiempo desenvuelto cae en `(tInicio, tFin]`. La edad relativa es `(tFin − t) / (longitud · T)`.

```ts
// src/lib/escena/miniatura.ts
export interface TrazadoMiniatura { viewBox: string; trazos: [string, string, string] }
// Diezma conservando un punto solo si dista más de radioMaximo / 200 del anterior, más el último;
// invierte y; coordenadas con 3 decimales.
export function trazarMiniatura(t: Trayectoria): TrazadoMiniatura;

// src/lib/escena/ambiente.ts
export interface CampoAmbiental { posiciones: Float32Array; paleta: Uint8Array; alfas: Float32Array }
export function generarCampoAmbiental(cantidad: number, semilla: number): CampoAmbiental; // determinista
```

```tsx
// src/components/escena/
interface ApiEscena { restablecerVista(): void }
interface PropsEscenaOrbita {
  trayectoria: Trayectoria; etiqueta: string; descripcionId: string; reproduciendo: boolean;
  alAlternarReproduccion?: () => void;
  velocidad?: number;       // 1
  longitudEstela?: number;  // 0,5; entre 0,05 y 1
  ruedaActiva?: boolean;    // false
  particulasAmbientales?: number; // 300
  alListo?: (api: ApiEscena) => void;
  alFotograma?: (u: number, estado: Readonly<Estado>) => void; // el buffer se reutiliza: no guardarlo
  alError?: (causa: Error) => void; // sin WebGL2 o contexto perdido
}
interface PropsVisorOrbita { slug: Slug; miniatura: TrazadoMiniatura; titulo: string; controlAnimacion?: boolean /* true */ }
<MiniaturaOrbita trazado />   // presentacional, sin 'use client'
```

**Atributos de estado** del contenedor del visor, que forman parte del contrato de las pruebas: `data-estado-escena` (`cargando`, `lista`, `sin-webgl` o `error`), `data-reproduciendo` (`true` o `false`), `data-vista` (`"acimut polar distancia"`, con 3 decimales y el valor objetivo, no el suavizado), `data-posicion` (fracción del periodo con 3 decimales) y `data-fotogramas` (contador entero). Los dos últimos se actualizan como mucho cada 100 ms.

**Tokens** (en `@theme static` de `src/app/globals.css`, documentados en `DESIGN.md`): `--font-sans`; `--text-etiqueta` 14 px, `--text-cuerpo` 18 px, `--text-titular-xs` 27 px, `--text-subtitulo` 36 px, `--text-titular-sm` 42 px, `--text-titular` 48 px y `--text-titular-lg` y `--text-display`, que usan `clamp` para ir de 46 px en móvil a 78 px y 113 px en escritorio; cada tamaño con su `--text-x--line-height` y su `--text-x--letter-spacing`; `--spacing: 6px`; `--radius-boton` 24 px; `--container-pagina` 1280 px.

## Criterios de aceptación

Las pruebas puras van en `tests/unit/escena/` y `tests/repo/`; las de navegador, en `tests/e2e/`, agrupadas en pocos archivos con un solo `goto` por estado.

**Sistema de diseño**

1. **Tokens completos.** Dado `src/app/globals.css`, cuando se lee su bloque `@theme static`, entonces define los ocho colores, la fuente, la escala tipográfica con su interlineado y su espaciado entre letras, `--spacing`, el radio y el ancho máximo; `DESIGN.md` documenta cada token con su valor; y ningún archivo de `src/components/escena` ni de `src/lib/escena` contiene un literal de color hexadecimal. *(Vitest)*
2. **Fuente local.** Dado `src/`, entonces no hay `next/font/google` ni `googleapis`, y el layout carga la fuente con `next/font/local`. *(Vitest)*
3. **Texto en pantalla.** Dada la portada, cuando carga, entonces la fuente Inter está cargada (`document.fonts.ready` y alguna cara con estado `loaded`), no hubo peticiones a `fonts.googleapis.com` ni a `fonts.gstatic.com`; con un ancho de 640 px o más el cuerpo mide 18 px con peso 200 y por debajo tiene peso 300; y los titulares tienen peso 400. *(Playwright)*
4. **Estructura accesible.** Dada la portada, cuando se pulsa Tab, entonces el primer elemento enfocado es el enlace de salto, visible, y al activarlo el foco pasa a `#contenido`; hay `header`, `main` y `footer`; y el contorno de foco visible es blanco de 2 px. *(Playwright)*

**Núcleo puro**

5. **Cámara.** Dadas las órdenes de la cámara, entonces cada tecla devuelve la orden de la tabla (flechas, `+`, `=`, `-`, `Home`, espacio) y `null` con cualquier otra tecla o con Ctrl, Meta o Alt pulsados; el ángulo polar y la distancia nunca salen de sus límites aunque se repita la orden; el acimut se normaliza a `[0, 2π)`; `restablecer` devuelve `VISTA_INICIAL`; `distanciaInicial` crece con el radio y es mayor en pantallas verticales; y `posicionCamara` devuelve puntos a `distancia · distanciaBase` del origen. *(Vitest)*
6. **Estelas.** Dada una trayectoria, una fracción `u` y una longitud, cuando se construyen las estelas, entonces el último vértice de cada cuerpo es `estadoEn(t, u)` y el primero corresponde al instante `u − longitud`; con `longitud = 1` hay exactamente `n + 1` vértices también en `u = 0`, en un nodo exacto y justo antes de 1; con envoltura no se repite el último nodo ni hay vértices duplicados; el alfa de un vértice depende solo de su edad (a la mitad de la longitud vale `alfaDeEdad(0,5)` sea cual sea la densidad de nodos); las marcas son puntos de la rejilla fija dentro de la ventana, con la misma posición entre fotogramas mientras no salgan de ella; una longitud fuera de `[0,05, 1]` o un `u` no finito lanzan `RangeError`; no hay `NaN`; y reutilizar el destino no cambia el resultado. *(Vitest)*
7. **Miniatura.** Dada cada una de las seis órbitas, cuando se traza su miniatura, entonces hay tres trazos de como máximo 400 puntos con coordenadas finitas, la `y` está invertida, el `viewBox` contiene todos los puntos con un margen, el `d` total ocupa menos de 12 KB y el resultado es idéntico en dos llamadas. *(Vitest)*
8. **Campo ambiental.** Dado un número y una semilla, cuando se genera el campo, entonces dos llamadas dan los mismos valores, hay exactamente ese número de partículas a una distancia del origen entre 4,5 y 15,5, con alfa entre 0,18 y 0,58 y un índice de paleta válido. *(Vitest)*

**Escena en el navegador**

9. **Miniatura desde el servidor.** Dada la portada con JavaScript desactivado, entonces el HTML trae la miniatura SVG de la figura de ocho con sus tres trazos. *(Playwright)*
10. **three fuera del código inicial.** Dada la portada, cuando se descarga su HTML, entonces ninguno de los JavaScript que referencia (`<script src>` y `<link rel="preload" as="script">`) contiene `WebGLRenderer`, y al menos uno de los que se cargan después sí lo contiene. *(Playwright)*
11. **La escena se dibuja.** Dada la portada con WebGL, cuando carga, entonces el contenedor pasa a `data-estado-escena="lista"`, la miniatura deja de ser visible, hay un lienzo opaco con `role="img"`, etiqueta descriptiva, `aria-describedby` y `tabindex="0"`, el texto de instrucciones es visible, y una captura del lienzo tiene al menos 150 píxeles cerca de cada uno de los tres colores de los cuerpos (tolerancia de 60 por canal). Esta es la prueba permanente del Worker en el navegador. *(Playwright con `pngjs`)*
12. **Control de la cámara.** Dado el lienzo con foco, cuando se pulsa una flecha, entonces `data-vista` cambia; cuando se pulsa `+` sin modificadores, la distancia disminuye, y con Ctrl pulsado no cambia; `Home` devuelve la vista inicial; arrastrar con el ratón la cambia; la rueda sobre el lienzo desplaza la página y no cambia la vista; y el lienzo tiene `touch-action: pan-y`. *(Playwright)*
13. **Animación.** Dada la escena en marcha, cuando se pulsa «Pausar animación» o la tecla Espacio, entonces `data-reproduciendo` pasa a `false`, el texto del botón pasa a «Reproducir animación» y `data-posicion` y `data-vista` no cambian durante un segundo; al reanudar, la posición avanza sin saltar; el botón mide al menos 44 px de alto y de ancho; y no aparece hasta que la escena está lista. *(Playwright)*
14. **Movimiento reducido.** Dado `prefers-reduced-motion: reduce`, cuando carga la portada, entonces la escena empieza pausada y `data-posicion` no cambia en un segundo. *(Playwright)*
15. **Pausa cuando no se ve.** Dada la escena en marcha, cuando `document.hidden` pasa a verdadero (redefinido con `Object.defineProperty`) y se lanza `visibilitychange`, entonces `data-fotogramas` deja de crecer; al volver crece de nuevo y la posición no salta. *(Playwright)*
16. **Estados alternativos.** Dado un navegador sin WebGL2 (un script de inicio hace que `getContext` devuelva `null`), cuando carga la portada, entonces el contenedor pasa a `data-estado-escena="sin-webgl"`, la miniatura sigue visible, un elemento `role="status"`, presente desde el principio, explica que no se puede mostrar la escena 3D, el botón de animación no aparece y no hay eventos `pageerror` ni errores de consola salvo `Failed to load resource`. Dado que falla la carga del Worker (la petición se aborta), entonces el estado es `error`, con la miniatura y un aviso. *(Playwright)*
17. **Lienzo estable.** Dada la escena en marcha, cuando se pausa y se reanuda, entonces el lienzo es el mismo elemento; con `deviceScaleFactor: 3` el ancho del lienzo no pasa del doble de su ancho en CSS; y el contenedor del visor tiene la misma caja antes y después de `lista`. *(Playwright)*
18. **Responsive.** Dada la portada a 375, 768 y 1440 px, entonces no hay desbordamiento horizontal y la escena mide al menos 360 px de alto en móvil. *(Playwright)*

La limpieza al desmontar el componente (muchas idas y vueltas sin aviso de demasiados contextos WebGL) no tiene prueba en este ticket, porque la portada no navega: se comprobará en GRV-04, con el primer E2E con navegación.

## Orden de trabajo

1. `docs`: esta spec y sus correcciones.
2. `test`: criterios 1 a 18 en rojo, con `pngjs` como dependencia de desarrollo. Este commit marca la spec como aprobada.
3. `feat`: dependencias (`three`, `@types/three`, `@fontsource-variable/inter`), tokens y layout, núcleo puro, componentes y portada. También los cambios de `devops`: `playwright.config.ts` con los argumentos de SwiftShader y una regla de ESLint que prohíbe importar `three` fuera de `src/components/escena/`.
4. `docs`: ADR 0005 (escena, estelas y color), `DESIGN.md`, `AGENTS.md` (propiedad de `src/lib/escena/` y de `DESIGN.md`), ticket y estado.
5. Revisión y enlace para abrir el PR.

## Traspasos tras la aprobación

`frontend` (tokens, layout, componentes, portada y `src/lib/escena/`), `devops` (`playwright.config.ts` y la regla de ESLint), `arquitecto` (ADR 0005 y `DESIGN.md`), `documentacion` (ticket y estado), `pr-reviewer` (revisión).

## Riesgos y límites

- **WebGL en el CI.** Las pruebas necesitan WebGL por software en GitHub Actions. El flujo solo corre en PR y en `develop`/`main`, así que si falla se verá en el primer PR. Se añaden los argumentos de SwiftShader a la configuración como precaución.
- **Migración de tokens.** Cambiar `--spacing` altera el significado de `p-4` y `gap-6`: hay que revisar la portada y las pruebas de GRV-01.
- **`next/font/local` con `node_modules` y Turbopack.** Si no lo resuelve, se copia el archivo y su licencia al repositorio.
- **Tamaño de three.** No se mide hasta GRV-06; si no cabe en el presupuesto, se poda.
- **Tamaño de punto.** El máximo de `gl_PointSize` depende de la GPU. El tamaño usado (≈ 9 px CSS por DPR) queda muy por debajo de los límites habituales.
- **Lectores de pantalla.** El lienzo es una imagen con instrucciones visibles; los lectores en modo lectura pueden interceptar las flechas. Se documenta el límite.
- **Pausa por visibilidad en el lienzo.** La parte de `IntersectionObserver` no tiene prueba, porque la portada cabe en la pantalla. Se prueba el caso de la pestaña oculta.
- **Movimiento reducido en caliente.** El estado inicial se decide al cargar; los cambios de preferencia durante la sesión no se escuchan.
- **Los atributos `data-*`** son parte del contrato de las pruebas.
