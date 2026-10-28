# GRV-04 · Galería, detalle y rutas

Qué se construyó, cómo replicarlo y qué se aprendió. Spec: `docs/specs/GRV-04.md`. Decisiones: `docs/adr/0006-estado-de-interfaz-rutas-y-metadatos.md`. Tokens y componentes: `DESIGN.md`.

## Resumen

La portada gana una galería con las seis soluciones periódicas y cada solución tiene su propia página, `/orbitas/<slug>`, con la simulación en 3D grande, controles de reproducción y una telemetría que se mueve a unos 10 Hz. Es la primera vez que la aplicación navega entre páginas con una escena WebGL, y todo el ticket gira en torno a tres preguntas: qué estado sobrevive a la navegación (y cuál no), cómo se escribe una telemetría viva sin re-renderizar React ni saturar a un lector de pantalla, y cómo se sirven seis páginas de detalle sin servidor en tiempo de petición.

Las respuestas, en una línea cada una:

- **Estado de interfaz:** un almacén de Zustand que se crea dentro de un proveedor del layout raíz, nunca como instancia de módulo, y que no persiste tras recargar.
- **Telemetría y deslizador:** se escriben directamente en el DOM desde el bucle de la escena, con un límite de 100 ms; React no participa.
- **Rutas:** `generateStaticParams` sobre el catálogo, `dynamicParams = false` y `notFound()`. Seis HTML prerenderizados con las miniaturas ya dibujadas.

Además cierra lo que GRV-03 dejó anotado para este ticket: la conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion` con la interfaz, la prueba de limpieza al desmontar, la prueba de pausa por `IntersectionObserver` y el favicon que devolvía 404.

## Alcance

- **Rutas:** la galería es la sección `#galeria` de `/`; el detalle es estático en `/orbitas/[slug]`; página 404 propia; metadatos por órbita; `sitemap.xml`; icono de la aplicación.
- **Galería:** seis miniaturas SVG calculadas en el servidor, cada una un enlace al detalle; selector de orden (catálogo, periodo, energía); al volver del detalle se conservan el orden y el foco.
- **Estado de interfaz** en `src/store/`, con proveedor en el layout raíz.
- **Detalle:** titular, descripción, crédito, visor grande conectado al Worker, controles (Reproducir/Pausar, velocidad, posición, longitud de estela, restablecer vista), telemetría en vivo, enlace de vuelta y navegación a la órbita anterior y siguiente.
- **Núcleo puro** en `src/lib/galeria/`: ordenación, formato de cifras, telemetría, mapeo de controles, navegación, metadatos, URL del sitio y datos de servidor.
- **Cambios en GRV-03**, todos opcionales y con valores por defecto que conservan la portada: `VisorOrbita` acepta reproducción controlada y más props, y `PropsEscenaOrbita` gana `vistaRestablecida`.
- **Fuera de alcance:** buscador de órbitas propias, estado de reproducción o de vista en la URL, imágenes Open Graph, persistencia tras recargar, una ruta `/orbitas`, gráficas de la telemetría, la ley interactiva y el tutor (GRV-05), los presupuestos de rendimiento (GRV-06) y el Dockerfile con el valor real de `URL_SITIO` (GRV-07).

## Commits del ticket

Rama: `feature/galeria-y-detalle-de-orbitas` → `develop`. Commits del rango `develop..HEAD`, del más antiguo al más reciente, sin contar el que añade este documento.

| Hash | Commit |
|---|---|
| `fe10f2f` | `docs(GRV-04): redactar la spec de la galería, el detalle y las rutas` |
| `cdb9d84` | `docs(GRV-04): incorporar la revisión independiente en la spec` |
| `e317192` | `docs(GRV-04): sustituir la prueba de riesgo en el CI por una medición local` |
| `ee99e72` | `docs(GRV-04): aprobar la spec y fijar la propiedad de src/lib/galeria` |
| `e65fd07` | `docs(GRV-04): documentar en DESIGN.md el selector, la telemetría y los deslizadores` |
| `86b984b` | `chore(GRV-04): ignorar la carpeta .vercel` |
| `2686cfb` | `docs(GRV-04): alinear las tolerancias de la spec con las mediciones` |
| `ba1dcad` | `test(GRV-04): escribir los tests de la galería, el detalle y las rutas` |
| `00b2eee` | `docs(GRV-04): fijar en la spec lo que la auditoría de los tests señaló` |
| `cf72541` | `test(GRV-04): corregir los tests tras la auditoría independiente (parcial)` |
| `96aff60` | `test(GRV-04): completar las correcciones de los tests tras la auditoría` |
| `f8127d2` | `build(GRV-04): confinar zustand y el barril de física con ESLint y declarar URL_SITIO` |
| `aa8bdee` | `feat(GRV-04): preparar el visor para reproducción controlada, tamaño grande y vista restablecida` |
| `2b37706` | `feat(GRV-04): añadir el núcleo de formato y telemetría y parte de los controles del detalle (parcial)` |
| `a3b8d38` | `feat(GRV-04): añadir la galería, el almacén de interfaz y la restauración del foco al volver` |
| `b6996e5` | `feat(GRV-04): añadir las rutas de detalle, la página 404, los metadatos, el sitemap y el icono` |
| `fbaa25d` | `docs(GRV-04): documentar la decisión del estado de interfaz, las rutas y los metadatos` |

