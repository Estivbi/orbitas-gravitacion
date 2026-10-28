# GRV-03 · Sistema de diseño y escena 3D

**Estado:** implementada, pendiente de revisión · **Tamaño:** L · **Rama:** `feature/sistema-de-diseno-y-escena-3d` → `develop`

## Contexto

GRV-01 dejó Tailwind y los ocho colores. GRV-02 dejó el motor que calcula las órbitas. Falta lo visible: el sistema de diseño completo (tipografía, escalas, accesibilidad base) y el componente de escena que dibuja una órbita en 3D. Lo usarán la portada (escena hero, en este ticket), el detalle de cada órbita (GRV-04) y el tutor (GRV-05). La portada es además la primera página que usa el Worker de GRV-02 en un navegador, así que el criterio 11 es su prueba permanente.

## Alcance

1. **Sistema de diseño.** Tokens completos en `@theme`, tipografía Inter autoalojada con `next/font` y reglas base: foco visible, peso del texto según el ancho (300 con menos de 640 px de ancho de viewport y 200 desde 640 px; los titulares `h1` a `h6` tienen peso 400 en cualquier ancho) y `prefers-reduced-motion`.
2. **Estructura accesible del layout.** Enlace de salto, cabecera, `main` y pie.
3. **Núcleo puro de la escena** en `src/lib/escena/`: cámara, estelas, miniatura y campo ambiental. TypeScript puro, sin three, probado en Node.
4. **`EscenaOrbita`**: componente con three que dibuja los tres cuerpos, sus estelas hechas de triángulos y un campo ambiental, con cámara controlable por ratón, tacto (arrastre y pellizco) y teclado, giro automático opcional de la cámara, posición controlable desde fuera, y que se detiene cuando no se ve.
5. **`VisorOrbita`**: envoltorio que muestra primero la miniatura SVG, carga la escena y la trayectoria sin bloquear la primera pintura, ofrece el control de animación y, si no hay WebGL2 o falla el cálculo, deja la miniatura con un aviso.
6. **Portada.** La escena hero con la figura de ocho y su titular, que sustituyen al marcador provisional. La portada conserva la etiqueta «Gravitación universal» (color `saffron-spark`) y el `h1` «Tres cuerpos, una sola curva.» del marcador provisional, para que las pruebas de humo de GRV-01 sigan valiendo.

## Fuera de alcance

La interfaz de los controles de reproducción (selector de velocidades, deslizador de posición y de longitud de estela), la telemetría, las rutas de detalle y la galería (GRV-04). Este ticket deja la escena preparada para ellos: acepta velocidad, longitud de estela, posición y vista inicial por props, y expone `fijarPosicion`. La ley interactiva y el tutor (GRV-05). Medir el presupuesto de rendimiento y Lighthouse (GRV-06). Postprocesado.

