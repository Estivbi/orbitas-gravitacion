# GRV-03 · Sistema de diseño y escena 3D

Qué se construyó, cómo replicarlo y qué se aprendió. Spec: `docs/specs/GRV-03.md`. Decisiones: `docs/adr/0005-escena-3d-estelas-y-color.md`. Tokens y componentes: `DESIGN.md`.

## Resumen

La portada pasa de un marcador provisional a una escena 3D real: la figura de ocho dibujada con three, con sus tres cuerpos, estelas hechas de triángulos, un campo ambiental, cámara controlable con ratón, tacto y teclado, giro automático y un botón para pausar. Debajo hay un sistema de diseño completo (tokens, Inter autoalojada, foco visible, estructura accesible) y un núcleo puro en `src/lib/escena/` que se prueba en Node sin navegador. Antes de que cargue three, y si el navegador no tiene WebGL2, la persona ve una miniatura SVG calculada en el servidor.

Es también la primera página que usa el Worker de GRV-02 en un navegador, así que el criterio 12 es su prueba permanente.

## Alcance

- **Sistema de diseño:** `@theme static` en `src/app/globals.css` con los ocho colores, la fuente, la escala tipográfica (tamaño, interlineado y espaciado entre letras), `--spacing: 6px`, el radio, el ancho máximo y un punto de corte propio. Reglas base de peso del texto según el ancho, foco visible y `prefers-reduced-motion`.
- **Layout accesible:** enlace de salto, `header`, `main` (`#contenido`) y `footer` en `src/app/layout.tsx`.
- **Núcleo puro** en `src/lib/escena/`: cámara, estelas, reloj, miniatura y campo ambiental. Sin React, sin DOM y sin three.
- **Componentes** en `src/components/escena/`: `EscenaOrbita` (la escena), `VisorOrbita` (envoltorio con miniatura, estados y botón de animación) y `MiniaturaOrbita` (SVG).
- **Portada** (`src/app/page.tsx`) con la escena hero, la etiqueta «Gravitación universal» y el `h1` «Tres cuerpos, una sola curva.», para que las pruebas de humo de GRV-01 sigan valiendo.
- **Fuera de alcance:** los controles de reproducción completos, la telemetría, la galería y las rutas de detalle (GRV-04), la ley interactiva y el tutor (GRV-05), y medir el presupuesto de rendimiento (GRV-06). La escena ya acepta velocidad, longitud de estela, posición y vista inicial por props y expone `fijarPosicion`, para que GRV-04 solo tenga que conectarlos.

## Commits del ticket

Ramas: `feature/sistema-de-diseno-y-escena-3d` → `develop`. Salida de `git log --oneline develop..HEAD` (del más antiguo al más reciente), sin contar el commit que añade este documento.

| Hash      | Commit                                                                                     |
| --------- | ------------------------------------------------------------------------------------------ |
| `a45f832` | `docs(GRV-03): redactar la spec del sistema de diseño y la escena 3D`                      |
| `f91c38f` | `docs(GRV-03): corregir la spec tras la revisión y recortar el alcance`                    |
| `1bc248e` | `docs(GRV-03): reponer en la spec el giro automático, el pellizco y la posición`           |
| `fff0fcc` | `test(GRV-03): escribir los tests del sistema de diseño y la escena 3D`                    |
| `622b666` | `test(GRV-03): reforzar los tests tras la revisión independiente`                          |
| `377a619` | `feat(GRV-03): añadir el sistema de diseño y la escena 3D`                                 |
| `2e20c15` | `build(GRV-03): prohibir también import() dinámico de three fuera de la escena`            |
| `d333147` | `docs(GRV-03): documentar los tokens, la decisión de la escena y la propiedad de carpetas` |

## Qué se construyó

**Núcleo puro, en `src/lib/escena/`:**