Los cuatro `feat` son los cuatro bloques por riesgo del orden de trabajo de la spec: (a) el visor, (b) controles y telemetría, (c) galería, almacén y foco, (d) rutas y metadatos. El `(parcial)` del segundo significa que ese commit deja a medias los controles del detalle, que se cierran en los dos siguientes.

## Qué se construyó

**Núcleo puro, en `src/lib/galeria/`** (sin React, DOM, Next ni zustand):

- **`orden.ts`:** `ORDENES`, `ordenarGaleria` (devuelve un array nuevo; los empates se resuelven por el índice en `SLUGS`) y `avisoDeOrden`.
- **`formato.ts`:** `formatearCifra`, `formatearPorcentaje`, `formatearTiempo`, `textoPosicion`, `textoEstela` y `textoVelocidad`. Coma decimal y signo menos U+2212. El porcentaje y el tiempo **truncan**, con una tolerancia de 1e-9 para que 0,29 no se quede en 0,28, y el porcentaje nunca llega a «100,0 %».
- **`controles.ts`:** las velocidades (`0,25×` a `4×`), el rango de la estela, el rango del deslizador de posición (0 a 0,999 con paso 0,001) y su conversión.
- **`navegacion.ts`:** `rutaDeOrbita`, `RUTA_GALERIA`, `vecinas` (cíclico, en orden de catálogo) y `ETIQUETA_SOLUCION`.
- **`telemetria.ts`:** `leerTelemetria` (con `metricas` sobre el estado que entrega la escena), `formatearLectura`, `debeActualizar` y `valorDeFase`.
- **`fichas.ts`** (solo servidor): `fichaDeOrbita(slug)`, memoizada por proceso, y `resumirCatalogo()`.
- **`sitio.ts`:** `resolverUrlSitio(entorno)` y `entradasSitemap(base)`.
- **`metadatos.ts`:** `metadatosDeOrbita`.

**Almacén, en `src/store/`:**

- **`almacenInterfaz.ts`:** `crearAlmacenInterfaz`, `ESTADO_INICIAL` (congelado) y `selectores`. Seis campos: `ordenGaleria`, `ultimaOrbita`, `velocidad`, `longitudEstela`, `reanudacion` y `entradaPorHistorial`.
- **`ProveedorAlmacen.tsx`:** crea el almacén con `useState(() => crearAlmacenInterfaz())`, escucha `popstate` y ofrece `useAlmacen` (suscripción con selector) y `useAlmacenApi` (lectura puntual con `getState`).

**Componentes:**

- **`src/components/galeria/`:** `Galeria` (servidor), `ElementoGaleria` (servidor), `GaleriaOrdenable` (isla de cliente) y `useRestaurarFoco`.
- **`src/components/detalle/`:** `DetalleOrbita`, `DetalleOrbitaConectado`, `ControlesReproduccion`, `Telemetria` y `NavegacionOrbitas` (servidor).
- **`src/components/comunes/`:** `SelectorTexto` (grupo de radios con aspecto de texto) y `BotonAnimacion`, compartido por la portada y el detalle.
- **`src/components/escena/`:** `useReproduccion` (extraído de `VisorOrbita`) y las props nuevas de `VisorOrbita` y `EscenaOrbita`.

**Rutas, en `src/app/`:** `orbitas/[slug]/page.tsx`, `not-found.tsx`, `sitemap.ts`, `icon.svg`, y cambios en `layout.tsx` (`metadataBase` y `ProveedorAlmacen`) y `page.tsx` (la galería bajo el hero).

**Y además:** tres bloques de ESLint que sustituyen al de three de GRV-03 y otros tres para el código de cliente (`eslint.config.mjs`), `URL_SITIO` en `.env.example`, ayudas nuevas en `tests/e2e/ayudas.ts` y el ADR 0006.

## Cómo replicarlo

1. **Escribir la spec, revisarla con mediciones y recién entonces aprobarla.** Antes de fijar ningún tope se construyó un prototipo desechable (que no se commiteó) con Zustand, el proveedor, el selector y la isla de la galería, y se midió: +1 330 B de JavaScript gzip, 12 idas y vueltas sin contextos WebGL sin liberar, navegación cliente hasta `lista` en 61–290 ms y 47–60 fps con un lienzo de 1280×720 por software. Con esas cifras se fijaron los topes (+8 KB de JS, 200 000 B de HTML en `/`, 80 000 B en los detalles) y las tolerancias de los criterios de tiempo (`cdb9d84`, `e317192`, `2686cfb`).
2. **Instalar Zustand y confinarlo.** `zustand@^5` en `dependencies`. En `eslint.config.mjs` hay que repartir las prohibiciones entre bloques que se **repiten** los patrones que les corresponden (ver «Qué se aprendió»): `src/**` y `tests/**` prohíben `three` y `zustand` (estáticos y `import()`), la escena solo prohíbe `zustand` y el almacén solo prohíbe `three`. Un bloque más para el código de cliente prohíbe los **valores** del barril `@/lib/fisica` (`allowTypeImports: true`) y obliga a importar `@/lib/fisica/tipos` y `@/lib/fisica/metricas`. Añadir `URL_SITIO=http://localhost:3000` a `.env.example`.
3. **Núcleo puro con los tests primero.** Cada función de `src/lib/galeria/` se escribe contra los criterios 1 a 9 y se prueba en Node. Es lo que permite fijar el formato (`−1,287`, `50,0 %`, `3,16`) y el ritmo de la telemetría (`debeActualizar`, límite inclusivo, siempre verdadero en pausa) sin abrir un navegador.
4. **Rutas estáticas.** En `src/app/orbitas/[slug]/page.tsx`:
   - `export const dynamicParams = false;` como literal (Next lo analiza estáticamente) y `generateStaticParams` que devuelve `SLUGS.map((slug) => ({ slug }))`.
   - `params` es una `Promise<{ slug: string }>`: se lee con `await` tanto en la página como en `generateMetadata`.
   - `obtenerOrbita(slug) ?? notFound()` para un slug fuera del catálogo.
   - No usar el helper global `PageProps`: solo existe tras generar tipos, y `npm run typecheck` corre en CI sin haber compilado.
   - No activar Cache Components: `dynamicParams` no existe con ellos.