## Decisiones propuestas

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Tipografía | Inter variable autoalojada: `next/font/local` sobre el archivo `latin` de `@fontsource-variable/inter` | El build no necesita llegar a Google Fonts, un archivo cubre los pesos 200 a 600 y la licencia es OFL. Si Turbopack no resuelve la ruta en `node_modules`, se copia el `woff2` y su licencia al repositorio. Coste: una dependencia más y solo el subconjunto latino |
| Espaciado | `--spacing: 6px` como unidad base de Tailwind | `p-1` a `p-20` son múltiplos de 6 y la escala 6, 12, 18, 24, 30, 36, 60, 96 y 120 sale de 1, 2, 3, 4, 5, 6, 10, 16 y 20. Cambia el significado de `p-4` y `gap-6` respecto a la portada actual |
| Colores en JavaScript | `@theme static` para que Tailwind emita siempre las variables; la escena lee `--color-*` del documento al montar | Los colores siguen viviendo solo en `globals.css`. Una prueba de repositorio impide literales hexadecimales en `src/components/escena` y `src/lib/escena` |
| three | Importaciones con nombre, cargado con `next/dynamic` y `ssr: false`; solo `ShaderMaterial`; `ColorManagement` desactivado y `outputColorSpace` lineal; lienzo opaco | Chunk aparte que no entra en la primera pintura, y los colores de pantalla son exactamente los de los tokens. `ColorManagement` es global: se toca una vez al cargar el módulo. Coste: código imperativo |
| Cuerpos | Un punto grande con halo radial, con el mismo sombreador que las marcas; colores, por índice de cuerpo, cuerpo 0 `electric-iris`, cuerpo 1 `saffron-spark` y cuerpo 2 `orbit-teal`, como fija `DESIGN.md` (que manda sobre el prototipo) | Sin esfera, sprite ni textura. Menos código y un solo tratamiento de color |
| Cómo llega la órbita | La miniatura SVG se calcula en el servidor al prerenderizar; la trayectoria completa la pide el cliente al Worker | El HTML ya trae algo visible y no se envían ≈70 KB por la red. Coste: un instante en el que solo se ve la miniatura |
| Estelas | Polilínea con los nodos adaptativos, exacta en los encuentros cercanos, y marcas triangulares ancladas a una rejilla fija del periodo | Una estela de muestras uniformes cortaría las curvas (ADR 0002). Las marcas ancladas se calculan una vez con `muestrear` y no cuestan llamadas por fotograma. Coste: hasta ≈27 000 vértices en el peor caso (Goggles con estela completa) |
| Alfa de la estela | Función del tiempo (edad relativa), no del índice del vértice | Con nodos adaptativos, los encuentros acumulan cientos de nodos en un instante y el degradado por índice los comería |
| Ciclo de vida | El lienzo lo crea three en cada montaje y se añade a un `div` de React; la limpieza cancela el bucle, desconecta observadores, libera geometrías y materiales y pierde el contexto | Evita fugas de contexto WebGL y problemas con StrictMode. Las props cambian dentro del bucle por referencias, sin recrear el renderer |
| Detección | Una sonda previa con `getContext('webgl2')` sobre un lienzo desechable; un `webglcontextlost` se trata como falta de WebGL | three ≥ r163 solo admite WebGL2. Sin la sonda, three escribe un error en la consola antes de fallar |
| Pruebas de la escena | Playwright con el WebGL del Chromium; `pngjs` para contar píxeles; WebGL desactivado con un script de inicio que hace devolver `null` a `getContext`; el fallo del Worker se simula sustituyendo `window.Worker` por una clase que emite `error` | Se comprueba que se dibuja de verdad. Coste: una dependencia de desarrollo y pruebas que dependen de WebGL por software en el CI |
| Giro automático | Opcional (`giroAutomatico`), activo en la portada: 0,06 rad/s de acimut. Se detiene al pausar, con movimiento reducido y en cuanto la persona toca la cámara (con teclado, arrastre de ratón o gesto táctil); no vuelve solo | Da vida a la portada sin quitar el control. Cuenta como movimiento automático, así que obedece al mismo botón de pausa |
| Tacto | Un dedo en horizontal gira el acimut; un dedo en vertical desplaza la página (`touch-action: pan-y`); dos dedos acercan y alejan | El móvil no puede quedarse atrapado en la escena al hacer scroll. Coste: con un dedo no se controla el ángulo polar; en móvil se hace con dos dedos o con teclado |
| Reloj de la órbita | La fracción del periodo avanza con una función pura (`avanzarPosicion`), con velocidad, envoltura y posición fijada desde fuera | Se prueba en Node, y GRV-04 reutiliza lo mismo para su deslizador |
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
// Sentidos (copiados del prototipo docs/diseno/referencia/observatorio.html):
//   ArrowLeft  → girar { dAcimut: −0,14, dPolar: 0 }    ArrowRight → girar { dAcimut: +0,14, dPolar: 0 }
//   ArrowUp    → girar { dAcimut: 0, dPolar: −0,1 }     ArrowDown  → girar { dAcimut: 0, dPolar: +0,1 }
// + y = acercan con 0,88; - aleja con 1,14; Home restablece; el espacio devuelve 'alternar'.
// Con cualquier modificador, o con otra tecla, devuelve null.
// Un incremento nulo vale 0 (el valor −0 es aceptable).
export function ordenDeTecla(tecla: string, modificadores?: Modificadores): OrdenCamara | 'alternar' | null;
// 0,008 rad por píxel: dAcimut = −dx · 0,008 y dPolar = −dy · 0,008 (arrastrar a la derecha o hacia abajo
// resta acimut y polar, como en el prototipo). Un desplazamiento nulo da 0 (−0 aceptable).
export function ordenDeArrastre(dx: number, dy: number): OrdenCamara;
export function ordenDeRueda(deltaY: number): OrdenCamara;           // factor exp(deltaY · 0,0012)
export function ordenDePellizco(separacionAnterior: number, separacionActual: number): OrdenCamara | null; // factor anterior / actual; null si alguna es ≤ 0
export const VELOCIDAD_GIRO_AUTOMATICO = 0.06; // rad/s
// Solo cambia el acimut, que también se normaliza a [0, 2π); dt en segundos, entre 0 y 0,25 (fuera se recorta)
export function girarAutomaticamente(vista: VistaCamara, dt: number): VistaCamara;
// Pura. Respeta los límites; el acimut queda siempre en [0, 2π): un incremento de −1e-17 desde 0 devuelve un
// valor en [0, 2π), nunca 2π. 'restablecer' devuelve VISTA_INICIAL (el componente usa en su lugar su vistaInicial).
export function aplicarOrden(vista: VistaCamara, orden: OrdenCamara): VistaCamara;
export function distanciaInicial(radioMaximo: number, relacionAspecto: number): number; // 3,3 · radio; mayor si es vertical
// Esféricas con z arriba y d = vista.distancia · distanciaBase:
// [d·sin(polar)·cos(acimut), d·sin(polar)·sin(acimut), d·cos(polar)]
export function posicionCamara(vista: VistaCamara, distanciaBase: number): [number, number, number];
```

```ts
// src/lib/escena/estela.ts
export const MARCAS_POR_PERIODO = 240; // rejilla fija u_k = k / 240
export interface DatosCuerpo { linea: Float32Array; lineaAlfa: Float32Array; marcas: Float32Array; marcasAlfa: Float32Array }
export type DatosEstelas = [DatosCuerpo, DatosCuerpo, DatosCuerpo];
export function alfaDeEdad(edadRelativa: number): number; // (1 − e)^1,6; recorta e a [0, 1] antes de calcular (evita NaN por redondeo)
// línea: con n nodos, capacidad de n + 1 vértices por cuerpo (3 valores por vértice, z = 0) y un valor de
// lineaAlfa por vértice. marcas: 3 valores por marca (z = 0) y marcasAlfa un alfa por marca; la capacidad de
// ambos es de al menos MARCAS_POR_PERIODO + 1 marcas por cuerpo. Precalcula la rejilla con muestrear.
export function crearDatosEstelas(t: Trayectoria): DatosEstelas;
export function construirEstelas(
  t: Trayectoria, u: number, longitud: number, destino: DatosEstelas,
): { vertices: number; marcas: number }; // RangeError si longitud no está en [0,05, 1] o u no es finito
```

Algoritmo de `construirEstelas`, en tiempo desenvuelto: `tFin = envolver(u) · T`, `tInicio = tFin − longitud · T` (puede ser negativo). Los vértices son `estadoEn` en el inicio, después los nodos con tiempo **estrictamente** entre inicio y fin recorridos con módulo y sin incluir nunca el último nodo, y al final `estadoEn(u)`. Las marcas son los puntos de la rejilla cuyo tiempo desenvuelto cae en `(tInicio, tFin]`. La edad relativa es `(tFin − t) / (longitud · T)`.

```ts
// src/lib/escena/reloj.ts
// Avanza la fracción del periodo: u + dt · velocidad / periodo, envuelta en [0, 1). dt entre 0 y 0,25 s; si no, se recorta.
export function avanzarPosicion(u: number, dt: number, velocidad: number, periodo: number): number;
export function envolverPosicion(u: number): number; // -1e-17 → 0, nunca 1
```

```ts
// src/lib/escena/miniatura.ts
export interface TrazadoMiniatura { viewBox: string; trazos: [string, string, string] }
// Diezmado: el primer punto es el nodo 0; se conserva un punto solo si dista más de t.radioMaximo / 25 del
// último punto conservado ("el anterior" es siempre el último conservado, no el vecino original); el último
// punto se conserva siempre. Invierte y.
// Formato: cada trazo es un `d` con comandos absolutos `M` y `L`, `M x y L x y …`, con las coordenadas de
// como máximo 3 decimales y los números separados por un espacio. El `viewBox` es "minX minY ancho alto",
// separado por espacios. (Con radioMaximo / 200 salían hasta 2000 puntos y 60 KB: incompatible con el criterio 7.)
export function trazarMiniatura(t: Trayectoria): TrazadoMiniatura;