- **`camara.ts`:** `VISTA_INICIAL`, los límites (`POLAR_MINIMO`, `POLAR_MAXIMO`, `DISTANCIA_MINIMA`, `DISTANCIA_MAXIMA`), las órdenes (`ordenDeTecla`, `ordenDeArrastre`, `ordenDeRueda`, `ordenDePellizco`), `aplicarOrden`, `girarAutomaticamente`, `distanciaInicial` y `posicionCamara`. La cámara es esférica con z arriba; el acimut siempre queda en `[0, 2π)`.
- **`estela.ts`:** `crearDatosEstelas` reserva los buffers una vez por trayectoria y `construirEstelas` los rellena en cada fotograma. La línea usa los nodos adaptativos de la trayectoria; las marcas triangulares se anclan a una rejilla fija de `MARCAS_POR_PERIODO = 240` puntos por periodo. `alfaDeEdad` da la opacidad en función de la edad relativa, `(1 − e)^1,6`.
- **`reloj.ts`:** `avanzarPosicion` y `envolverPosicion`, la fracción del periodo con velocidad, envoltura y recorte de `dt`.
- **`miniatura.ts`:** `trazarMiniatura` diezma la trayectoria a tres trazos SVG (`M x y L x y …`) y calcula el `viewBox`.
- **`ambiente.ts`:** `generarCampoAmbiental`, un campo de partículas determinista (generador mulberry32) en una cáscara esférica.
- **`numeros.ts`:** `limitar` y `recortarDt`, compartidos.

**Componentes, en `src/components/escena/`:**

- **`montarEscena.ts`:** el montaje imperativo. Crea el contexto WebGL2 opaco a mano, el renderer, la cámara y el bucle; cada recurso registra su limpieza y se libera en orden inverso, también si el montaje falla a medias.
- **`composicion.ts`:** construye la escena de three (cuerpos, estelas, campo ambiental) y la actualiza en cada fotograma.
- **`sombreadores.ts`:** un `ShaderMaterial` mínimo por tipo de elemento, con brillo aditivo sobre negro; el cuerpo es un punto con halo radial y las marcas, triángulos de contorno fino por distancia con signo.
- **`colores.ts`:** `leerPaleta` lee los `--color-*` del documento al montar.
- **`simulacion.ts` y `suavizado.ts`:** el estado de la órbita y de la cámara sin tocar el DOM ni three; la vista dibujada persigue a la vista objetivo.
- **`interaccion.ts`:** punteros (ratón y tacto), rueda opcional y teclado.
- **`EscenaOrbita.tsx`, `VisorOrbita.tsx`, `MiniaturaOrbita.tsx`, `tipos.ts` y `movimiento.ts`.**

**Y además:** una regla de ESLint que confina `three` a `src/components/escena/` (`eslint.config.mjs`), la configuración de Playwright con WebGL por software (`playwright.config.ts`) y el ADR 0005.

## Cómo replicarlo

1. **Escribir la spec y revisarla antes de aprobarla.** La de este ticket pasó por tres commits (`a45f832`, `f91c38f`, `1bc248e`): se recortó alcance y se repuso lo que la revisión echó de menos.
2. **Instalar las dependencias.** En producción, `three` y `@fontsource-variable/inter`. En desarrollo, `@types/three`, `pngjs` y `@types/pngjs` (para contar píxeles en las pruebas de navegador). three se importa siempre con nombre (`import { Scene, … } from 'three'`).
3. **Tokens y fuente autoalojada.**
   - Pasar `@theme` a `@theme static` en `src/app/globals.css`. Sin `static`, Tailwind solo emite las variables de los tokens que usa alguna clase, y la escena necesita leer los `--color-*` desde JavaScript.
   - Definir los tamaños de texto en tres tokens cada uno (`--text-x`, `--text-x--line-height`, `--text-x--letter-spacing`), `--spacing: 6px`, `--radius-boton`, `--container-pagina` y `--breakpoint-columnas`.
   - Declarar el peso del cuerpo en `@layer base`: 300 por debajo de 640 px y 200 desde 640 px; los titulares `h1` a `h6`, 400. Añadir `:focus-visible` (contorno blanco de 2 px) y la regla de `prefers-reduced-motion`.
   - En `src/app/layout.tsx`, cargar Inter con `next/font/local`, apuntando al archivo `inter-latin-wght-normal.woff2` de `@fontsource-variable/inter` en `node_modules`, y exponerla en `--fuente-inter`, que `--font-sans` usa como primera familia. No hay peticiones a servidores de fuentes externos.
   - Documentar cada token con su valor en `DESIGN.md`: una prueba lo exige.