5. **Fichas del servidor.** `fichaDeOrbita(slug)` integra el periodo y traza la miniatura al compilar (`integrarPeriodo` + `trazarMiniatura`, la misma función pura que ya usaba la portada). A la página de detalle y a la galería **solo se pasan los trazos y unas cifras**, nunca la `Trayectoria`: serializarla multiplicaría el peso del HTML, y el tope de 80 000 B existe para detectarlo. `Galeria` es un componente de servidor que renderiza los seis `<li>` y los entrega a la isla `GaleriaOrdenable` en un `Record<Slug, ReactNode>`, junto con un resumen ligero (`resumirCatalogo`, que no integra).
6. **Almacén por proveedor.** `almacenInterfaz.ts` es TypeScript puro con `createStore` de `zustand/vanilla`; `ProveedorAlmacen` lo crea en un `useState` y vive en `layout.tsx` dentro de `<main>`, de modo que no se desmonta al navegar. Reglas que se probaron:
   - El módulo no exporta ninguna instancia de almacén.
   - Cada acción compara antes de llamar a `set`: si el valor no cambia, no se notifica a nadie.
   - Las acciones validan su entrada (`fijarVelocidad` ignora lo que no está en `VELOCIDADES`; `fijarLongitudEstela` limita a [0,05, 1] e ignora lo no finito; `guardarReanudacion` envuelve la posición, copia la vista, **sustituye** el objeto `reanudacion` en lugar de mutarlo e ignora números no finitos).
   - Los selectores devuelven primitivos o la misma referencia.
   - Nada de `localStorage`, `sessionStorage` ni `persist`: una prueba de repositorio lo comprueba leyendo el código sin comentarios.
7. **Visor controlado.** `useReproduccion` sale de `VisorOrbita` a un hook propio, que conserva la lógica de movimiento reducido de GRV-03. `VisorOrbita` pasa a aceptar `reproduciendo` y `alAlternarReproduccion` (si se pasan, la reproducción la controla quien llama; si no, estado propio), además de `tamano`, `giroAutomatico`, `controlAnimacion`, `velocidad`, `longitudEstela`, `posicionInicial`, `vistaInicial`, `vistaRestablecida` y los callbacks `alCambiarEstado`, `alListo`, `alFotograma` y `alCambiarVista`. Todas son opcionales y con valores por defecto, de modo que las pruebas de GRV-03 no cambian. `vistaRestablecida` distingue la vista con la que nace la escena de la vista a la que vuelve «Restablecer vista»: el detalle nace en la vista recordada y restablece siempre a `VISTA_INICIAL`.
8. **Controles imperativos.** En `ControlesReproduccion`:
   - El deslizador de posición **no es un control de React**: nace con `defaultValue` y solo se escribe a través de `mostrarPosicion(u)`, que `DetalleOrbita` llama desde el bucle. Si el deslizador tiene el foco y la escena está en marcha, no se escribe ni `value` ni `aria-valuetext` (el texto visible de al lado, con `aria-hidden`, sí): así un lector de pantalla no anuncia cada cambio.
   - Cualquier cambio hecho por la persona (`onChange`) pausa la reproducción y llama a `fijarPosicion`.
   - Los controles se renderizan desde el primer HTML pero con `inert` e `invisible` mientras la escena no está `lista` (y `hidden` si pasa a `sin-webgl` o `error`). Reservan su altura y sus referencias existen cuando llega el primer fotograma, que `montarEscena` entrega antes de `alListo`.
   - El botón violeta se reubica: pasa de `VisorOrbita` a esta barra, con `controlAnimacion={false}` en el detalle.
9. **Telemetría.** `DetalleOrbita.alFotograma` toma **una sola decisión de ritmo por fotograma**: `debeActualizar(ahora, ultimaEscritura, reproduciendo)`; en pausa escribe al instante, pero solo si `u` cambió desde la última escritura (para no contar escrituras vacías al redimensionar). Entonces llama a `telemetria.escribir(u, estado)` y a `controles.mostrarPosicion(u)`. Ninguno de los dos llama a un `set` de React. En `Telemetria`:
   - Cada cifra viva es un `<span data-cifra aria-hidden="true">` cuyo `textContent` se reescribe solo si cambia.
   - Cada columna añade un texto estático legible (`data-resumen`) con el valor inicial o el extremo del periodo («Se conserva: −1,287», «Mínima del periodo: 0,011»).
   - Nada de `aria-live`, `<output>` ni `role="timer"`.
   - La barra de fase se mueve con `transform: scaleX(...)`, sin recalcular el diseño, y `data-actualizaciones` cuenta las escrituras: es lo que permite probar desde fuera que el ritmo es de ≈10 Hz y no el de cada fotograma.
   - La distancia mínima y la velocidad máxima en vivo son **instantáneas** (el par más cercano y el cuerpo más rápido ahora); debajo, en gris, va el extremo del periodo que ya trae la `Trayectoria`.