// src/lib/escena/ambiente.ts
export const TAMANO_PALETA = 4; // violeta, azafrán, verde azulado y blanco
export interface CampoAmbiental { posiciones: Float32Array; paleta: Uint8Array; alfas: Float32Array } // posiciones: 3 valores por partícula
export function generarCampoAmbiental(cantidad: number, semilla: number): CampoAmbiental; // determinista
```

```tsx
// src/components/escena/
interface ApiEscena { restablecerVista(): void; fijarPosicion(u: number): void } // fijarPosicion envuelve u
interface PropsEscenaOrbita {
  trayectoria: Trayectoria; etiqueta: string; descripcionId: string; reproduciendo: boolean;
  alAlternarReproduccion?: () => void;
  velocidad?: number;       // 1
  longitudEstela?: number;  // 0,5; entre 0,05 y 1
  posicionInicial?: number; // 0; fracción del periodo
  vistaInicial?: VistaCamara; // VISTA_INICIAL; es también la vista a la que vuelve la orden 'restablecer' (Home)
  giroAutomatico?: boolean; // false
  ruedaActiva?: boolean;    // false
  particulasAmbientales?: number; // 300
  alListo?: (api: ApiEscena) => void;
  alFotograma?: (u: number, estado: Readonly<Estado>) => void; // el buffer se reutiliza: no guardarlo
  alError?: (causa: Error) => void; // sin WebGL2 o contexto perdido
}
// Añadido en la implementación (no figuraba en el contrato): alCambiarVista?: (vista: Readonly<VistaCamara>) => void;
// se llama de forma síncrona cada vez que cambia la vista objetivo; VisorOrbita escribe con él `data-vista`.
interface PropsVisorOrbita { slug: Slug; miniatura: TrazadoMiniatura; titulo: string; controlAnimacion?: boolean /* true */ }
<MiniaturaOrbita trazado />   // presentacional, sin 'use client'
```

**Atributos de estado** del contenedor del visor, que forman parte del contrato de las pruebas: `data-estado-escena` (`cargando`, `lista`, `sin-webgl` o `error`), `data-reproduciendo` (`true` o `false`), `data-vista` (`"acimut polar distancia"`, con 3 decimales y el valor objetivo, no el suavizado), `data-posicion` (fracción del periodo con 3 decimales) y `data-fotogramas` (contador entero). Los dos últimos se actualizan como mucho cada 100 ms. `data-vista` se escribe de forma síncrona en el mismo manejador que aplica la orden de cámara, con el valor objetivo, sin esperar al siguiente fotograma; mientras el giro automático está activo también la actualiza el bucle.

**HTML del servidor del visor.** El HTML prerenderizado trae el contenedor con `data-estado-escena="cargando"`, la miniatura SVG y una región `role="status"` vacía dentro del contenedor del visor (el aviso de `sin-webgl` y `error` se escribe en esa región, que existe desde el principio); nunca trae el botón de animación.

**Tokens** (en `@theme static` de `src/app/globals.css`, documentados en `DESIGN.md`): `--font-sans`; `--text-etiqueta` 14 px, `--text-cuerpo` 18 px, `--text-titular-xs` 27 px, `--text-subtitulo` 36 px, `--text-titular-sm` 42 px, `--text-titular` 48 px y `--text-titular-lg` y `--text-display`, que usan `clamp` para ir de 46 px en móvil a 78 px y 113 px en escritorio; cada tamaño con su `--text-x--line-height` y su `--text-x--letter-spacing`; `--spacing: 6px`; `--radius-boton` 24 px; `--container-pagina` 1280 px. La implementación añade `--breakpoint-columnas` 900 px (corte de una a dos columnas de la portada y del visor; clases `columnas:` y `max-columnas:`), documentado en `DESIGN.md`.

## Criterios de aceptación

Las pruebas puras van en `tests/unit/escena/` y `tests/repo/`; las de navegador, en `tests/e2e/`, agrupadas en pocos archivos con un solo `goto` por estado.

**Sistema de diseño**

1. **Tokens completos.** Dado `src/app/globals.css`, cuando se lee su bloque `@theme static`, entonces define los ocho colores, la fuente, la escala tipográfica con su interlineado y su espaciado entre letras, `--spacing`, el radio y el ancho máximo; `DESIGN.md` documenta cada token con su valor; los tokens de tamaño de texto valen, en px, etiqueta 14, cuerpo 18, titular-xs 27, subtitulo 36, titular-sm 42 y titular 48; y ningún archivo de `src/components/escena` ni de `src/lib/escena` contiene un literal de color: la expresión que lo comprueba cubre `#rgb`, `#rrggbb`, `#rrggbbaa`, `0x…` de 6 dígitos, `rgb(`, `rgba(`, `hsl(` y `hsla(`. *(Vitest)*
2. **Fuente local.** Dado `src/`, entonces no hay `next/font/google` ni `googleapis`, y el layout carga la fuente con `next/font/local`. *(Vitest)*
3. **Texto en pantalla.** Dada la portada, cuando carga, entonces hay una cara de fuente cargada (`document.fonts.ready` y alguna cara con estado `loaded`) y se descargó un archivo `.woff2` del propio origen (el nombre de la familia lo decide `next/font` y no se fija), y no hubo peticiones a `fonts.googleapis.com` ni a `fonts.gstatic.com`; con un ancho de viewport de 639 px el cuerpo tiene peso 300 y con 640 px mide 18 px con peso 200; y los titulares (`h1` a `h6`) tienen peso 400 a 639 px, a 640 px y también a 1280 px. *(Playwright)*
4. **Estructura accesible.** Dada la portada, cuando se pulsa Tab, entonces el primer elemento enfocado es el enlace de salto y, cuando recibe el foco, mide al menos 44 px de ancho y 44 px de alto, está dentro del viewport y tiene fondo no transparente; al activarlo, el foco pasa a `#contenido`, cuyo `tagName` es `MAIN`; hay `header`, `main` y `footer`; y el contorno de foco visible es blanco de 2 px en el enlace de salto, en el botón de animación y en el lienzo, una vez lista la escena (regla global `:focus-visible`). *(Playwright)*