4. **Núcleo puro, con tests primero.** Cada función de `src/lib/escena/` se escribe contra los criterios 5 a 9 y sin importar nada de three ni del DOM. Es lo que hace posible probar la cámara, las estelas y el reloj en Node, en milisegundos.
5. **Componentes.**
   - `montarEscena` crea el contexto con `getContext('webgl2', { alpha: false, … })` antes que el renderer y se lo pasa a three. Fija `ColorManagement.enabled = false` (en `colores.ts`, una vez al cargar el módulo) y `outputColorSpace = LinearSRGBColorSpace`: los píxeles del lienzo son los hexadecimales de los tokens.
   - `EscenaOrbita` monta con un efecto y devuelve la limpieza. Las props que cambian con el tiempo se leen dentro del bucle desde una referencia, sin recrear el renderer.
   - `VisorOrbita` carga `EscenaOrbita` con `next/dynamic` y `ssr: false`, pide la trayectoria al Worker con `calcularTrayectoria` y escribe los atributos `data-*` directamente en el DOM, sin pasar por el estado de React.
6. **Portada.** `src/app/page.tsx` calcula la miniatura en el servidor con `integrarPeriodo` y `trazarMiniatura`, y la pasa al visor. El HTML ya trae la figura de ocho sin esperar al Worker.
7. **Pruebas.** Vitest para el núcleo y los tokens; Playwright para lo que depende de WebGL, con un solo `goto` por estado. En `tests/unit/layout.test.ts` hay que simular `next/font/local` (ver «Qué se aprendió»).
8. **Aislamiento de three.** Añadir en `eslint.config.mjs` las reglas `no-restricted-imports` y `no-restricted-syntax` para `three` y `import('three')` fuera de `src/components/escena/`.
9. **Playwright con WebGL por software.** En `playwright.config.ts`, los argumentos de Chromium `--use-gl=angle`, `--use-angle=swiftshader` y `--enable-unsafe-swiftshader`, más `timeout: 60_000` y un reintento solo en CI.

## Decisiones clave y por qué

La tabla completa, con las opciones descartadas, está en el ADR 0005. Las que más condicionan el resto:

- **three aislado y cargado aparte.** Solo desde `src/components/escena/`, con `next/dynamic` y `ssr: false`: three viaja en un chunk que no entra en la primera pintura (criterio 11).
- **La lógica, fuera de los componentes.** Todo lo que se puede calcular sin three vive en `src/lib/escena/` y se prueba en Node. Los componentes solo traducen eso a objetos de three y a eventos del DOM.
- **Estelas con nodos adaptativos y marcas ancladas.** La polilínea usa los nodos de la trayectoria, exacta en los encuentros cercanos (ADR 0002); las marcas siguen una rejilla fija de 240 puntos por periodo, así no se deslizan de un fotograma a otro. Al envolver, nunca se incluye el último nodo, que repite al primero (ADR 0003).
- **Opacidad por edad, no por índice de vértice.** En un encuentro cercano se acumulan cientos de nodos en un instante; un degradado por índice los apagaría.
- **Color sin conversiones.** `@theme static`, lectura con `getComputedStyle` y gestión de color de three desactivada: `globals.css` sigue siendo el único sitio donde viven los colores, y una prueba de repositorio impide literales de color en `src/components/escena` y `src/lib/escena`.
- **Lienzo opaco y contexto creado a mano.** Si no hay WebGL2, el fallo es un `Error` limpio y no un mensaje de three en la consola.
- **Cuatro estados visibles** (`cargando`, `lista`, `sin-webgl`, `error`) y atributos `data-*` como contrato de las pruebas.
- **Tacto sin atrapar la página.** Un dedo en horizontal gira el acimut; en vertical desplaza la página (`touch-action: pan-y`); dos dedos acercan y alejan. El coste: con un dedo no se controla el ángulo polar.
- **Pausa obligatoria.** Todo movimiento automático obedece al botón «Pausar animación» o «Reproducir animación» y a la tecla Espacio, y con `prefers-reduced-motion` la escena empieza pausada y sin giro.

### Desvíos respecto a la spec

- **`alCambiarVista`.** Se añadió esta prop a `PropsEscenaOrbita`, que la spec no recogía. Se llama de forma síncrona cada vez que cambia la vista objetivo y `VisorOrbita` escribe con ella `data-vista`. La spec lo anota en el contrato.
- **`--breakpoint-columnas` (900 px).** Corte de una a dos columnas de la portada y del visor, con las clases `columnas:` y `max-columnas:`. Se documentó en `DESIGN.md`.
- **Regla de ESLint endurecida.** La primera versión (`377a619`) no cubría `import('three')`; el commit `2e20c15` lo añade.

## La forma de trabajar con las pruebas

El orden fue spec → tests en rojo → revisión independiente de los tests → código en verde.