10. **Galería y foco al volver.**
    - `GaleriaOrdenable` lee `ordenGaleria` del almacén **al renderizar**, no en un efecto. El estado inicial es una constante idéntica en servidor y cliente, así que no hay desajuste de hidratación; el orden restaurado solo aparece en navegaciones cliente, que no hidratan, y la lista ya se pinta en el orden elegido.
    - `SelectorTexto` es un `role="radiogroup"` nombrado con `aria-labelledby` por su texto visible (WCAG 2.5.3). Cada opción es un `<input type="radio" className="sr-only">` con su `<label>`; el subrayado ámbar, el contorno de foco y el área mínima viven en la etiqueta, no en el `input`. Una sola parada de tabulación y flechas nativas.
    - El detalle, al montarse, llama a `recordarOrbita(slug)` y desmarca `entradaPorHistorial`; la galería, al montarse, **siempre** consume y olvida `ultimaOrbita`. Se registra en el detalle y no en el clic de la miniatura porque así se cubren también el botón «atrás» y «adelante» y la entrada directa por una URL compartida.
    - `useRestaurarFoco` enfoca la miniatura (`preventScroll`) y la centra solo si no está entera en pantalla, pero **solo** si `location.hash === '#galeria'` o la llegada fue un `popstate`. El proveedor escucha `popstate` en fase de captura, para marcarlo antes de que Next renderice el destino.
    - La restauración va en un `requestAnimationFrame` desde un efecto de montaje, después del desplazamiento propio de Next, y el resultado de consumir `ultimaOrbita` se guarda en una `ref` para que sobreviva a la repetición de efectos de StrictMode.
11. **Reanudación por órbita.** Al desmontarse, `DetalleOrbita` entrega a `alSalir` la última posición (`u`) y la última vista **objetivo** (la de `alCambiarVista`, no la suavizada), pero solo si la escena llegó a dibujar un fotograma. `DetalleOrbitaConectado` la guarda en el almacén y la lee una sola vez al montar (`getState`, sin suscripción) para pasarla como `posicionInicial` y `vistaInicial`. Monta `Conectado` con `key={slug}`, de modo que al pasar de una órbita a otra se vuelve a leer.
12. **404, metadatos, sitemap e icono.**
    - `src/app/not-found.tsx` en la raíz, dentro del layout: lo sirven `notFound()` y cualquier URL sin ruta (incluida `/orbitas`).
    - `metadatosDeOrbita` devuelve `title` «Nombre · Órbitas», la `description` del catálogo, y `canonical` y `openGraph.url` como rutas relativas; `metadataBase` en el layout, a partir de `resolverUrlSitio(process.env)`, las completa. El `title` del layout se queda como cadena, sin plantilla, porque el test de GRV-01 exige `typeof metadata.title === 'string'`.
    - `resolverUrlSitio`: prioridad `URL_SITIO`, después `VERCEL_PROJECT_PRODUCTION_URL` (host sin esquema, se le antepone `https://`) y después `http://localhost:3000`. Una cadena vacía cuenta como ausente. Lanza un `Error` que nombra la variable si no es una URL, si no es `http:` o `https:` o si lleva ruta, y devuelve solo el origen.
    - `src/app/sitemap.ts` devuelve `entradasSitemap(...)`: `/` y las seis rutas, en orden de catálogo.
    - `src/app/icon.svg` con el triángulo de la cabecera (`10,1 19,18 1,18`). Un SVG de icono no lee variables CSS, así que el `fill` es un literal igual a `--color-electric-iris`: es la única excepción a «los colores solo viven en `@theme`», está documentada en `DESIGN.md` y una prueba de repositorio la ata al token.
13. **Pruebas.** Vitest para lo puro y el almacén; Playwright para lo visible, en pocos archivos y con un solo `goto` por estado (ver las dos secciones siguientes).

## Decisiones clave y por qué

La tabla completa, con las opciones descartadas, está en el ADR 0006. Las que más condicionan el resto:

