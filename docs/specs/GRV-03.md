# GRV-03 · Sistema de diseño y escena 3D

**Estado:** borrador, pendiente de aprobación · **Tamaño:** L · **Rama:** `feature/sistema-de-diseno-y-escena-3d` → `develop`

## Contexto

GRV-01 dejó Tailwind y los ocho colores. GRV-02 dejó el motor que calcula las órbitas. Falta lo visible: el sistema de diseño completo (tipografía, escalas, accesibilidad base) y el componente de escena que dibuja una órbita en 3D. Lo usarán la portada (escena hero, en este ticket), el detalle de cada órbita (GRV-04) y el tutor (GRV-05).

## Alcance

1. **Sistema de diseño.** Tokens completos en `@theme` (fuente, escala tipográfica, espaciado, radio, ancho máximo), tipografía Inter autoalojada con `next/font` y reglas base: foco visible, texto accesible según el ancho y `prefers-reduced-motion`.
2. **Estructura accesible del layout.** Enlace de salto, cabecera, `main` y pie.
3. **Núcleo puro de la escena** en `src/lib/escena/`: estado de la cámara y sus órdenes, construcción de las estelas y trazado de la miniatura. TypeScript puro, sin three, probado en Node.
4. **`EscenaOrbita`**: componente con three que dibuja los tres cuerpos, sus estelas hechas de triángulos y un campo ambiental, con control de cámara por ratón, tacto y teclado, y pausa cuando no se ve.
5. **`VisorOrbita`**: envoltorio que muestra primero la miniatura SVG, carga la escena y la trayectoria sin bloquear la primera pintura, ofrece el control de animación y, si no hay WebGL, deja la miniatura con un aviso.
6. **Portada.** La escena hero con la figura de ocho y su titular, que sustituyen al marcador provisional.

## Fuera de alcance

Controles de reproducción completos (velocidades, deslizador de posición y de longitud de estela), telemetría, rutas de detalle y galería (GRV-04). La ley interactiva y el tutor (GRV-05). Medir el presupuesto de rendimiento y Lighthouse (GRV-06). Efectos de postprocesado.

## Decisiones propuestas

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Tipografía | Inter variable autoalojada: `next/font/local` sobre el archivo `latin` de `@fontsource-variable/inter` | No hace falta llegar a Google Fonts en el build (CI, Docker, entornos sin esa red), un solo archivo cubre los pesos 200 a 600 y la licencia es OFL. Coste: una dependencia más y solo el subconjunto latino |
| three | Importaciones con nombre (sin `import *`), cargado con `next/dynamic` y `ssr: false`, con `ColorManagement` desactivado | Chunk aparte que no entra en la primera pintura, y los colores de la pantalla son exactamente los de los tokens. Coste: código más imperativo que con react-three-fiber |
| Cómo llega la órbita | La miniatura SVG se calcula en el servidor al prerenderizar la portada; la trayectoria completa la pide el cliente al Worker de GRV-02 | La portada ya trae algo visible en el HTML y no se envía la trayectoria (≈70 KB) por la red. Coste: un instante en el que solo se ve la miniatura |
| Estelas | Una polilínea con los nodos adaptativos de la trayectoria, exacta en los encuentros cercanos, más marcas triangulares equiespaciadas en el tiempo | Una estela hecha con muestras uniformes cortaría las curvas cerradas (ADR 0002). Coste: más vértices por fotograma, del orden de miles |
| Lógica fuera de three | Cámara, estelas y miniatura son funciones puras en `src/lib/escena/` | Se prueban en Node sin navegador y las reglas de ESLint de `src/lib` impiden que dependan de three o del DOM. Coste: una capa más entre la lógica y la escena |
| Estado de la escena | Atributos `data-*` en el contenedor (`estado-escena`, `reproduciendo`, `vista`, `fotogramas`) | Permiten probar la escena desde Playwright sin tocar sus internos. Coste: unos atributos que quedan en el HTML |
| Pruebas de la escena | Playwright con el WebGL del Chromium de pruebas, `pngjs` para contar píxeles y `--disable-3d-apis` para forzar la alternativa | Se comprueba que se dibuja de verdad. Coste: dos dependencias de desarrollo y pruebas que dependen de que el CI tenga WebGL por software |
| Control de animación | Botón fantasma «Pausar animación» o «Reproducir animación» junto a la escena | Lo exige la accesibilidad (WCAG 2.2.2) para todo movimiento automático. La tecla Espacio hace lo mismo |

## Contratos