**Núcleo puro**

5. **Cámara.** Dadas las órdenes de la cámara, entonces cada tecla devuelve la orden de la tabla (flechas con los signos del contrato, `+`, `=`, `-`, `Home`, espacio) y `null` con cualquier otra tecla o con Ctrl, Meta o Alt pulsados; el arrastre devuelve `dAcimut = −dx · 0,008` y `dPolar = −dy · 0,008`, y las órdenes con incremento nulo dan 0 (el valor −0 es aceptable); el pellizco acerca cuando los dedos se separan, aleja cuando se juntan y devuelve `null` con separaciones no positivas; el giro automático solo cambia el acimut, proporcionalmente a `dt` y recortando `dt` fuera de `[0, 0,25]`; el ángulo polar y la distancia nunca salen de sus límites aunque se repita la orden; el acimut se normaliza a `[0, 2π)` tanto en `aplicarOrden` como en `girarAutomaticamente`, y un incremento de acimut de −1e-17 desde 0 da un valor en `[0, 2π)`, nunca `2π`; `restablecer` devuelve `VISTA_INICIAL` (es puro; el componente usa su `vistaInicial`); `distanciaInicial` crece con el radio y es mayor en pantallas verticales; y `posicionCamara` devuelve `[d·sin(polar)·cos(acimut), d·sin(polar)·sin(acimut), d·cos(polar)]` con `d = distancia · distanciaBase` (z arriba), es decir, puntos a `d` del origen. *(Vitest)*
6. **Estelas.** Dada una trayectoria, una fracción `u` y una longitud, cuando se construyen las estelas, entonces el último vértice de cada cuerpo es `estadoEn(t, u)` y el primero corresponde al instante `u − longitud`; con `longitud = 1` y `n` nodos hay exactamente `n + 1` vértices si `u` no cae en un nodo (también justo antes de 1) y `n` si cae en uno (también `u = 0`), nunca más que la capacidad; con envoltura no se repite el último nodo ni hay dos vértices seguidos iguales; el alfa de un vértice depende solo de su edad (a la mitad de la longitud vale `alfaDeEdad(0,5)` sea cual sea la densidad de nodos) y `alfaDeEdad` recorta su argumento a `[0, 1]` (valores ligeramente fuera por redondeo no dan `NaN`); `marcas` tiene 3 valores por marca (z = 0), `marcasAlfa` un alfa por marca y la capacidad de ambos es de al menos `MARCAS_POR_PERIODO + 1` marcas por cuerpo; las marcas son puntos de la rejilla fija dentro de la ventana, con la misma posición entre fotogramas mientras no salgan de ella; una longitud fuera de `[0,05, 1]` o un `u` no finito lanzan `RangeError`; no hay `NaN`; y reutilizar el destino no cambia el resultado. *(Vitest)*
7. **Miniatura.** Dada cada una de las seis órbitas, cuando se traza su miniatura, entonces hay tres trazos de como máximo 400 puntos con coordenadas finitas, la `y` está invertida, el `viewBox` (`"minX minY ancho alto"`, separado por espacios) contiene todos los puntos con un margen, el `d` total ocupa menos de 12 KB y el resultado es idéntico en dos llamadas. Cada `d` tiene el formato `M x y L x y …` (comandos absolutos, coordenadas con como máximo 3 decimales separadas por un espacio), su primer punto es el nodo 0 y su último punto es el último nodo de la trayectoria, y el diezmado usa `radioMaximo / 25` medido contra el último punto conservado. *(Vitest)*
8. **Campo ambiental.** Dado un número y una semilla, cuando se genera el campo, entonces dos llamadas dan los mismos valores, hay exactamente ese número de partículas a una distancia del origen entre 4,5 y 15,5, con alfa entre 0,18 y 0,58 y un índice de paleta entero entre 0 y `TAMANO_PALETA − 1`. *(Vitest)*
9. **Reloj de la órbita.** Dados una posición, un `dt`, una velocidad y un periodo, cuando se avanza, entonces el resultado es `u + dt · velocidad / periodo` envuelto en `[0, 1)`; nunca vale 1 ni `NaN`; una velocidad negativa retrocede con envoltura; un `dt` fuera de `[0, 0,25]` se recorta; y `envolverPosicion(-1e-17)` vale 0. *(Vitest)*