- **Un almacén por proveedor, nunca una instancia de módulo.** En el servidor el módulo es compartido entre peticiones: un `create(...)` exportado filtraría el estado de una persona a otra. El proveedor del layout raíz no se desmonta al navegar, así que el estado sobrevive a ir y volver.
- **Qué se conserva y qué no.** Seis campos. La reproducción, la posición de la órbita en curso y la vista suavizada no se guardan. `velocidad` y `longitudEstela` son preferencias compartidas entre órbitas; la reanudación es por órbita.
- **La última órbita se registra en el detalle.** El clic de la miniatura no cubriría «atrás», «adelante» ni la entrada directa.
- **El foco solo se restaura con una señal de que la persona vuelve** (`#galeria` o `popstate`). Sin esa condición, el logotipo de la cabecera movería el foco y el scroll de una portada que se abre «de nuevo».
- **Rutas estáticas sin `/orbitas`.** Seis HTML prerenderizados y ningún servidor en tiempo de petición. El coste es que `/orbitas` da 404.
- **La telemetría no pasa por React.** Escritura imperativa a ≈10 Hz, cifras vivas con `aria-hidden` y un texto estático al lado.
- **Controles desde el primer HTML, ocultos hasta `lista`.** Reservan su altura (la telemetría no se desplaza al llegar la escena) y sus referencias existen a tiempo. A cambio, el HTML trae controles que no sirven sin JavaScript: no se ven ni se enfocan.
- **Por debajo de 900 px la telemetría va visualmente justo bajo el visor** (`order` de CSS en `DetalleOrbita`). No tiene elementos enfocables, así que el orden de tabulación no cambia.
- **El detalle es un instrumento:** sin giro automático (la cámara solo se mueve cuando la persona la mueve) y con el visor en tamaño grande.
- **Anterior y siguiente en orden de catálogo,** no en el que se haya elegido en la galería, para que el HTML del detalle sea estático.
- **Código de cliente sin el barril de física.** Importar `SLUGS` desde `@/lib/fisica` costaba +999 B gzip más en el JS inicial; de ahí la regla de ESLint y los imports de `@/lib/fisica/tipos` y `@/lib/fisica/metricas`.

### Desvíos respecto a la spec

- **`valorDeFase`** (fase con tres decimales truncados para el `data-valor` de la barra) no figuraba en el contrato de `telemetria.ts` de la spec y se añadió en ese archivo, para que la barra siga la misma regla de truncado que el resto de cifras.
- **Commits «(parcial)».** Un commit de tests (`cf72541`, completado por `96aff60`) y uno de código (`2b37706`, completado en los siguientes) se entregaron a medias, y sus mensajes lo dicen.
- **Lo que más toca el código de GRV-03** son las decisiones de la spec de reubicar el botón violeta (en el detalle, `VisorOrbita` ya no es su dueño) y de quitar el giro automático del detalle, no un desvío.

## La forma de trabajar con las pruebas

El orden fue spec → revisión independiente de la spec con mediciones → tests en rojo → auditoría de los tests → código en verde en cuatro bloques → revisión final.

1. **Spec con treinta y seis criterios** en formato dado / cuando / entonces, y con una tabla de variantes erróneas que la revisión de los tests debía probar (`fe10f2f`).
2. **Revisión independiente de la spec, con mediciones** (`cdb9d84`, `e317192`, `2686cfb`). La revisión no se limitó a leerla: se midió con el prototipo desechable descrito arriba. Por eso la spec cita cifras medidas (el peso de la portada, los fps, los tiempos de navegación, la frecuencia de la telemetría) y no estimaciones. La «prueba de riesgo en el CI» se sustituyó por esa medición local.
3. **Tests en rojo** (`ba1dcad`), escritos desde los criterios y no desde la implementación. Se comprobó que fallaban por falta de código y no por estar mal escritos.
4. **Auditoría independiente de los tests** (`00b2eee`, `cf72541`, `96aff60`). Se introdujeron unas 115 variantes erróneas deliberadas del código (un orden descendente, el guion corto en lugar del signo menos, redondear en lugar de truncar, un almacén como instancia de módulo, un bloque de ESLint que desactiva la regla de three, una telemetría congelada en la lectura inicial, etc.) y se comprobó que algún test fallaba con cada una. Donde ninguno fallaba, se reforzó el test o se fijó el detalle en la spec.
5. **Código en verde en cuatro bloques** (`aa8bdee`, `2b37706`, `a3b8d38`, `b6996e5`), cada uno con el linter, los tipos y los tests de sus criterios en verde antes de pasar al siguiente. Se ordenaron por riesgo: primero el refactor del visor (donde un fallo rompe GRV-03), luego los controles y la telemetría, después el almacén y el foco, y por último las rutas.
6. **Revisión final con 62 mutaciones** sobre el código ya terminado. Cada mutación es un cambio pequeño y plausible del código de producción; si ningún test fallaba, el hueco se cerró.

### Qué huecos se cerraron

- **Las guardas del almacén.** Una acción que notifica sin cambio de valor pasaba inadvertida si el test solo miraba el estado final. Los tests suscriben un observador y comprueban que **no se le llama**, también al repetir la misma velocidad, el mismo orden, el valor ya limitado de la estela, la misma entrada por historial o la misma reanudación.
- **Truncado frente a redondeo.** `formatearTiempo(6.32585)` debe dar `6,32` mientras que `formatearCifra(6.32585, 2)` da `6,33`; `formatearPorcentaje(1 - 1e-12)` debe dar `99,9 %` y no `100,0 %`; y `0,29` debe dar `29,0 %` y no `28,9 %` (el error binario de 0,28999…). Hay pruebas para cada una de esas direcciones del error, también cuando `u` sale de una división o de una resta.
- **Foco con `#galeria` y con `popstate`.** Una restauración «siempre» y una restauración «nunca» pasan los tests de un solo recorrido. Se probaron los tres caminos: «Volver a la galería» (hash), el botón «atrás» del navegador (`popstate`, a 375 y a 1440 px de ancho) y la entrada directa por URL.
- **El logotipo.** El camino que no debe restaurar nada necesitaba su propia prueba: con el orden elegido y la página desplazada, entrar en Moth I y pulsar el logotipo deja la URL en `/`, `window.scrollY` en 0 y ningún enlace de la galería enfocado, mientras que el orden elegido sigue marcado (el estado se conserva; solo se omiten foco y scroll).
- **El primer orden pintado tras volver.** Para detectar un orden aplicado en un efecto, un `MutationObserver` instalado antes de volver registra el orden de los enlaces cada vez que aparece la lista, y el primer registro no puede ser el de catálogo.
- **Escritura en pausa.** Limitar a 100 ms también en pausa dejaría sin reflejar la última posición fijada con el deslizador. Los tests comprueban que en pausa el contador de escrituras no cambia durante un segundo, y que fijar la posición lo incrementa y escribe el valor correcto (cifras iguales a `formatearLectura(leerTelemetria(estadoEn(...)))` calculado en Node); una telemetría que se quedase con la lectura inicial no lo cumple.
- **Una comprobación negativa necesita su contraste,** como ya se aprendió en GRV-03: «`data-posicion` no cambia durante 600 ms» solo vale si después se demuestra con un cambio de deslizador que la página lo estaba procesando.