```ts
// src/lib/escena/camara.ts
export interface VistaCamara { acimut: number; polar: number; distancia: number }
export interface LimitesCamara { distanciaMinima: number; distanciaMaxima: number }

export const VISTA_INICIAL: VistaCamara; // acimut 0,6; polar 1,0; distancia relativa 1

export type OrdenCamara =
  | { tipo: 'girar'; dAcimut: number; dPolar: number }
  | { tipo: 'acercar'; factor: number } // factor < 1 acerca
  | { tipo: 'restablecer' };

export function ordenDeTecla(tecla: string): OrdenCamara | 'alternar' | null; // flechas, + - =, Home, espacio
export function aplicarOrden(vista: VistaCamara, orden: OrdenCamara, limites: LimitesCamara): VistaCamara;
export function limitesPara(radioMaximo: number): LimitesCamara; // 1,6 y 10 veces el radio
export function distanciaInicial(radioMaximo: number, relacionAspecto: number): number; // 3,3 · radio, mayor si es vertical
export function posicionCamara(vista: VistaCamara): [number, number, number]; // coordenadas esféricas, z hacia arriba
```

```ts
// src/lib/escena/estela.ts
export interface DatosEstela {
  linea: Float32Array;  // x, y, z por vértice, del más antiguo al más reciente
  lineaAlfa: Float32Array;
  marcas: Float32Array;
  marcasAlfa: Float32Array;
}
export const MARCAS_POR_ESTELA = 120;
export function crearDatosEstela(t: Trayectoria): DatosEstela; // dimensionado para cualquier longitud
export function construirEstela(
  t: Trayectoria, cuerpo: 0 | 1 | 2, u: number, longitud: number, destino: DatosEstela,
): { vertices: number; marcas: number }; // longitud: fracción del periodo, de 0,05 a 1
```

```ts
// src/lib/escena/miniatura.ts
export interface TrazadoMiniatura { viewBox: string; trazos: [string, string, string] } // un path por cuerpo
export function trazarMiniatura(t: Trayectoria): TrazadoMiniatura;
```

```tsx
// src/components/escena/
<EscenaOrbita
  trayectoria  reproduciendo  velocidad?=1  longitudEstela?=0,5  posicion?  giroAutomatico?
  ruedaActiva?  camposAmbientales?  etiqueta  alAlternarReproduccion?  alFotograma?  alError?
/>
<VisorOrbita slug miniatura titulo? ... />   // cliente; carga EscenaOrbita con next/dynamic
<MiniaturaOrbita trazado />                     // SVG, componente de servidor
```

`alError` se llama con un `Error` cuando no hay WebGL. `posicion` (fracción del periodo) es opcional: si se da, la escena la sigue; si no, avanza sola con la reproducción.

**Tokens** (en `@theme` de `src/app/globals.css`, documentados en `DESIGN.md`): `--font-sans`; tamaños `--text-etiqueta` 14 px, `--text-cuerpo` 18 px, `--text-titular-xs` 27 px, `--text-subtitulo` 36 px, `--text-titular-sm` 42 px, `--text-titular` 48 px, `--text-titular-lg` y `--text-display` con `clamp` entre 46 px y 78 px / 113 px; interlineados y espaciado entre letras de cada uno; `--spacing-*` con la escala 6, 12, 18, 24, 30, 36, 60, 96 y 120; `--radius-boton` 24 px; `--container-pagina` 1280 px.

## Criterios de aceptación

Las pruebas puras van en `tests/unit/escena/` y `tests/repo/`; el resto, en `tests/e2e/`.