1. **Spec aprobada** con veinte criterios en formato dado / cuando / entonces.
2. **Tests en rojo** (`fff0fcc`), escritos desde los criterios y no desde la implementación. Se comprobó que fallaban por el motivo correcto, es decir, porque faltaba el código y no porque el test estuviera mal escrito.
3. **Revisión independiente de los tests** (`622b666`). Una revisión que no había escrito los tests los puso a prueba con variantes erróneas deliberadas del código: se imaginaba una implementación casi correcta pero equivocada y se comprobaba si algún test la detectaba. Donde ninguno la detectaba, se reforzó el test.
4. **Código en verde** (`377a619`): lo mínimo para que pasaran.

### Qué se comprobó y qué huecos se cerraron

- **El umbral de la miniatura.** `tests/unit/escena/miniatura.test.ts` reconstruye el diezmado por su cuenta (primer nodo, cada nodo que dista más de `radioMaximo / 25` del _último conservado_, y siempre el último nodo) y compara punto a punto con `trazarMiniatura`, con una tolerancia de redondeo de 0,0005. Así se distinguen un umbral distinto, medir contra el vecino original en lugar del último conservado y olvidar el último nodo. Además, las órbitas del catálogo son simétricas respecto al eje x, de modo que un `viewBox` calculado con la y sin invertir daría la misma caja y pasaría inadvertido: se añadió una trayectoria sintética asimétrica en y (`trayectoriaAsimetrica`) para comprobar la inversión y el `viewBox`. El test comprueba también el formato exacto del `d` con una expresión regular (comandos absolutos, como mucho tres decimales).
- **Los sentidos de la cámara.** `tests/unit/escena/camara.test.ts` fija el signo de cada tecla (`ArrowLeft` −0,14 al acimut, `ArrowUp` −0,1 al polar, `+` y `=` con 0,88, `-` con 1,14) y el del arrastre (`dAcimut = −dx · 0,008`, `dPolar = −dy · 0,008`, un dx positivo resta). El E2E repite los mismos sentidos sobre el atributo `data-vista` con la escena real: flechas, `+`, `=`, `-`, arrastre del ratón y gestos táctiles. Con Ctrl, Alt o Meta pulsados no hay orden, y una flecha enviada después demuestra que las pulsaciones anteriores ya se procesaron.
- **Las fronteras de la rejilla de estelas.** `tests/unit/escena/estela.test.ts` cubre los bordes con una trayectoria sintética de nodos en octavos, todos exactos en binario, para que la igualdad entre un nodo y `u` sea fiable. Comprueba que con `longitud = 1` hay `n` vértices si `u` cae en un nodo (también `u = 0`) y `n + 1` si no (también `1 − 1e-9`); que la ventana de marcas es `(inicio, fin]`, de modo que con `u = 0,5` y `longitud = 0,5` hay 120 marcas y la marca 0 no entra; que con `u = 0` y `longitud = 1` hay 240 y la última es el estado en 0; que las marcas no se mueven entre fotogramas mientras no salgan de la ventana; y que, al avanzar una celda (`1/240`), la ventana se desplaza exactamente una marca. Otras pruebas del mismo archivo fijan la envoltura sin repetir el último nodo ni dos vértices seguidos iguales, que un `u` fuera de `[0, 1)` equivale a su valor envuelto, el `RangeError` con longitudes y `u` inválidos, y que reutilizar el destino no cambia el resultado, tampoco al pasar de una ventana pequeña a una grande.
- **Las envolturas de ángulos y fracciones.** Un incremento de −1e-17 desde 0 en el acimut (`camara.test.ts`) y `envolverPosicion(-1e-17)` (`reloj.test.ts`) no pueden dar nunca `2π` ni `1`.
- **El reloj.** El recorte actúa sobre `dt`, no sobre el incremento: con velocidad 100 y periodo 10, el avance máximo sigue siendo el de 0,25 s.
- **El campo ambiental.** Determinismo, cantidad exacta, rango de radios y de alfa, y dispersión (percentiles, ambos lados de cada eje, posiciones distintas y las cuatro entradas de la paleta), para que un generador que devolviera siempre lo mismo no pasara.
- **Las comprobaciones negativas.** Cuando una prueba afirma que algo _no_ cambia («la posición no varía durante un segundo»), el propio test demuestra después, con un cambio que sí ocurre, que la página procesó lo anterior (`esperarAsentado` y las pulsaciones de comprobación de `escena.spec.ts`).