### Cuándo se corrige un test

Un test solo se corrige con justificación y por escrito. Aquí, las correcciones de los tests se hicieron en commits propios, `cf72541` y `96aff60`, derivados de la auditoría, y la spec se alineó antes (`00b2eee`) para que lo corregido tuviera su criterio. No se saltó, desactivó ni puso en cuarentena ninguna prueba.

## Verificación

| Criterio | Prueba |
|---|---|
| 1 Orden de la galería | `tests/unit/galeria/orden.test.ts` |
| 2 Navegación y etiquetas | `tests/unit/galeria/navegacion.test.ts` |
| 3 Formato de cifras | `tests/unit/galeria/formato.test.ts` |
| 4 Mapeo de controles | `tests/unit/galeria/controles.test.ts` |
| 5 y 6 Telemetría y su ritmo | `tests/unit/galeria/telemetria.test.ts` |
| 7 Almacén | `tests/unit/store/almacenInterfaz.test.ts` |
| 8 Sitio, sitemap y metadatos | `tests/unit/galeria/sitio.test.ts` |
| 9 Datos de servidor | `tests/unit/galeria/fichas.test.ts` |
| 10 Invariantes del repositorio y reglas de ESLint | `tests/repo/galeria.test.ts` |
| 11 Rutas estáticas | `tests/e2e/rutas.spec.ts` (lee `.next/prerender-manifest.json`) |
| 12 Detalle sin JavaScript | `tests/e2e/rutas.spec.ts` |
| 13 404 | `tests/e2e/rutas.spec.ts` |
| 14 Metadatos y sitemap | `tests/e2e/rutas.spec.ts` |
| 15 Icono | `tests/e2e/rutas.spec.ts` |
| 16 Galería en el HTML del servidor | `tests/e2e/rutas.spec.ts` (sin JavaScript) |
| 17 Presupuesto de JavaScript y three fuera | `tests/e2e/rutas.spec.ts` |
| 18 Orden e hidratación | `tests/e2e/galeria.spec.ts` |
| 19 Volver con el botón del navegador | `tests/e2e/galeria.spec.ts` (375 y 1440 px) |
| 20 Volver con el enlace y sin persistencia | `tests/e2e/galeria.spec.ts` |
| 21 Anterior y siguiente | `tests/e2e/galeria.spec.ts` |
| 22 Limpieza al desmontar | `tests/e2e/galeria.spec.ts` (12 idas y vueltas) |
| 23 Controles presentes | `tests/e2e/detalle.spec.ts` |
| 24 Velocidad | `tests/e2e/detalle.spec.ts` |
| 25 Deslizador de posición | `tests/e2e/detalle.spec.ts` |
| 26 Longitud de la estela | `tests/e2e/detalle.spec.ts` |
| 27 Reproducir, pausar y restablecer | `tests/e2e/detalle.spec.ts` |
| 28 Preferencias compartidas | `tests/e2e/detalle.spec.ts` |
| 29 Reanudación por órbita | `tests/e2e/detalle.spec.ts` y `tests/e2e/detalle-alternativas.spec.ts` |
| 30 Telemetría en vivo | `tests/e2e/detalle.spec.ts` |
| 31 Accesibilidad de controles y telemetría | `tests/e2e/detalle.spec.ts` y `tests/e2e/galeria.spec.ts` («Ordenar por») |
| 32 Responsive y estabilidad | `tests/e2e/detalle.spec.ts` (incluye la pausa por `IntersectionObserver`) |
| 33 Movimiento reducido y galería sin animación | `tests/e2e/detalle-alternativas.spec.ts` y `tests/e2e/galeria.spec.ts` |
| 34 Estados alternativos en el detalle | `tests/e2e/detalle-alternativas.spec.ts` |
| 35 Sin regresiones de GRV-03 | `tests/unit/galeria/layoutRaiz.test.ts` y las pruebas de GRV-01 a GRV-03, sin cambios |
| 36 El logotipo no restaura la galería | `tests/e2e/galeria.spec.ts` |

Las ayudas nuevas de las pruebas de navegador están en `tests/e2e/ayudas.ts`: instrumentación de contextos WebGL, de construcciones de `Worker` y de mensajes `calcular`; cronómetros hasta `lista`; muestreo de `data-posicion` con su hora y ajuste de una recta a la posición desenvuelta; muestreo de la telemetría; paradas de tabulación; contorno de foco y subrayado de las etiquetas de los radios; orden de los enlaces de la galería; y el peso gzip de los scripts iniciales.