**Escena en el navegador**

10. **Miniatura desde el servidor.** Dada la portada con JavaScript desactivado, entonces el HTML trae la miniatura SVG de la figura de ocho con sus tres trazos, y el contenido de los tres `d` es idéntico al que devuelve `trazarMiniatura` para la figura de ocho (el test lo calcula en Node con la librería); además trae el contenedor con `data-estado-escena="cargando"` y una región `role="status"` vacía dentro del contenedor del visor, y nunca el botón de animación. *(Playwright)*
11. **three fuera del código inicial.** Dada la portada, cuando se descarga su HTML, entonces ninguno de los JavaScript que referencia (`<script src>` y `<link rel="preload" as="script">`) contiene `WebGLRenderer`, y al menos uno de los que se cargan después sí lo contiene. *(Playwright)*
12. **La escena se dibuja.** Dada la portada con WebGL, cuando carga, entonces el contenedor pasa a `data-estado-escena="lista"`, la miniatura deja de ser visible, hay un lienzo opaco con `role="img"`, etiqueta descriptiva, `aria-describedby` y `tabindex="0"`, el texto de instrucciones es visible, y una captura del lienzo tiene al menos 50 píxeles cerca de cada uno de los tres colores de los cuerpos (tolerancia de 60 por canal; el umbral se calibra en el primer verde). Además, con la escena pausada una flecha de cámara cambia la imagen del lienzo, dos capturas separadas son idénticas, y con la escena en marcha dos capturas separadas difieren. Esta es la prueba permanente del Worker en el navegador. *(Playwright con `pngjs`)*
13. **Control de la cámara.** Dado el lienzo con foco, cuando se pulsa una flecha, entonces `data-vista` cambia, leído justo después de la pulsación porque se escribe de forma síncrona en el manejador, con el valor objetivo (`ArrowLeft` resta 0,14 al acimut y `ArrowRight` lo suma; `ArrowUp` resta 0,1 al polar y `ArrowDown` lo suma); cuando se pulsa `+` sin modificadores, la distancia disminuye, y con Ctrl pulsado no cambia; `Home` devuelve la vista a la `vistaInicial` del componente (por defecto `VISTA_INICIAL`); arrastrar con el ratón la cambia; un gesto de dos dedos que se separan (eventos táctiles enviados por el protocolo del navegador) reduce la distancia y uno que se juntan la aumenta; la rueda sobre el lienzo desplaza la página y no cambia la vista; y el lienzo tiene `touch-action: pan-y`. *(Playwright)*
14. **Animación.** Dada la escena en marcha, cuando se pulsa «Pausar animación» o la tecla Espacio, entonces `data-reproduciendo` pasa a `false`, el texto del botón pasa a «Reproducir animación» y `data-posicion` y `data-vista` no cambian durante un segundo; al reanudar, la posición avanza sin saltar: la cota del salto de `data-posicion` se calcula con el tiempo real transcurrido, `delta < (segundos_transcurridos + 0,1) / periodo`, donde `delta` es la distancia circular, `min(|d|, 1 − |d|)` con `d` la diferencia de fracciones (así no falla cuando `data-posicion` envuelve de 0,999 a 0,0), y `periodo` el de la figura de ocho en segundos a velocidad 1; el botón mide al menos 44 px de alto y de ancho; y no aparece hasta que la escena está lista. *(Playwright)*
15. **Movimiento reducido.** Dado `prefers-reduced-motion: reduce`, cuando carga la portada, entonces la escena empieza pausada y `data-posicion` no cambia en un segundo. *(Playwright)*
16. **Pausa cuando no se ve.** Dada la escena en marcha, cuando `document.hidden` pasa a verdadero (redefinido con `Object.defineProperty`) y se lanza `visibilitychange`, entonces `data-fotogramas` deja de crecer; al volver crece de nuevo y la posición no salta, con la misma cota que el criterio 14 (`delta < (segundos_transcurridos + 0,1) / periodo`, con el tiempo real transcurrido y `delta` como distancia circular). *(Playwright)*
17. **Estados alternativos.** Dado un navegador sin WebGL2 (un script de inicio hace que `getContext` devuelva `null`), cuando carga la portada, entonces el contenedor pasa a `data-estado-escena="sin-webgl"`, la miniatura sigue visible, un elemento `role="status"`, presente desde el principio, explica que no se puede mostrar la escena 3D, el botón de animación no aparece y no hay eventos `pageerror` ni errores de consola salvo `Failed to load resource`. Dado que falla el Worker (el test sustituye `window.Worker` por una clase que emite `error`; no se aborta ninguna petición real), entonces el estado es `error`, con la miniatura y un aviso en la región `role="status"`. *(Playwright)*
18. **Lienzo estable.** Dada la escena en marcha, cuando se pausa y se reanuda, entonces el lienzo es el mismo elemento; con `deviceScaleFactor: 3` el ancho del lienzo no pasa del doble de su ancho en CSS; y el contenedor del visor tiene la misma caja antes y después de `lista`. *(Playwright)*
19. **Responsive.** Dada la portada a 375, 768 y 1440 px, entonces no hay desbordamiento horizontal y, a 375 px, el lienzo mide al menos 360 px de alto. Se comprueba también tras llegar a `lista`, cambiando el viewport en vivo a 375, 768 y 1440 px: sin desbordamiento horizontal y midiendo la caja del lienzo (no la del contenedor). *(Playwright)*
20. **Giro automático.** Dada la portada con la escena en marcha, cuando pasan dos segundos sin tocarla, entonces el acimut de `data-vista` ha cambiado y la distancia y el ángulo polar no; cuando se pausa, no cambia; en cuanto se pulsa una flecha o se arrastra con el ratón (no solo con teclado), el giro automático se detiene y, tras volver a reproducir, no se reanuda; y con movimiento reducido no gira. *(Playwright)*