1. **Tokens completos.** Dado `src/app/globals.css`, cuando se lee su bloque `@theme`, entonces define los ocho colores, la fuente, la escala tipográfica con su interlineado y su espaciado entre letras, la escala de espaciado, el radio y el ancho máximo; y `DESIGN.md` documenta cada token con su valor. *(Vitest)*
2. **Tipografía autoalojada.** Dada la portada, cuando carga, entonces `document.fonts` tiene Inter cargada y no se hizo ninguna petición a `fonts.googleapis.com` ni a `fonts.gstatic.com`. *(Playwright)*
3. **Peso del texto según el ancho.** Dado el cuerpo de la portada, cuando el ancho es de 640 px o más, entonces su tamaño es 18 px y su peso 200; por debajo, su peso es 300; y los titulares tienen peso 400. *(Playwright)*
4. **Estructura accesible.** Dada la portada, cuando se pulsa Tab, entonces el primer elemento enfocado es el enlace de salto, visible, y al activarlo el foco pasa a `#contenido`; hay `header`, `main` y `footer`; y el contorno de foco visible es blanco de 2 px. *(Playwright)*
5. **Cámara.** Dadas las órdenes de la cámara, entonces las flechas giran con paso fijo, `+`, `=` y `-` acercan y alejan, `Home` restablece, el espacio devuelve `alternar`, y cualquier otra tecla devuelve `null`; el ángulo polar y la distancia nunca salen de sus límites aunque se repita la orden; el acimut se mantiene finito; `distanciaInicial` crece con el radio y es mayor en pantallas verticales; y `posicionCamara` devuelve puntos a la distancia pedida. *(Vitest)*
6. **Estelas.** Dada una trayectoria y una fracción `u`, cuando se construye la estela de un cuerpo, entonces el último vértice es `estadoEn(t, u)`; los vértices cubren la longitud pedida (el más antiguo corresponde a `u − longitud`); con envoltura no se repite el nodo final, que duplica al primero; el alfa decrece con la edad entre 1 y 0; hay `MARCAS_POR_ESTELA` marcas equiespaciadas en el tiempo; no hay valores `NaN`; y reutilizar el mismo destino no cambia el resultado. *(Vitest)*
7. **Miniatura.** Dada cada una de las seis órbitas, cuando se traza su miniatura, entonces hay tres trazos con coordenadas finitas, el `viewBox` contiene todos los puntos con un margen, y el resultado es idéntico en dos llamadas. *(Vitest)*
8. **Miniatura desde el servidor.** Dada la portada con JavaScript desactivado, entonces el HTML trae la miniatura SVG de la figura de ocho con sus tres trazos. *(Playwright)*
9. **three fuera del código inicial.** Dada la portada, cuando se descarga su HTML, entonces ningún `<script src>` de esa respuesta contiene `WebGLRenderer`; y la escena aparece después. *(Playwright)*
10. **La escena se dibuja.** Dada la portada con WebGL, cuando carga, entonces el contenedor pasa a `data-estado-escena="lista"`, hay un lienzo con `role="img"`, etiqueta descriptiva y `tabindex="0"`, y una captura del lienzo tiene más de 200 píxeles con color saturado. *(Playwright con `pngjs`)*
11. **Control de la cámara.** Dado el lienzo con foco, cuando se pulsa una flecha, `+`, `-` o `Home`, o se arrastra con el ratón, entonces `data-vista` cambia en el sentido esperado, se respetan los límites y `Home` devuelve la vista inicial; y la tecla Espacio alterna `data-reproduciendo`. *(Playwright)*
12. **Control visible de la animación.** Dada la portada, cuando se pulsa «Pausar animación», entonces la escena pasa a pausada, el botón pasa a decir «Reproducir animación» y viceversa; el botón mide al menos 44 px de alto y de ancho. *(Playwright)*
13. **Movimiento reducido.** Dado `prefers-reduced-motion: reduce`, cuando carga la portada, entonces la escena empieza pausada y la vista no cambia por sí sola en un segundo. *(Playwright)*
14. **Pausa cuando no se ve.** Dada la escena en marcha, cuando la pestaña pasa a oculta, entonces `data-fotogramas` deja de crecer y vuelve a crecer al volver. *(Playwright)*
15. **Sin WebGL.** Dado un navegador sin WebGL, cuando carga la portada, entonces el contenedor pasa a `data-estado-escena="sin-webgl"`, la miniatura sigue visible, aparece un aviso con `role="status"` que explica que no se puede mostrar la escena 3D, y no hay errores en la consola. *(Playwright con `--disable-3d-apis`)*
16. **Responsive.** Dada la portada a 375, 768 y 1440 px, entonces no hay desbordamiento horizontal y la escena mide al menos 360 px de alto en móvil. *(Playwright)*

## Orden de trabajo

1. `docs`: esta spec.
2. `test`: criterios 1 a 16 en rojo, con las dependencias de prueba (`pngjs`). Este commit marca la spec como aprobada.
3. `feat`: dependencias (`three`, `@fontsource-variable/inter`), tokens y layout, núcleo puro de `src/lib/escena/`, componentes y portada, hasta pasar todo.
4. `docs`: ADR 0005 (escena y estelas), `DESIGN.md`, ticket y estado.
5. Revisión y enlace para abrir el PR.

## Traspasos tras la aprobación

`frontend` (tokens, layout, componentes, portada y `src/lib/escena/`, que pasa a su ámbito), `documentacion` (ADR 0005, ticket, estado), `pr-reviewer` (revisión).

## Riesgos y límites

- **WebGL en el CI.** Las pruebas de la escena necesitan WebGL por software en el entorno de GitHub Actions. En este entorno funciona; en el CI se comprobará con el primer PR.
- **Tamaño de three.** Con importaciones con nombre debería ser un chunk de unos cientos de KB sin comprimir. No se mide hasta GRV-06; si no cabe en el presupuesto, se podará.
- **Sombreadores.** El triángulo se dibuja con un sombreador de puntos; el tamaño máximo de punto depende de la GPU. Se limita a un tamaño razonable y se anota si hay diferencias.
- **Pausa por visibilidad en el lienzo.** La parte de `IntersectionObserver` (lienzo fuera de la pantalla) no tiene prueba propia, porque la portada cabe en la pantalla. Se prueba el caso de la pestaña oculta.
- **Marcas en los datos.** Los atributos `data-*` son parte del contrato de las pruebas.