### Cómo ejecutar las pruebas

```bash
npm ci
npm test                      # Vitest: física, Worker, escena, galería, almacén e invariantes del repositorio
npx vitest run tests/unit/galeria tests/unit/store tests/repo/galeria.test.ts   # solo las de este ticket
npx playwright install chromium   # solo la primera vez
npm run test:e2e              # compila, sirve en el puerto 3100 y lanza Playwright
npx playwright test tests/e2e/rutas.spec.ts tests/e2e/galeria.spec.ts tests/e2e/detalle.spec.ts tests/e2e/detalle-alternativas.spec.ts
npm run lint && npm run typecheck && npm run format:check
```

El E2E lanza Chromium con WebGL por software. La prueba de las 12 idas y vueltas fija su propio `timeout` (180 s). `tests/e2e/rutas.spec.ts` lee `.next/prerender-manifest.json`, así que necesita el build que arranca el servidor de pruebas.

## Mediciones

Medidas sobre este ticket, con el mismo método de la línea base (gzip nivel 9, scripts que referencia el HTML de `/`):

| Magnitud | Antes (`develop`) | Con GRV-04 | Tope de la spec |
|---|---|---|---|
| JS inicial de `/`, gzip | 181 502 B | 183 932 B (+2 430 B) | +8 192 B |
| HTML de `/`, sin comprimir | 21 330 B | 135 695 B | 200 000 B |
| HTML de cada detalle, sin comprimir | — | de 33,9 a 44,4 KB (Yin-Yang I el mayor, 44 386 B) | 80 000 B |
| Build en frío | — | ≈ 12 s | — |
| Telemetría | — | ≈ 9–10 Hz | 2–12 escrituras por segundo |
| Contextos WebGL tras 12 idas y vueltas | — | 1 vivo | como mucho 1 |

La spec estimaba 24–34 KB para los detalles, así que la estimación se quedó corta en unos 10 KB: la medición, no el cálculo previo, es la que vale. El tope de 80 000 B sigue detectando lo que debe (una `Trayectoria` serializada), no regresiones finas.

## Qué se aprendió

- **Con `--spacing: 6px`, las utilidades numéricas de Tailwind no miden lo que se espera.** `min-h-11` mide 66 px, no 44. El área táctil mínima de 44 px se cumple con `min-h-8` (48 px); los enlaces «Volver», «Anterior» y «Siguiente» usan `min-h-11` y miden 66 px, más de lo necesario. Antes de usar un número de la escala, multiplicarlo por el `--spacing` del proyecto.
- **En Tailwind, mezclar puntos de corte en `rem` y en `px` es una trampa.** Los puntos de corte por defecto (`sm`, `md`…) están en `rem` y el propio `--breakpoint-columnas` está en `px`; las reglas se ordenan comparando valores, y esa comparación puede no coincidir con el orden visual cuando las unidades difieren. La galería pasa de una a dos y a tres columnas con `min-[640px]:grid-cols-2 columnas:grid-cols-3`, ambos cortes en `px`, en lugar de `sm:`, que está en `rem`. Dentro de un mismo componente, conviene usar una sola unidad.
- **Zustand en el App Router: un almacén por proveedor.** El módulo del servidor se comparte entre peticiones; una instancia de módulo filtraría estado entre personas. Con `createStore` de `zustand/vanilla` y un contexto, cada árbol tiene su almacén. En la v5, un selector que devuelve un objeto o un array nuevo en cada llamada provoca un bucle infinito: los selectores devuelven primitivos.
- **En ESLint, el último bloque que coincide con un archivo sustituye por completo `no-restricted-imports`.** No se fusionan. Un bloque nuevo para `src/store/**` que solo mencione el barril de física **borra** la prohibición de three que daba el bloque anterior. Hay que repetir los patrones de la zona en cada bloque, y una prueba con la API de ESLint (`lintText` y una ruta simulada) es la única forma fiable de detectar que se ha olvidado alguno: `tests/repo/galeria.test.ts` lo comprueba para las combinaciones de carpeta, módulo y forma de importación (estática y `import()`).
- **Restaurar el foco depende del orden de efectos de Next.** Next hace su propio desplazamiento después de montar la página y deshace el centrado hecho antes. Por eso la restauración espera a un `requestAnimationFrame` desde el efecto de montaje, y hay que guardar el resultado de consumir `ultimaOrbita` en una `ref` porque StrictMode repite los efectos y el segundo ya no encontraría nada. Si una versión futura cambia ese orden, lo detectan los criterios 19, 20 y 36.
- **Una señal de navegación se escucha en captura y desde un componente que no se desmonta.** El oyente de `popstate` del proveedor está en fase de captura para marcar `entradaPorHistorial` antes de que Next renderice el destino; el proveedor vive en el layout raíz, que sobrevive a la navegación.
- **Los criterios de fps necesitan margen.** SwiftShader da 47–60 fps con un lienzo de 1280×720, y el criterio de la telemetría exige que avance «al menos 20» fotogramas por segundo: el suelo es suficiente para distinguir una escritura por fotograma de una a 10 Hz sin ser frágil. Lo mismo con `data-posicion`, que se escribe como mucho cada 100 ms y puede ir retrasado hasta 300 ms: los criterios que lo comparan con otra lectura suman ese retraso a la cota en lugar de exigir una igualdad.
- **Una cota de posición debe poder distinguir un reinicio de una reanudación.** Con periodos de 6 s, una cota de «varias décimas de periodo» no distingue volver a 0 de seguir donde se dejó; por eso la prueba de reanudación sin movimiento reducido usa Yin-Yang I (periodo 17,33 s).
- **No escribir en un control enfocado es una decisión de accesibilidad.** Un lector de pantalla anuncia cada cambio de `value` o de `aria-valuetext`. Escribir el texto visible (`aria-hidden`) y dejar quieto el control mientras tiene el foco da la misma información visual sin ruido sonoro. El coste es que, con el foco puesto, el pulgar queda quieto mientras la órbita avanza.
- **Reservar el espacio es mejor que corregir el desplazamiento.** Renderizar los controles desde el primer HTML, `invisible` e `inert`, permite exigir (criterio 32) que el borde superior de la telemetría se desplace menos de 2 px entre el estado `cargando` y `lista`, a 375 y a 1440 px.
- **Una constante idéntica en servidor y cliente evita el desajuste de hidratación.** El orden restaurado solo aparece en navegaciones cliente, que no hidratan, así que basta con leer el almacén al renderizar.
- **Contar contextos WebGL es la única forma de probar la limpieza al desmontar.** La prueba instrumenta `getContext('webgl2')` antes de que cargue la página, cuenta cuántos se crearon y cuántos siguen sin perderse, y exige además que no haya avisos de «Too many active WebGL contexts» y que se construyera un solo `Worker` con solo dos peticiones `calcular` (una por órbita visitada: la caché del cliente funciona).
- **Un archivo SVG no lee variables CSS.** El icono tiene un color literal; la forma de no romper la regla de «los colores solo en `@theme`» es documentar la excepción y atarla al token con una prueba.
- **Medir antes de fijar un tope.** El prototipo mínimo pronosticó +1 330 B de JavaScript y la medición final dio +2 430 B; ambos caben holgadamente en +8 KB. Pero el HTML de los detalles resultó un 30 % mayor que lo estimado: los topes se fijaron con margen para que uno impreciso no bloqueara un trabajo correcto.