La limpieza al desmontar el componente (muchas idas y vueltas sin aviso de demasiados contextos WebGL) no tiene prueba en este ticket, porque la portada no navega: se comprobará en GRV-04, con el primer E2E con navegación.

## Orden de trabajo

1. `docs`: esta spec y sus correcciones.
2. `test`: criterios 1 a 20 en rojo, con `pngjs` como dependencia de desarrollo. Este commit marca la spec como aprobada. `tests/unit/layout.test.ts` (GRV-01) importa `layout.tsx`, que pasará a usar `next/font/local`, algo que Vitest no puede ejecutar fuera de Next: en este mismo commit ese test mockea `next/font/local`.
3. `feat`: dependencias (`three`, `@types/three`, `@fontsource-variable/inter`), tokens y layout, núcleo puro, componentes y portada. También los cambios de `devops`: `playwright.config.ts` con `timeout: 60_000`, `retries: 1` en CI y los argumentos de SwiftShader, y una regla de ESLint que prohíbe importar `three` fuera de `src/components/escena/`. El contexto manual del grupo serial de las pruebas E2E no arranca trazas a mano: Playwright 1.64 ya traza los contextos creados con `browser.newContext()` según el `use.trace` de la configuración. La tabla de tokens de `DESIGN.md` (una fila por token, con su valor), que exige el criterio 1, se completa en este paso con los valores de `globals.css`.
4. `docs`: ADR 0005 (escena, estelas y color), el resto de `DESIGN.md`, `AGENTS.md` (propiedad de `src/lib/escena/` y de `DESIGN.md`), ticket y estado.
5. Revisión y enlace para abrir el PR.