### Cuándo se corrige un test

Un test solo se corrige con justificación y por escrito. El caso de este ticket está en `tests/e2e/escena.spec.ts`: las pruebas de WebGL comparten un contexto y una página (levantar WebGL por software es lento), de modo que el contexto manual se abre en `test.beforeAll` y se cierra una sola vez en `test.afterAll`. Se corrigió además el arranque de trazas, que la spec pedía a mano: Playwright 1.64 ya traza los contextos creados con `browser.newContext()` según `use.trace` de la configuración, y arrancarlas a mano lanza «Tracing has been already started». El comentario del código y la spec lo recogen. No se saltó, desactivó ni puso en cuarentena ninguna prueba.

## Verificación

| Criterio                          | Prueba                                                       |
| --------------------------------- | ------------------------------------------------------------ |
| 1 Tokens completos                | `tests/repo/sistemaDeDiseno.test.ts`                         |
| 2 Fuente local                    | `tests/repo/sistemaDeDiseno.test.ts`                         |
| 3 Texto en pantalla               | `tests/e2e/diseno.spec.ts`                                   |
| 4 Estructura accesible            | `tests/e2e/diseno.spec.ts`                                   |
| 5 Cámara                          | `tests/unit/escena/camara.test.ts`                           |
| 6 Estelas                         | `tests/unit/escena/estela.test.ts`                           |
| 7 Miniatura                       | `tests/unit/escena/miniatura.test.ts`                        |
| 8 Campo ambiental                 | `tests/unit/escena/ambiente.test.ts`                         |
| 9 Reloj de la órbita              | `tests/unit/escena/reloj.test.ts`                            |
| 10 Miniatura desde el servidor    | `tests/e2e/diseno.spec.ts` (sin JavaScript)                  |
| 11 three fuera del código inicial | `tests/e2e/diseno.spec.ts`                                   |
| 12 La escena se dibuja            | `tests/e2e/escena.spec.ts` (también con movimiento reducido) |
| 13 Control de la cámara           | `tests/e2e/escena.spec.ts`                                   |
| 14 Animación                      | `tests/e2e/escena.spec.ts`                                   |
| 15 Movimiento reducido            | `tests/e2e/escena.spec.ts`                                   |
| 16 Pausa cuando no se ve          | `tests/e2e/escena.spec.ts` (pestaña oculta)                  |
| 17 Estados alternativos           | `tests/e2e/escena-alternativas.spec.ts`                      |
| 18 Lienzo estable                 | `tests/e2e/escena.spec.ts`                                   |
| 19 Responsive                     | `tests/e2e/diseno.spec.ts` y `tests/e2e/escena.spec.ts`      |
| 20 Giro automático                | `tests/e2e/escena.spec.ts`                                   |

Las ayudas comunes de las pruebas de navegador (lectura de `data-*`, captura del lienzo con `pngjs`, cómputo de píxeles, simulación de un navegador sin WebGL2 y de un Worker mudo) están en `tests/e2e/ayudas.ts`. Los colores esperados se leen de `src/app/globals.css`, no se repiten en las pruebas.

Las pruebas de GRV-01 (`tests/e2e/humo.spec.ts`) siguen valiendo sin cambios gracias a la etiqueta y al `h1` que conserva la portada. Lo que sí cambió es `tests/unit/layout.test.ts`, que ahora simula `next/font/local`.

### Cómo ejecutar las pruebas

```bash
npm ci
npm test                      # Vitest: física, Worker, escena, tokens e invariantes del repositorio
npx playwright install chromium   # solo la primera vez
npm run test:e2e              # compila, sirve en el puerto 3100 y lanza Playwright
npx playwright test tests/e2e/escena.spec.ts   # un solo archivo
npm run lint && npm run typecheck && npm run format:check
```

El E2E lanza Chromium con WebGL por software. Si el entorno trae otro binario, se puede apuntar a él con la variable `PLAYWRIGHT_CHROMIUM_PATH`.

## Qué se aprendió