## Límites y pendientes conocidos

- **Sin buscador de órbitas propias.** La parte B del producto admite «crecer» con un buscador; no está en este ticket.
- **Sin estado en la URL.** La URL identifica la órbita y nada más: velocidad, estela, posición y vista no son compartibles.
- **Sin imágenes Open Graph.** El `openGraph` lleva título, descripción, URL y tipo, pero ninguna imagen.
- **Sin persistencia tras recargar.** Todo el estado de interfaz es de sesión de navegación.
- **La reanudación por órbita es solo de sesión.** Se pierde al recargar y no se comparte entre pestañas.
- **`/orbitas` da 404.** Es consecuencia de no tener ruta índice; el 404 ofrece el enlace a la galería.
- **`favicon.ico` sigue dando 404** en los navegadores sin soporte de icono SVG. No se añadió un `favicon.ico`.
- **`URL_SITIO` se lee al compilar.** Las páginas y el sitemap son estáticos; sin la variable, el canonical y el sitemap apuntan a `http://localhost:3000` (o al host de producción de Vercel, si existe `VERCEL_PROJECT_PRODUCTION_URL`, cuya existencia no se ha verificado aquí). En Docker debe pasarse como `ARG` de la etapa de build; queda para GRV-07.
- **El HTML de la portada crece a 135 KB** (de 21 KB): las seis miniaturas viajan dos veces (HTML y datos de Next) y la de la figura de ocho cuatro (hero y galería). Es el coste de no enviar JavaScript 3D en la galería. Una opción a valorar en GRV-06 si el presupuesto lo pide.
- **La regla de ESLint solo detecta `import()` con literal.** `import('zustand')` e `import('three')` se prohíben fuera de su zona, pero una importación dinámica con una expresión calculada no la detecta la regla.
- **Anterior y siguiente en orden de catálogo,** no en el de la galería.
- **Quien usa lector de pantalla no oye el valor «ahora»** de la telemetría ni los cambios del deslizador de posición con el foco puesto y la escena en marcha; sí recibe las magnitudes, sus valores iniciales y los extremos del periodo.
- **Sin JavaScript,** el selector de orden no actúa y los controles no se ven ni se enfocan; los enlaces de la galería y el HTML del detalle sí funcionan.
- **Telemetría congelada fuera de pantalla.** Con el lienzo fuera de la vista, el bucle se detiene (GRV-03) y la telemetría con él.
- **La restauración del foco depende de Next.** Del orden de efectos y de dos señales de navegación (`location.hash` y `popstate`).
- **WebGL por software en CI.** La prueba de 12 idas y vueltas crea 24 escenas con SwiftShader; es lenta y un intento aislado puede fallar. Hay un reintento configurado. Si el CI de la PR encontrara fugas o fps insuficientes, se ajustan las tolerancias y, solo si lo exigen la limpieza de contextos o los fps, el ticket se parte en GRV-04a y GRV-04b.
- **Saldo de GRV-03.** La conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion`, la limpieza al desmontar, la rama de `IntersectionObserver` y el favicon quedan cerrados o acotados con este ticket (excepto el `favicon.ico`, ver arriba).
- **Los atributos `data-*`, los nombres accesibles y los textos fijados en la spec son contrato de las pruebas.** Cambiarlos rompe los E2E.