## Traspasos tras la aprobación

`frontend` (tokens, layout, componentes, portada y `src/lib/escena/`), `devops` (`playwright.config.ts`, con `timeout`, `retries` y SwiftShader, y la regla de ESLint), `arquitecto` (ADR 0005 y `DESIGN.md`; la tabla de tokens, antes del verde del criterio 1), `documentacion` (ticket y estado), `pr-reviewer` (revisión).

## Riesgos y límites

- **WebGL en el CI.** Las pruebas necesitan WebGL por software en GitHub Actions. El flujo solo corre en PR y en `develop`/`main`, así que si falla se verá en el primer PR. Se añaden los argumentos de SwiftShader a la configuración como precaución, más `timeout: 60_000` y `retries: 1` en CI (WebGL por software es lento y puede fallar un intento aislado), y el `use.trace` de la configuración (`retain-on-failure`) graba las trazas para diagnosticar los fallos, también las del contexto manual del grupo serial, que no necesita arrancarlas a mano.
- **`next/font/local` en Vitest.** Vitest no ejecuta `next/font/local` fuera de Next, así que `tests/unit/layout.test.ts` (GRV-01) lo mockea; cualquier otro test que importe el layout debe hacer lo mismo.
- **Migración de tokens.** Cambiar `--spacing` altera el significado de `p-4` y `gap-6`: hay que revisar la portada y las pruebas de GRV-01.
- **`next/font/local` con `node_modules` y Turbopack.** Si no lo resuelve, se copia el archivo y su licencia al repositorio.
- **Tamaño de three.** No se mide hasta GRV-06; si no cabe en el presupuesto, se poda.
- **Tamaño de punto.** El máximo de `gl_PointSize` depende de la GPU. El tamaño usado (≈ 9 px CSS por DPR) queda muy por debajo de los límites habituales.
- **Lectores de pantalla.** El lienzo es una imagen con instrucciones visibles; los lectores en modo lectura pueden interceptar las flechas. Se documenta el límite.
- **Posición y vista inicial por props.** `posicionInicial`, `vistaInicial` y `fijarPosicion` quedan cubiertos en este ticket por las pruebas del reloj y de la cámara (Node), pero su conexión con la interfaz no tiene E2E hasta que GRV-04 añada el deslizador y las URL compartibles.
- **Pausa por visibilidad en el lienzo.** La parte de `IntersectionObserver` no tiene prueba, porque la portada cabe en la pantalla. Se prueba el caso de la pestaña oculta.
- **Movimiento reducido en caliente.** El estado inicial se decide al cargar; los cambios de preferencia durante la sesión no se escuchan.
- **Los atributos `data-*`** son parte del contrato de las pruebas.