- **`next/font/local` no se puede ejecutar bajo Vitest.** Solo funciona dentro de Next. Cualquier prueba que importe `src/app/layout.tsx` debe simularlo con `vi.mock('next/font/local', …)`, como hace `tests/unit/layout.test.ts`.
- **three pide el contexto WebGL con alfa por defecto.** Para tener un lienzo opaco hay que crear el contexto a mano con `alpha: false` y pasárselo al renderer; el test del criterio 12 lo comprueba leyendo `getContextAttributes().alpha`. Crearlo a mano tiene una ventaja añadida: sin WebGL2 el fallo es un `Error` limpio y no un aviso de three en la consola.
- **`next dev` reescribe `AGENTS.md`.** Al arrancar el servidor de desarrollo el archivo cambia solo; hay que revisar `git status` antes de commitear y descartar ese cambio.
- **WebGL por software es lento y variable.** En Chromium sin GPU hay que pasar los argumentos de SwiftShader, subir el `timeout` a 60 s y asumir que un intento aislado puede fallar. Por eso las pruebas se agrupan en un grupo serial con una sola carga de la página y siempre esperan al estado `lista` con sondeo (`expect.poll`) en lugar de esperas fijas.
- **Un texto como «hasta 640» es ambiguo.** «Hasta 640 px» puede incluir o excluir 640. La spec lo resolvió con una frontera exacta («300 con menos de 640 px y 200 desde 640 px») y el E2E mide en 639 y 640 px. Conviene escribir los criterios con «menos de» y «desde» y probar los dos lados de cada frontera.
- **Para probar una frontera, hay que elegir datos que la hagan exacta.** Los nodos en múltiplos de 1/8 son exactos en binario, y por eso permiten comprobar que un nodo coincide con `u` sin depender del redondeo.
- **Las órbitas simétricas ocultan errores de signo.** Una comprobación con un caso asimétrico en y detecta lo que las órbitas reales, simétricas, no pueden.
- **El valor de una variante errónea es descubrir qué test no detecta nada.** Antes de aceptar un test, merece la pena preguntarse qué implementación equivocada lo dejaría pasar.
- **Una comprobación negativa necesita su contraste.** «No cambia» sólo vale si, justo después, se demuestra que algo que sí debía cambiar cambió.

## Límites y pendientes conocidos

- **Peso de three.** El chunk de three pesa 549 KB sin comprimir y 136 KB con gzip. No entra en la primera pintura (criterio 11), pero hay que vigilarlo en GRV-06 y, si no cabe en el presupuesto, podarlo.
- **Props sin E2E de conexión.** `posicionInicial`, `vistaInicial` y `fijarPosicion` están cubiertas por las pruebas puras del reloj y de la cámara, pero su conexión con la interfaz no tiene E2E hasta que GRV-04 añada el deslizador y las URL compartibles.
- **Limpieza al desmontar sin prueba.** Muchas idas y vueltas sin aviso de demasiados contextos WebGL se comprobarán con el primer E2E con navegación, en GRV-04. La portada no navega.
- **WebGL por software sin probar aún en GitHub Actions.** Los argumentos de SwiftShader, `timeout: 60_000` y `retries: 1` en CI están puestos por precaución, pero el flujo solo corre en PR y en `develop`/`main`: se verá en el primer PR.
- **`simulacion.ts` y `suavizado.ts` no tienen tests propios.** Los ejercita el E2E (cámara, pausa y giro) pero no hay pruebas unitarias de su lógica, a pesar de no depender de three.
- **`IntersectionObserver` sin prueba.** La rama de `montarEscena` que pausa el bucle cuando la escena sale de pantalla no se ejercita, porque la portada cabe en la pantalla. Solo se prueba el caso de la pestaña oculta.
- **Movimiento reducido en caliente.** El estado inicial se decide al cargar; los cambios de preferencia durante la sesión no se escuchan.
- **Favicon.** El navegador pide `/favicon.ico` y recibe un 404; no hay icono. Por eso las pruebas ignoran los errores `Failed to load resource`.
- **La regla de ESLint solo detecta `import()` con literal.** `import('three')` se prohíbe fuera de la escena, pero una importación dinámica con una expresión calculada no la detecta la regla.
- **Lectores de pantalla.** El lienzo es una imagen con instrucciones visibles (`role="img"`, `tabindex="0"`, `aria-label` y `aria-describedby`); los lectores en modo lectura pueden interceptar las flechas.
- **Tacto.** Con un dedo no se controla el ángulo polar; en móvil se hace con dos dedos o con el teclado.
- **`ColorManagement` es global.** Cualquier otro módulo que use three en la misma página heredará el ajuste. Hoy solo la escena lo usa.
- **Los atributos `data-*` son contrato.** Cambiarlos rompe las pruebas E2E.
