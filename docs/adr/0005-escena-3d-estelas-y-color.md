# ADR 0005 · Escena 3D, estelas y color

**Fecha:** 28 de octubre de 2026 · **Ticket:** GRV-03 · **Estado:** aceptada

## Contexto

GRV-03 dibuja por primera vez una órbita en 3D con three y fija el sistema de diseño. Hay que decidir cómo se aísla three del resto del código, cómo se dibujan estelas sobre una trayectoria de nodos adaptativos (ADR 0002) con un bucle que se cierra con un salto (ADR 0003), cómo se garantiza que el color en pantalla sea el de los tokens, qué ve la persona antes de que la escena esté lista y qué ocurre cuando no hay WebGL2.

## Opciones y decisiones

| Tema | Opciones | Decisión |
|---|---|---|
| Aislamiento de three | Importar `three` donde haga falta; importar solo desde la escena | Importaciones con nombre (`import { Scene, … } from 'three'`), solo desde `src/components/escena/`. `VisorOrbita` carga `EscenaOrbita` con `next/dynamic` y `ssr: false`, así que three viaja en un chunk aparte que no entra en la primera pintura. Una regla de ESLint (`no-restricted-imports` y `no-restricted-syntax` para `import('three')`) lo confina a esa carpeta; `src/lib` ya lo tenía prohibido |
| Dónde vive la lógica | Dentro de los componentes; en `src/lib/escena/` | Núcleo puro en `src/lib/escena/` (cámara, estelas, reloj, miniatura y campo ambiental), sin React, DOM ni three, probado en Node. Los componentes solo traducen eso a objetos de three y a eventos del DOM |
| Estelas | Muestras uniformes; nodos adaptativos con marcas ancladas a una rejilla fija | Polilínea con los nodos adaptativos de la trayectoria, exacta en los encuentros cercanos, más marcas triangulares ancladas a una rejilla fija de 240 puntos por periodo, calculada una vez con `muestrear`. Las muestras uniformes cortarían las curvas en los encuentros (ADR 0002); con marcas ligadas a la ventana cada marca se desplazaría de un fotograma a otro, y ancladas a la rejilla permanecen quietas hasta que salen. Al envolver no se incluye el último nodo, que duplica al primero (ADR 0003) |
| Opacidad de la estela | Por índice de vértice; por edad | Función de la edad relativa, `(1 − e)^1,6`. Con nodos adaptativos los encuentros acumulan cientos de nodos en un instante y un degradado por índice los apagaría |
| Color | `@theme` normal y colores copiados a JavaScript; `@theme static` y lectura del documento; gestión de color de three activa | `@theme static`, para que Tailwind emita siempre las variables `--color-*`. La escena las lee con `getComputedStyle` al montar (`leerPaleta`), así `globals.css` sigue siendo el único sitio donde viven. `ColorManagement.enabled = false` (ajuste global de three, tocado una vez al cargar el módulo) y `outputColorSpace = LinearSRGBColorSpace`: los píxeles del lienzo son exactamente los hexadecimales de los tokens. Una prueba de repositorio impide literales de color en `src/components/escena` y `src/lib/escena` |
| Lienzo | Dejar que three cree el contexto; crearlo a mano | Lienzo opaco: el contexto se crea con `getContext('webgl2', { alpha: false, … })` antes del renderer y se le pasa a three, que lo pediría siempre con alfa. Si no hay WebGL2, el fallo es un `Error` limpio y no un mensaje de three en la consola. Un `webglcontextlost` se trata como falta de WebGL |
| Dibujo | Mallas, sprites y texturas; puntos con `ShaderMaterial` | Todo son `Points` y `Line` con un `ShaderMaterial` mínimo: cuerpo con halo radial, marcas y campo ambiental como triángulos de contorno fino por distancia con signo, brillo aditivo sobre negro. Sin texturas ni postprocesado |
| Miniatura | Enviar la trayectoria en el HTML; calcular la miniatura en el servidor | La miniatura SVG (`trazarMiniatura`) se calcula en el servidor al prerenderizar, a partir de `integrarPeriodo`, y cubre la primera pintura y la ausencia de WebGL. La trayectoria completa la pide el cliente al Worker de GRV-02, sin enviar ≈ 70 KB por la red. Coste: un instante en el que solo se ve la miniatura |
| Contrato de pruebas | Selectores por estructura del DOM; atributos `data-*` | `VisorOrbita` expone `data-estado-escena` (`cargando`, `lista`, `sin-webgl`, `error`), `data-reproduciendo`, `data-vista`, `data-posicion` y `data-fotogramas`. Se escriben directamente en el DOM, sin pasar por el estado de React; `data-vista` es síncrono con la orden de cámara. Son parte del contrato: cambiarlos rompe las pruebas E2E |
| Tipografía | `next/font/google`; copiar el `woff2` al repositorio; `next/font/local` sobre el paquete | Inter variable (subconjunto latino, licencia OFL) con `next/font/local`, apuntando al archivo de `@fontsource-variable/inter` en `node_modules`. Turbopack lo resuelve sin copiar el `woff2` al repositorio. El build no necesita llegar a Google Fonts y un solo archivo cubre los pesos 200 a 600 |
| WebGL2 y estados | Soportar WebGL1; mostrar solo la escena | Solo WebGL2 (three ≥ r163 no admite WebGL1). Cuatro estados visibles: `cargando` (miniatura), `lista` (escena y botón de animación), `sin-webgl` y `error` (miniatura con un aviso en una región `role="status"` presente desde el HTML del servidor). El fallo del Worker lleva a `error` y la ausencia de WebGL2, a `sin-webgl` |

## Consecuencias

- La escena es código imperativo en `montarEscena`: cada recurso (renderer, geometrías, materiales, observadores, manejadores) registra su limpieza y se libera en orden inverso, también si el montaje falla a medias. El lienzo se crea en cada montaje y se añade a un `div` de React, lo que evita fugas de contexto con StrictMode. El bucle se detiene con la pestaña oculta o la escena fuera de pantalla.
- Las estelas necesitan buffers de hasta `n + 1` vértices por cuerpo (≈ 9 000 vértices por cuerpo, ≈ 27 000 entre los tres, en el peor caso: Goggles con estela completa). Se reservan una vez por trayectoria y se reutilizan en cada fotograma.
- El campo ambiental, la miniatura y el reloj son deterministas y se prueban en Node sin navegador. Lo que depende de WebGL (que se dibuje de verdad, la cámara, la pausa) se prueba con Playwright sobre el WebGL por software del CI, que es lento y puede fallar un intento aislado.
- `ColorManagement` es global: cualquier otro módulo que use three y se cargue en la misma página heredará el ajuste. Hoy solo la escena lo usa.
- El tamaño de three no se ha medido; GRV-06 comprobará el presupuesto y, si no cabe, se poda.
- `src/lib/escena/` pasa a ser de `frontend` (AGENTS.md); `DESIGN.md` es de `arquitecto`.
- No se prueba la limpieza al desmontar (muchas idas y vueltas sin aviso de demasiados contextos WebGL): la portada no navega. Se comprobará en GRV-04.
