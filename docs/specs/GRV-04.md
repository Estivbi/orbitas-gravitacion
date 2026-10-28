# GRV-04 · Galería, detalle y rutas

**Estado:** aprobada · **Tamaño:** L · **Rama:** `feature/galeria-y-detalle-de-orbitas` → `develop`

## Contexto

GRV-02 dejó el catálogo de las seis soluciones y el Worker que las calcula. GRV-03 dejó el sistema de diseño y `EscenaOrbita`/`VisorOrbita`, ya preparados para recibir velocidad, longitud de estela, posición y vista por props. Falta la parte B del producto: una galería de las seis soluciones, una vista de detalle de cada una con simulación animada, controles de reproducción y telemetría, una URL propia y compartible por solución, y que al volver del detalle a la galería la interfaz conserve su estado (no hace falta tras recargar). Debe funcionar en móvil y escritorio y cumplir una accesibilidad básica (teclado, foco visible, contraste, etiquetas).

Es además la primera vez que la aplicación navega entre páginas con una escena WebGL. Este ticket cierra lo que GRV-03 dejó explícitamente para aquí: la conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion` con la interfaz, la prueba de limpieza al desmontar y el favicon que devolvía 404.

Esta versión de Next (16.4) cambia APIs respecto a versiones anteriores (por ejemplo, `params` de las rutas dinámicas es una `Promise`). Los contratos que dependen de Next se han fijado leyendo `node_modules/next/dist/docs/` y se marcan en «Contratos».

## Alcance

1. **Rutas.** Galería como sección `#galeria` de `/`; detalle estático en `/orbitas/[slug]` con `generateStaticParams`, `dynamicParams = false` y `notFound()`; página 404 propia; metadatos por órbita; `sitemap`; icono de la aplicación.
2. **Galería.** Seis miniaturas SVG calculadas en el servidor, cada una un enlace al detalle; selector de orden (catálogo, periodo, energía); conservación del estado al volver.
3. **Estado de interfaz.** Almacén de Zustand en `src/store/`, con proveedor en el layout raíz, sin persistencia tras recargar.
4. **Detalle.** Titular, descripción, crédito, visor 3D grande conectado al Worker, controles de reproducción (Reproducir/Pausar, velocidad, posición, longitud de estela, restablecer vista), telemetría en vivo, enlace de vuelta y navegación a la órbita anterior y siguiente.
5. **Núcleo puro** en `src/lib/galeria/`: ordenación, formato de cifras, telemetría, mapeo de controles, navegación, metadatos, URL del sitio y datos de servidor. TypeScript puro, probado en Node.
6. **Cambios en GRV-03**, todos con valores por defecto que conservan el comportamiento de la portada: `VisorOrbita` acepta reproducción controlada y más props; `PropsEscenaOrbita` gana `vistaRestablecida`.
7. **Saldo de GRV-03.** E2E de la conexión de `posicionInicial`, `vistaInicial` y `fijarPosicion`; limpieza al desmontar tras 12 idas y vueltas; favicon; prueba de pausa por `IntersectionObserver` en una pantalla donde el visor sale de la vista.

## Fuera de alcance

Buscador de órbitas propias («crecer» de la parte B). Estado de reproducción, velocidad o vista en la URL (la URL identifica la órbita, nada más). Imágenes Open Graph. Persistencia tras recargar (ni `localStorage` ni `sessionStorage`). Una ruta índice `/orbitas`. Navegación anterior/siguiente según el orden elegido en la galería. Comparar órbitas lado a lado. Gráficas o historial de la telemetría. La ley interactiva y el tutor (GRV-05; cuando el tutor deba abrir una órbita usará `rutaDeOrbita`). Lighthouse y presupuestos de rendimiento (GRV-06). Dockerfile, despliegue y el valor real de `URL_SITIO` (GRV-07). Activar Cache Components de Next.

## Decisiones

La columna «Origen» distingue lo fijado antes de redactar la spec (**previa**) de lo que propone el arquitecto y debe aprobarse (**nueva**).

| Tema | Decisión | Razón y coste | Origen |
|---|---|---|---|
| Rutas | La galería es la sección `#galeria` de `/`. El detalle es `/orbitas/[slug]`, estático: `generateStaticParams` sobre `SLUGS`, `export const dynamicParams = false` y `notFound()` si el slug no está en el catálogo. No hay `/orbitas` | Una URL propia por órbita y seis HTML prerenderizados, sin servidor en tiempo de petición. Coste: `/orbitas` da 404. `dynamicParams` no existe con Cache Components, que por eso no se activan | previa |
| 404 | `src/app/not-found.tsx` en la raíz: la sirve `notFound()` y cualquier URL sin ruta. Va dentro del layout (cabecera y pie) y usa los tokens | Una sola página coherente con el diseño; Next añade `noindex` y devuelve estado 404. Coste: mismo mensaje genérico para dos casos | previa |
| Metadatos | `metadatosDeOrbita` (pura): `title` «Nombre · Órbitas», `description` igual a la del catálogo, `canonical` y `openGraph.url` como rutas relativas, `openGraph` sin imagen. `metadataBase` en el layout, a partir de `URL_SITIO` | Next exige `metadataBase` para URL relativas. El `title` del layout se queda como cadena, sin plantilla, porque el test de GRV-01 exige `typeof metadata.title === 'string'`. `URL_SITIO` se lee **al compilar** (las páginas son estáticas y el sitemap también), así que en Docker (GRV-07) debe pasarse como `ARG` de la etapa de build. Se valida (solo `http:` o `https:`, y sin ruta: el origen es lo único que se usa, para que `metadataBase` y el sitemap compongan igual). Coste: variable de entorno nueva; en local el canonical apunta a `http://localhost:3000` | previa (metadatos) y nueva (`URL_SITIO`) |
| Sitemap | `src/app/sitemap.ts` con `/` y las seis rutas, URL absolutas con la misma base | Quince líneas, sin dependencias. Coste: sin `lastModified` (no hay fechas fiables) | previa |
| Icono | `src/app/icon.svg`: el triángulo de la cabecera (`10,1 19,18 1,18`) con el color de `--color-electric-iris` | Cierra el 404 del favicon. Un archivo SVG no lee variables CSS, así que el color es literal (excepción documentada en `DESIGN.md` y atada al token por una prueba de repositorio). Coste: los navegadores sin soporte de icono SVG seguirán pidiendo `/favicon.ico`; **no se añade** un `favicon.ico` y queda como límite | previa |
| Miniaturas | `fichaDeOrbita(slug)` se ejecuta en el servidor al compilar: `integrarPeriodo` + `trazarMiniatura`, la misma función pura que la portada, memoizada por proceso. La galería no importa three | Cero JavaScript 3D en la galería y HTML con la figura ya dibujada. Coste: `/` integra seis órbitas y cada detalle una (12 integraciones); ADR 0002 las cifra en milisegundos cada una (ver riesgos) | previa |
| Galería | Lista de enlaces sin tarjetas, bordes, sombras ni fondos. Cada elemento: miniatura, etiqueta de la solución (ámbar, mayúsculas), nombre, periodo y energía. Titular `h2` «Seis soluciones periódicas» | DESIGN.md: los elementos flotan y solo los separa el espacio. Mostrar periodo y energía hace legible el criterio de orden. Coste: dos cifras más por elemento | previa |
| Órdenes | `catalogo` (por defecto), `periodo` (ascendente) y `energia` (ascendente: la más ligada primero) | Son los tres ejes físicos que el catálogo ya permite calcular sin el Worker. El orden alfabético no aporta (ya hay un catálogo) | previa; los tres órdenes son una propuesta |
| Estado que se conserva al volver | `ordenGaleria` y `ultimaOrbita`. La última órbita la registra **el detalle** al montarse y la **galería la consume** al montarse (siempre la olvida), pero **solo restaura** (foco en la miniatura y, si no está entera en pantalla, se centra) cuando `location.hash === '#galeria'` o cuando la llegada fue un `popstate` (botón atrás o adelante). El proveedor, que nunca se desmonta, escucha `popstate` y marca `entradaPorHistorial` en el almacén antes del render de destino; el detalle la desmarca al montarse | Registrarla en el detalle cubre el enlace «Volver», el botón del navegador, «adelante» y la entrada directa por una URL compartida. Registrarla en el clic de la miniatura no cubriría las dos últimas. La condición evita que el logotipo de la cabecera (`/`) mueva el foco o el scroll de una portada que la persona abre «de nuevo». Coste: la restauración depende del orden de efectos de Next (ver riesgos) y de dos señales de navegación | previa (estado) y nueva (mecanismo) |
| Preferencias de reproducción | `velocidad` y `longitudEstela` viven en el almacén y se comparten entre órbitas. No se guardan `reproduciendo`, la posición ni la vista | Quien compara órbitas a 0,5× no debería reelegirlo al pasar a la siguiente. Coste: estado «oculto»; se compensa con el subrayado de la velocidad activa, siempre visible | nueva |
| Reanudación por órbita | Al salir del detalle se guarda en el almacén, por órbita, la última posición (`u`) y la última vista de cámara **objetivo** (la que entrega `alCambiarVista`, no la suavizada); al volver a esa órbita en la misma sesión se pasan como `posicionInicial` y `vistaInicial`. «Restablecer vista» vuelve siempre a `VISTA_INICIAL`, gracias a la prop nueva `vistaRestablecida` | Es el camino real que conecta esas props con la interfaz y permite probarlo con un E2E (pendiente de GRV-03). Coste: una prop nueva en la escena y un campo más en el almacén. Si se descarta, caen el criterio 29 y `vistaRestablecida`, y hay que decidir otra conexión | nueva |
| Almacén | Zustand `^5.0.16`: `createStore` de `zustand/vanilla` (sin React) en `src/store/almacenInterfaz.ts`, y `ProveedorAlmacen` (componente cliente) en el layout raíz. **El almacén se crea por proveedor, nunca como instancia de módulo**: `useState(() => crearAlmacenInterfaz())` en el proveedor | En el servidor el módulo es compartido entre peticiones: una instancia global filtraría estado de una a otra. El proveedor del layout no se desmonta en la navegación cliente, así que el estado sobrevive. Coste: un contexto y un hook propios | previa (Zustand en el layout) y nueva (patrón) |
| Hidratación | El estado inicial (`ordenGaleria: 'catalogo'`, `ultimaOrbita: null`) es una constante idéntica en el servidor y en la primera pintura del cliente. El orden restaurado solo aparece en navegaciones cliente, que no hidratan: la isla de la galería lee el almacén al renderizar, no en un efecto | Sin desajuste de hidratación y sin parpadeo del orden por defecto al volver. Coste: ninguno; la alternativa (aplicar el orden en un efecto) mostraría un fotograma con el orden equivocado | previa |
| Reproducción en el detalle | El estado de reproducción se eleva a `DetalleOrbita` con un hook `useReproduccion` (que conserva la lógica de movimiento reducido de GRV-03). `VisorOrbita` admite reproducción controlada. **El botón violeta se reubica**: pasa de `VisorOrbita` a `ControlesReproduccion`, con `controlAnimacion={false}` en el detalle | Hace falta elevar el estado de todos modos (el deslizador de posición pausa), y así los controles están juntos. Coste: la portada sigue usando el botón interno; el texto del botón se comparte en un componente | nueva |
| Visor y cámara | `tamano="grande"` (nueva prop) y `giroAutomatico={false}` en el detalle | El detalle es un instrumento: la cámara solo se mueve cuando la persona la mueve, y «Restablecer vista» tiene sentido. Coste: menos vida sin tocar nada; el movimiento reducido ya la exigía | nueva |
| Velocidades | `0,25×`, `0,5×`, `1×`, `2×`, `4×`; por defecto `1×`. Grupo de radios con aspecto de texto, subrayado ámbar en la activa | Cinco valores cubren estudiar un encuentro cercano (0,25×) y recorrer la órbita larga (4×). Los radios dan una sola parada de tabulación y flechas nativas | previa (texto con subrayado) y nueva (conjunto) |
| Deslizador de posición | `input[type=range]` de 0 a 0,999 con paso 0,001 (fracción del periodo). **Cualquier cambio hecho por la persona pausa la reproducción** y fija la posición con `fijarPosicion`. **No es un control de React**: su `value` y su `aria-valuetext` solo se escriben de forma imperativa (`mostrarPosicion`), y con el deslizador enfocado y la escena en marcha no se escriben ni uno ni otro (el texto visible, `aria-hidden`, sí se actualiza) | Arrastrar con la animación en marcha pelea con el pulgar; pausar evita ese salto, y no escribir en un control enfocado evita que un lector de pantalla anuncie cada cambio. Coste: reanudar exige pulsar el botón; con el foco puesto, el pulgar queda quieto mientras la órbita avanza. Paso fino de 0,1 % del periodo para estudiar los encuentros | nueva |
| Estela y vista | Deslizador de 0,05 a 1 con paso 0,05 (por defecto 0,5) y botón fantasma «Restablecer vista» | Mismo rango que acepta la escena | previa |
| Telemetría: contenido | Cinco columnas: tiempo `t` con barra de fase, energía `E`, momento lineal `|P|`, distancia mínima y velocidad máxima. Las cifras en vivo se calculan con `metricas` sobre el estado que entrega `alFotograma`. **Distancia mínima y velocidad máxima en vivo son instantáneas** (el par más cercano y el cuerpo más rápido ahora), y debajo de cada una, en gris, el extremo del periodo que ya trae la `Trayectoria` | Lo instantáneo es lo que se mueve y enseña los encuentros; el extremo del periodo da el contexto. Coste: dos cifras por columna | previa (columnas) y nueva (instantáneas + extremo) |
| Telemetría: ritmo y formato | Escritura en el DOM como mucho cada 100 ms (≈10 Hz) mientras se reproduce; en pausa se escribe al instante, pero solo si `u` cambió desde la última escritura (no en cada repintado, p. ej. al redimensionar). Sin re-render de React. Coma decimal, signo menos U+2212, `t` con 2 decimales y el resto con 3 | El refresco rápido no aporta y cuesta; en pausa hay que reflejar siempre el último valor sin contar escrituras vacías. Medido con `estadoEn` y 20 000 muestras: \|E(u) − E(0)\| ≤ 1,68e-7 y momento ≤ 4,2e-14 en las seis órbitas, y el texto de la energía con 3 decimales no cambia en ninguna | previa (≈10 Hz) y nueva (formato) |
| Controles y telemetría en pantalla | Los controles se renderizan desde el primer HTML, pero `invisible` e `inert` mientras la escena no está `lista` (y `hidden` si pasa a `sin-webgl` o `error`). Por debajo de 900 px la telemetría se coloca visualmente justo bajo el visor con `order` de CSS (no tiene elementos enfocables, así que el orden de tabulación no cambia) | Reservan su altura sin fijar una por punto de corte, y sus refs existen desde el primer fotograma (que llega antes de `alListo`). En móvil, lienzo y cifras se ven a la vez al desplazarse hasta la telemetría. Coste: HTML con controles que no sirven sin JavaScript (no se ven ni se enfocan) | nueva |
| Telemetría accesible | Las cifras en vivo llevan `aria-hidden="true"`; cada columna tiene etiqueta (`dt`) y un texto estático legible con el valor inicial o el extremo del periodo. Ninguna región `aria-live`, ni `<output>` (su rol implícito es `status`), ni `role="timer"` | Los lectores de pantalla no anuncian cada cambio y aun así reciben la información que importa: cuáles son las magnitudes y sus valores característicos. Coste: quien usa lector no oye el valor «ahora» | previa (región) y nueva (elección) |
| Contenido y navegación | `Volver a la galería` (`/#galeria`), `h1` con el nombre, descripción, crédito, periodo y, al final, `Anterior: X` y `Siguiente: Y` en orden de catálogo, de forma cíclica | Estático y predecible (el HTML del detalle no depende de estado de cliente). Coste: no sigue el orden elegido en la galería | previa |
| Movimiento reducido | Sin cambios respecto a GRV-03: el detalle empieza pausado y la galería no tiene animación (`getAnimations()` vacío) | Cumple DESIGN.md sin trabajo extra | previa |
| Rendimiento | La galería no importa three. El JS inicial de `/` crece menos de **8 KB gzip** respecto a la línea base (medida sobre `develop`: 8 scripts, 585 893 B sin comprimir y 181 502 B gzip -9). El HTML de `/` no supera 200 000 B sin comprimir y el de cada detalle 80 000 B | Un prototipo mínimo (Zustand, proveedor, selector, isla y `orden.ts`) midió +1 330 B gzip, así que 8 KB dan margen de sobra. El HTML de `/` pasa de 21 330 B (gzip 5 378) a unos 133 000 B (gzip 34 081) por las seis miniaturas, que viajan dos veces (HTML y datos de Next) y la de la figura de ocho cuatro (hero y galería); los detalles miden 24–34 KB. Los topes detectan errores gruesos (serializar una `Trayectoria`), no regresiones finas | previa (principio) y nueva (cifras) |
| Dónde viven las funciones puras | `src/lib/galeria/`, propiedad de `frontend` (los cambios de `AGENTS.md` se aplican en el paso 1 del orden de trabajo, antes de los tests). El código de cliente (`src/components/{galeria,detalle,comunes}/`, `src/store/` y `orden.ts`, `formato.ts`, `controles.ts`, `navegacion.ts`, `telemetria.ts`) no importa valores del barril `@/lib/fisica`: lo impide una regla de ESLint (`paths` con `allowTypeImports`) | `backend` no tiene que tocar la física. El barril no arrastra el integrador (Turbopack lo descarta) pero sí el catálogo: el prototipo midió +999 B gzip más en el JS inicial si la isla importaba `SLUGS` del barril. Los archivos importan `@/lib/fisica/tipos` y `@/lib/fisica/metricas` | previa (carpeta) y nueva (regla de importación) |
| Pruebas | Vitest para lo puro y el almacén; Playwright para lo visible, en pocos archivos con un solo `goto` por estado; ayudas nuevas en `tests/e2e/ayudas.ts` | Es el reparto de GRV-03. Coste: WebGL por software es lento; la prueba de 12 vueltas fija su propio `timeout` | previa |

## Contratos

### Lo que depende de Next

Se ha leído la documentación incluida en `node_modules/next/dist/docs/01-app/` (rutas relativas a esa carpeta). Todo lo que no figura aquí lo fija esta spec.

| Contrato | Fuente |
|---|---|
| `page` y `generateMetadata` reciben `params: Promise<{ slug: string }>` y se leen con `await` | `03-api-reference/03-file-conventions/page.md` |
| `generateStaticParams` devuelve un array de `{ slug }`; con `dynamicParams = false` el resto de slugs da 404 | `03-api-reference/04-functions/generate-static-params.md`, `…/02-route-segment-config/dynamicParams.md` |
| `dynamicParams` no está disponible con Cache Components: no se activan | `dynamicParams.md` |
| `notFound()` lanza, devuelve 404 antes de empezar el streaming e inyecta `noindex`; el `not-found.tsx` de la raíz atiende también las URL sin ruta y puede exportar `metadata` | `04-functions/not-found.md`, `03-file-conventions/not-found.md` |
| Una URL relativa en `alternates.canonical` u `openGraph.url` exige `metadataBase`; un `metadata` y un `generateMetadata` no pueden convivir en el mismo segmento | `04-functions/generate-metadata.md` |
| `app/icon.svg` genera `<link rel="icon" … sizes="any">` | `03-file-conventions/01-metadata/app-icons.md` |
| `app/sitemap.ts` exporta por defecto una función que devuelve entradas con `url` absoluta | `03-file-conventions/01-metadata/sitemap.md` |
| `Link` conserva la posición de scroll salvo que la página no esté visible, y con un hash (`/#galeria`) desplaza al elemento | `03-api-reference/02-components/link.md` |
| El helper global `PageProps` solo existe tras generar tipos (`next dev`, `next build` o `next typegen`). **No se usa**: `npm run typecheck` corre en CI sin haber compilado | `page.md` |
| `.next/prerender-manifest.json` (versión 4) lista las rutas prerenderizadas con `initialRevalidateSeconds` y `htmlSize` | forma observada en el build local; si cambia en una versión futura, se corrige el test del criterio 11 |
| `VERCEL_PROJECT_PRODUCTION_URL` (host sin esquema) existe en Vercel como variable de sistema | documentación de Vercel; no verificado aquí. Si no existe, basta `URL_SITIO` |

### Rutas y archivos de `src/app/`

```ts
// src/app/orbitas/[slug]/page.tsx
export const dynamicParams = false; // literal: Next lo analiza estáticamente
export function generateStaticParams(): { slug: Slug }[]; // SLUGS, en orden
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata>; // await params; obtenerOrbita; notFound(); metadatosDeOrbita
export default async function PaginaOrbita({ params }: Props): Promise<ReactElement>;
//   await params; const orbita = obtenerOrbita(slug) ?? notFound(); fichaDeOrbita(orbita.slug) (el slug de la ruta es string,
//   el de la órbita es Slug); renderiza <DetalleOrbita key={orbita.slug} … />

// src/app/layout.tsx: añade metadataBase: resolverUrlSitio(process.env); el title sigue siendo una cadena;
//   <main> envuelve {children} en <ProveedorAlmacen>.
// src/app/page.tsx: la portada añade <Galeria /> bajo el hero y reutiliza fichaDeOrbita('figura-de-ocho').miniatura.
// src/app/not-found.tsx: server component; exporta metadata { title: 'Página no encontrada · Órbitas' };
//   etiqueta ámbar «Error 404», h1 «Aquí no hay ninguna órbita.», enlace «Volver a la galería» (/#galeria).
// src/app/sitemap.ts: export default function sitemap(): MetadataRoute.Sitemap → entradasSitemap(resolverUrlSitio(process.env)).
// src/app/icon.svg: <polygon points="10,1 19,18 1,18"> con fill igual a --color-electric-iris; viewBox "0 0 20 19".
```

### Núcleo puro: `src/lib/galeria/`

Sin React, DOM, Next ni zustand. El código que llegue al cliente (`orden.ts`, `formato.ts`, `controles.ts`, `navegacion.ts`, `telemetria.ts`) importa de la física solo tipos y los archivos `@/lib/fisica/tipos` y `@/lib/fisica/metricas`, nunca valores del barril `@/lib/fisica` (regla de ESLint, ver «Reglas de ESLint»). `fichas.ts`, `sitio.ts` y `metadatos.ts` solo se usan desde el servidor.

```ts
// orden.ts
export const ORDENES = [
  { id: 'catalogo', etiqueta: 'Catálogo' },
  { id: 'periodo', etiqueta: 'Periodo' },
  { id: 'energia', etiqueta: 'Energía' },
] as const;
export type OrdenGaleria = (typeof ORDENES)[number]['id'];
export const ORDEN_INICIAL: OrdenGaleria; // 'catalogo'
export function esOrden(valor: unknown): valor is OrdenGaleria;
export interface ClaveDeOrden { slug: Slug; periodo: number; energia: number }
export interface ResumenOrbita extends ClaveDeOrden { nombre: string }
// Devuelve un array nuevo; no muta la entrada (que puede estar congelada). catalogo: orden de SLUGS, sea cual sea
// el orden de entrada. periodo y energia: ascendente; los empates se resuelven por el índice en SLUGS.
export function ordenarGaleria<T extends ClaveDeOrden>(orden: OrdenGaleria, items: readonly T[]): T[];
export function avisoDeOrden(orden: OrdenGaleria): string; // «Galería ordenada por periodo.» (etiqueta en minúsculas)
```

```ts
// navegacion.ts
export const RUTA_GALERIA = '/#galeria';
export function rutaDeOrbita(slug: Slug): string; // '/orbitas/figura-de-ocho'
export function vecinas(slug: Slug): { anterior: Slug; siguiente: Slug }; // orden de SLUGS, cíclico
export const ETIQUETA_SOLUCION: Readonly<Record<Slug, string>>;
// lagrange «Solución exacta»; figura-de-ocho «Estable»; butterfly-i, goggles, moth-i y yin-yang-i «Hallada en 2013»
```

```ts
// formato.ts. Coma decimal, sin separador de miles. El signo menos es U+2212. Un valor que redondea a cero no lleva signo.
export function formatearCifra(valor: number, decimales: number): string; // no finito → '—'
// Truncan (nunca llegan al valor final) con tolerancia 1e-9, para que 0,29 no se trunque a 0,28:
// formatearPorcentaje usa Math.min(Math.floor(u · 1000 + 1e-9), 999) / 10, para que 1 − 1e-12 no llegue a «100,0 %».
export function formatearPorcentaje(u: number): string; // un decimal, espacio duro U+00A0 antes de «%»: 0,3744 → '37,4 %'
export function formatearTiempo(tiempo: number): string; // dos decimales: 3,16295699 → '3,16'; 6,32585 → '6,32'
export function textoPosicion(u: number, periodo: number): string; // '50,0 % del periodo (t = 3,16 de 6,33)'; el «50,0 %» es
                                                                    // formatearPorcentaje(u), con U+00A0 antes de «%»
export function textoEstela(longitud: number): string; // Math.round(longitud · 100): '50 % del periodo', con espacio normal
// (U+0020) antes de «%». Solo formatearPorcentaje, formatearLectura().fase y, por componerlo, textoPosicion exigen U+00A0.
export function textoVelocidad(velocidad: Velocidad): string; // '0,25×', '0,5×', '1×', '2×', '4×' (× es U+00D7)
```

```ts
// controles.ts
export const VELOCIDADES = [0.25, 0.5, 1, 2, 4] as const;
export type Velocidad = (typeof VELOCIDADES)[number];
export const VELOCIDAD_INICIAL: Velocidad; // 1
export function esVelocidad(valor: unknown): valor is Velocidad;
export const LONGITUD_ESTELA = { minima: 0.05, maxima: 1, paso: 0.05, inicial: 0.5 } as const;
export const POSICION = { minima: 0, maxima: 0.999, paso: 0.001 } as const; // atributos del deslizador
export function valorDeDeslizador(u: number): number; // u envuelta → min(0,999, round(u · 1000) / 1000)
export function posicionDeDeslizador(valor: number): number; // limita a [0, 0,999]; no finito → 0
```

```ts
// telemetria.ts (importa `metricas` de '@/lib/fisica/metricas', no del barril)
// `estado` es el Float64Array que entrega alFotograma. Con un estado inicial del catálogo (readonly number[]) hay que
// convertirlo antes: Float64Array.from(orbita.estadoInicial); `energia` y `metricas` esperan un Float64Array.
export interface LecturaTelemetria {
  tiempo: number; fase: number; // u · periodo, y u en [0, 1)
  energia: number; momentoLineal: number; // metricas(estado)
  distanciaMinima: number; velocidadMaxima: number; // instantáneas (metricas)
}
export function leerTelemetria(estado: Readonly<Estado>, u: number, periodo: number): LecturaTelemetria;
export interface TextosTelemetria {
  tiempo: string; fase: string; energia: string; momento: string; distanciaMinima: string; velocidadMaxima: string;
}
export function formatearLectura(l: LecturaTelemetria): TextosTelemetria;
// tiempo: formatearTiempo; fase: formatearPorcentaje; energia, momento, distanciaMinima, velocidadMaxima: formatearCifra(·, 3)
export const INTERVALO_TELEMETRIA_MS = 100;
// En pausa siempre true; reproduciendo: true si ahora − ultima ≥ intervalo (el límite es inclusivo).
export function debeActualizar(ahoraMs: number, ultimaMs: number, reproduciendo: boolean, intervaloMs?: number): boolean;
```

```ts
// fichas.ts (solo servidor)
export interface FichaOrbita {
  orbita: Orbita; miniatura: TrazadoMiniatura;
  energiaInicial: number; distanciaMinima: number; velocidadMaxima: number; // los dos últimos, de la Trayectoria (extremos del periodo)
  lecturaInicial: LecturaTelemetria; // en u = 0
}
export function resumirCatalogo(): readonly ResumenOrbita[]; // seis, en orden de SLUGS; energia = energia(estadoInicial)
export function fichaDeOrbita(slug: Slug): FichaOrbita; // memoizada por proceso: dos llamadas devuelven la misma referencia
```

```ts
// sitio.ts
export const URL_SITIO_POR_DEFECTO = 'http://localhost:3000';
// Prioridad: URL_SITIO; después VERCEL_PROJECT_PRODUCTION_URL (host sin esquema → https://host); después el valor por defecto.
// Una cadena vacía cuenta como ausente. Lanzan un Error que nombra la variable: una URL_SITIO que no es una URL, que no
// es http: ni https:, o que lleva ruta (distinta de «/»). Devuelve solo el origen. Acepta process.env tal cual.
// Se evalúa al compilar (layout y sitemap).
export function resolverUrlSitio(entorno: Readonly<Record<string, string | undefined>>): URL;
export function entradasSitemap(base: URL): { url: string }[]; // base y las seis rutas, URL absolutas, orden de SLUGS

// metadatos.ts. Estructuralmente compatible con `Metadata` de Next, sin importarlo.
export interface MetadatosOrbita {
  title: string; description: string;
  alternates: { canonical: string };
  openGraph: { title: string; description: string; url: string; siteName: string; locale: string; type: 'website' };
}
export function metadatosDeOrbita(orbita: Pick<Orbita, 'slug' | 'nombre' | 'descripcion'>): MetadatosOrbita;
// title y openGraph.title: «Goggles · Órbitas»; description: la del catálogo; canonical y openGraph.url: '/orbitas/goggles';
// siteName 'Órbitas'; locale 'es_ES'; type 'website'.
```

### Almacén: `src/store/`

Patrón de Zustand 5 (`"zustand": "^5.0.16"` en `dependencies`) con App Router: **un almacén por proveedor** (`createStore` + contexto, nunca una instancia de módulo, que el servidor compartiría entre peticiones), `useStore` para suscribirse y `getInitialState` como instantánea del servidor. En la v5, un selector que devuelve un objeto o un array nuevo en cada llamada provoca un bucle infinito: **los selectores devuelven primitivos** (o usan `useShallow` de `zustand/shallow`). Cada acción escribe una guarda: si el valor no cambia, no llama a `set`, de modo que no se notifica a los suscriptores.

```ts
// src/store/almacenInterfaz.ts. TypeScript puro: importa `zustand/vanilla` y tipos/funciones de src/lib; no importa React.
export interface PuntoDeReanudacion { posicion: number; vista: VistaCamara } // posicion en [0, 1)
export interface EstadoInterfaz {
  ordenGaleria: OrdenGaleria;   // 'catalogo'
  ultimaOrbita: Slug | null;    // null
  velocidad: Velocidad;         // 1
  longitudEstela: number;       // 0,5
  reanudacion: Readonly<Partial<Record<Slug, PuntoDeReanudacion>>>; // {}
  entradaPorHistorial: boolean; // false; la marca el proveedor al recibir un popstate
}
export interface AccionesInterfaz {
  elegirOrden(orden: OrdenGaleria): void;           // valor desconocido o igual al actual: no hace nada ni notifica
  recordarOrbita(slug: Slug): void;
  olvidarOrbita(): void;                            // ultimaOrbita = null
  fijarVelocidad(velocidad: number): void;          // fuera de VELOCIDADES: se ignora
  fijarLongitudEstela(longitud: number): void;      // limita a [0,05, 1]; no finito: se ignora
  guardarReanudacion(slug: Slug, punto: PuntoDeReanudacion): void; // envuelve posicion; copia la vista; se ignora (sin
                                                    // tocar el estado ni notificar) si la posición o cualquier número de la vista no es finito
  marcarEntradaPorHistorial(valor: boolean): void;  // igual al actual: no hace nada ni notifica
}
export type AlmacenInterfaz = StoreApi<EstadoInterfaz & AccionesInterfaz>;
export const ESTADO_INICIAL: Readonly<EstadoInterfaz>; // congelado, también su `reanudacion`
export function crearAlmacenInterfaz(inicial?: Partial<EstadoInterfaz>): AlmacenInterfaz; // cada llamada, una instancia nueva
export const selectores: { ordenGaleria; ultimaOrbita; velocidad; longitudEstela; reanudacion; entradaPorHistorial }; // (estado) => valor

// src/store/ProveedorAlmacen.tsx ('use client')
// useState(() => crearAlmacenInterfaz()); en un efecto de montaje escucha `popstate` y llama a marcarEntradaPorHistorial(true)
export function ProveedorAlmacen({ children }: { children: ReactNode }): ReactElement;
export function useAlmacen<T>(selector: (estado: EstadoInterfaz & AccionesInterfaz) => T): T; // lanza fuera del proveedor
export function useAlmacenApi(): AlmacenInterfaz; // lectura puntual (getState) en efectos y manejadores, sin suscripción
```

### Componentes

```ts
// Nuevos. 'S' = servidor, 'C' = cliente.
// src/components/comunes/SelectorTexto.tsx (C): grupo de radios con aspecto de texto, subrayado ámbar en la activa.
// Cada opción es un <input type="radio"> con un <label> asociado (input.labels[0]), que es su etiqueta visible. El subrayado
// (text-decoration-line: underline, color --color-saffron-spark), el contorno de foco y el área mínima de 44 × 44 px se aplican
// a esa etiqueta o a un descendiente visible suyo, nunca al input, que puede estar oculto.
interface PropsSelectorTexto<T extends string | number> {
  etiqueta: string;                     // texto visible (ámbar, mayúsculas por CSS) que nombra el role="radiogroup" con
                                        // aria-labelledby: nombre accesible = texto visible (WCAG 2.5.3). «Velocidad de reproducción», «Ordenar por»
  nombre: string;                       // atributo name de los radios (único)
  opciones: readonly { valor: T; texto: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
}
// src/components/galeria/Galeria.tsx (S): <section id="galeria" aria-labelledby>, h2, y <GaleriaOrdenable>.
// src/components/galeria/ElementoGaleria.tsx (S): <li> con el <Link href={rutaDeOrbita(slug)} data-orbita={slug}> y la miniatura.
// src/components/galeria/GaleriaOrdenable.tsx (C):
interface PropsGaleriaOrdenable {
  resumenes: readonly ResumenOrbita[];
  elementos: Readonly<Record<Slug, ReactNode>>; // un <li> por órbita, ya renderizado en el servidor
}
// src/components/detalle/DetalleOrbita.tsx (C): visor + controles + telemetría
interface PropsDetalleOrbita {
  slug: Slug; nombre: string; miniatura: TrazadoMiniatura;
  periodo: number; energiaInicial: number; distanciaMinima: number; velocidadMaxima: number;
  lecturaInicial: LecturaTelemetria;
}
// src/components/detalle/ControlesReproduccion.tsx (C)
// Escribe de forma imperativa el texto visible (siempre) y el value y el aria-valuetext del deslizador (salvo que tenga el
// foco y la escena esté en marcha). El deslizador de posición no es controlado por React.
export interface ApiControles { mostrarPosicion(u: number): void }
interface PropsControlesReproduccion {
  ref?: Ref<ApiControles>;
  posicionInicial: number; // valor y aria-valuetext con los que nace el deslizador (reanudación, o la última u conocida)
  periodo: number; reproduciendo: boolean;
  alAlternar(): void; alPausar(): void;
  velocidad: Velocidad; alCambiarVelocidad(v: Velocidad): void;
  longitudEstela: number; alCambiarLongitudEstela(l: number): void;
  alFijarPosicion(u: number): void; // → api.fijarPosicion
  alRestablecerVista(): void;       // → api.restablecerVista
}
// src/components/detalle/Telemetria.tsx (C)
export interface ApiTelemetria { escribir(u: number, estado: Readonly<Estado>): void } // sin limitar el ritmo
interface PropsTelemetria {
  ref?: Ref<ApiTelemetria>;
  periodo: number; energiaInicial: number; distanciaMinima: number; velocidadMaxima: number;
  lecturaInicial: LecturaTelemetria; // pinta el HTML del servidor; el fallo de WebGL deja estos valores
}
// src/components/detalle/NavegacionOrbitas.tsx (S): <nav aria-label="Entre órbitas"> con «Anterior: X» y «Siguiente: Y».
// src/components/escena/useReproduccion.ts (C): { reproduciendo, alternar(), fijar(valor: boolean) } con la lógica de GRV-03
//   (movimiento reducido ⇒ empieza pausado). VisorOrbita lo usa en modo no controlado; DetalleOrbita en el detalle.
```

`ControlesReproduccion` y `Telemetria` están montados desde el primer HTML (los controles, ocultos e inertes hasta `lista`), de modo que sus refs existen cuando llega el primer fotograma, que `montarEscena` entrega antes de `alListo`. `DetalleOrbita` decide el ritmo una sola vez por fotograma (`debeActualizar`; en pausa, solo si `u` cambió desde la última escritura) y entonces llama a `telemetria.escribir` y a `controles.mostrarPosicion`. Guarda `u` y la vista objetivo (`alCambiarVista`) en refs durante la sesión del visor; al desmontarse llama a `guardarReanudacion` (solo si llegó a dibujar un fotograma) y al montarse a `recordarOrbita(slug)` y `marcarEntradaPorHistorial(false)`. Lee `reanudacion[slug]` con `useAlmacenApi().getState()` al montar (no se suscribe), y `velocidad` y `longitudEstela` con `useAlmacen`.

```ts
// Cambios en GRV-03. Todo opcional; sin ellos, el comportamiento es el de la portada.
// src/components/escena/tipos.ts: PropsEscenaOrbita gana
  vistaRestablecida?: VistaCamara; // destino de 'restablecer' (Home y restablecerVista); por defecto, vistaInicial ?? VISTA_INICIAL
// src/components/escena/simulacion.ts: 'restablecer' usa vistaRestablecida; el estado inicial sigue usando vistaInicial.
// src/components/escena/VisorOrbita.tsx
export type EstadoEscena = 'cargando' | 'lista' | 'sin-webgl' | 'error'; // ahora exportado
interface PropsVisorOrbita {
  slug: Slug; miniatura: TrazadoMiniatura; titulo: string;
  controlAnimacion?: boolean;   // true; false en el detalle
  giroAutomatico?: boolean;     // true; false en el detalle
  tamano?: 'compacto' | 'grande'; // 'compacto' (portada)
  reproduciendo?: boolean; alAlternarReproduccion?: () => void; // controlado si se pasan; si no, estado propio
  velocidad?: number; longitudEstela?: number;
  posicionInicial?: number; vistaInicial?: VistaCamara; vistaRestablecida?: VistaCamara;
  alCambiarEstado?: (estado: EstadoEscena) => void;
  alListo?: (api: ApiEscena) => void;                       // además de pasar a 'lista'
  alFotograma?: (u: number, estado: Readonly<Estado>) => void; // en cada fotograma, antes del filtro de 100 ms de data-*
  alCambiarVista?: (vista: Readonly<VistaCamara>) => void;     // además de escribir data-vista
}
```

### Atributos, ids y roles (parte del contrato de las pruebas)

Se conservan los de GRV-03 en el contenedor del visor (`data-estado-escena`, `data-reproduciendo`, `data-vista`, `data-posicion`, `data-fotogramas`). El texto del botón sigue siendo «Pausar animación» o «Reproducir animación», y ningún otro botón contiene «animación» en su nombre.

| Elemento | Contrato |
|---|---|
| Raíz de `DetalleOrbita` | `data-detalle="<slug>"`, `data-velocidad="<número>"`, `data-longitud-estela="<número>"` |
| Región de controles | Contenedor `data-region="controles"` (`role="group"` «Controles de reproducción») presente desde el HTML del servidor. Mientras la escena no está `lista` es `invisible` e `inert` (ni visible ni enfocable, y fuera del árbol de accesibilidad); en `sin-webgl` y `error` pasa a `hidden` (`display: none`) |
| Botón violeta | El único botón relleno de la vista. Primero entre los controles |
| Velocidad | `role="radiogroup"` «Velocidad de reproducción»; cinco `radio` llamados «0,25×», «0,5×», «1×», «2×» y «4×». Cada opción es un `<input type="radio">` con un `<label>` asociado (`input.labels[0]`), que es su etiqueta visible. El subrayado (`text-decoration-line: underline`, color `--color-saffron-spark`), el contorno de foco y el área mínima de 44 × 44 px se aplican a esa etiqueta o a un descendiente visible suyo, nunca al `input`, que puede estar oculto. Lo mismo vale para «Ordenar por» |
| Posición | `input[type=range]` llamado «Posición en el periodo», `min=0`, `max=0.999`, `step=0.001`, con `aria-valuetext` = `textoPosicion(u, periodo)`; no controlado por React (solo escritura imperativa) |
| Estela | `input[type=range]` llamado «Longitud de la estela», `min=0.05`, `max=1`, `step=0.05`, con `aria-valuetext` = `textoEstela(l)` |
| Vista | Botón fantasma «Restablecer vista» |
| Deslizadores | `accent-color` = `--color-electric-iris`; etiqueta ámbar visible y valor visible encima (un `span` con `aria-hidden`, nunca `<output>`) |
| Telemetría | `<section data-region="telemetria" aria-label="Telemetría" data-actualizaciones="<n>">` con un `<dl>`. Columnas `data-columna="tiempo"`, `"energia"`, `"momento"`, `"distancia-minima"`, `"velocidad-maxima"`. Etiquetas (`dt`): «Tiempo», «Energía E», «Momento lineal \|P\|», «Distancia mínima», «Velocidad máxima» |
| Cifras en vivo | `<span data-cifra="tiempo\|energia\|momento\|distancia-minima\|velocidad-maxima" aria-hidden="true">` con el texto de `formatearLectura`. La barra de fase es `data-cifra="fase"` (`aria-hidden`) con `data-valor` = fase con 3 decimales truncados. **La columna `tiempo` muestra, como texto visible con `aria-hidden`, el porcentaje de fase de `formatearLectura(…).fase` (p. ej. «50,0 %», con U+00A0 antes de «%») junto a la barra `data-cifra="fase"`**, dentro de `[data-columna="tiempo"]` y escrito en la misma pasada que el resto de cifras (cuenta como una sola escritura de `data-actualizaciones`). `data-actualizaciones` cuenta las escrituras en el DOM |
| Crédito | El crédito del catálogo va en un elemento propio, con el texto exacto del catálogo; puede ir precedido de una etiqueta («Crédito:») que no forma parte de ese elemento. Una prueba lo localiza por su texto exacto, no por una frase que lo contenga |
| Textos estáticos | `<span data-resumen="periodo\|energia\|momento\|distancia-minima\|velocidad-maxima">` con solo el número formateado, dentro de una frase visible: «Periodo 6,33», «Se conserva: −1,287», «Se conserva: 0,000», «Mínima del periodo: 0,011», «Máxima del periodo: 9,550» (ejemplos con tres decimales; el valor lo da la ficha) |
| Enlaces | «Volver a la galería» (`href="/#galeria"`), «Anterior: Yin-Yang I» y «Siguiente: Figura de ocho» (nombres exactos para la órbita de que se trate); el orden del DOM es: Volver, `h1`, descripción y crédito, visor, controles, telemetría, anterior y siguiente |
| Galería | `<section id="galeria">`; `h2` «Seis soluciones periódicas»; `role="radiogroup"` «Ordenar por» (texto visible = nombre accesible) con radios «Catálogo», «Periodo» y «Energía»; `role="status"` visualmente oculto con `avisoDeOrden`, vacío hasta que la persona elige un orden; cada enlace lleva `data-orbita="<slug>"` y su texto incluye `Periodo 8,27` y `Energía −0,866` (formato de `formatearCifra`) |
| 404 | `h1` «Aquí no hay ninguna órbita.»; enlace «Volver a la galería» |
| Una sola vez | Un `h1` por página; un solo `[data-estado-escena]` en `/` (el de la portada) y uno en cada detalle |

### Reglas de ESLint (las implementa `devops`)

En `eslint.config.mjs` gana el **último** bloque que coincide con un archivo y sustituye por completo `no-restricted-imports`, así que cada bloque repite los patrones que le corresponden. Tres bloques combinados sustituyen al actual de three:

1. `src/**` y `tests/**`, salvo `src/components/escena/**` y `src/store/**`: patrones `^three(/|$)` y `^zustand(/|$)`, y los dos selectores `ImportExpression` (`import('three')` e `import('zustand')`).
2. `src/components/escena/**`: solo zustand (three está permitido), patrón e `ImportExpression`.
3. `src/store/**`: solo three (zustand está permitido), patrón e `ImportExpression`.

Además, un bloque posterior para el código de cliente que no debe importar valores del barril: `src/components/{galeria,detalle,comunes}/**`, `src/store/**` y `src/lib/galeria/{orden,formato,controles,navegacion,telemetria}.ts` llevan `paths: [{ name: '@/lib/fisica', allowTypeImports: true }]` **y repiten los patrones de su bloque** (los de 1 para los componentes, los de 3 para el almacén y los de la regla de `src/lib/**` para los archivos de `src/lib/galeria/`). El criterio 10 comprueba el comportamiento con la API de ESLint (`lintText`).

### Propuesta de cambios en `AGENTS.md` (los aplica el arquitecto en el paso 2 del orden de trabajo, antes de los tests)

- Tabla de agentes, `frontend`: «`src/app/` (salvo `api/`), `src/components/`, `src/lib/escena/`, `src/lib/galeria/`, `src/store/`, `tests/e2e/`». `backend`: «`src/lib/` (salvo `escena/` y `galeria/`), …».
- Estructura: `src/lib/` pasa a «lógica de dominio sin React (fisica/, escena/, galeria/, tutor/)».
- Arquitectura: «`zustand` solo se importa desde `src/store/`; `src/store/` puede importar `src/lib/`, nunca al revés. El almacén se crea en un proveedor, no como instancia de módulo.»
- Particularidades: «Las rutas de detalle son estáticas (`generateStaticParams`). `URL_SITIO` define la base de las URL absolutas y se lee al compilar.»

En el mismo paso 2, `DESIGN.md` añade: el selector de texto (grupo de radios con subrayado ámbar y foco sobre la etiqueta), la telemetría del detalle (columnas, cifras en vivo con `aria-hidden` y texto estático), la navegación entre órbitas, la altura mínima de 44 px de los deslizadores y la excepción de color de `src/app/icon.svg` (literal, atado a `--color-electric-iris`). `frontend` los lee antes de tocar la interfaz.

## Criterios de aceptación

Las pruebas puras van en `tests/unit/galeria/`, `tests/unit/store/` y `tests/repo/`; las de navegador, en `tests/e2e/`, agrupadas en pocos archivos (propuesta: `rutas.spec.ts`, `galeria.spec.ts`, `detalle.spec.ts`, `detalle-alternativas.spec.ts`) con un solo `goto` por estado y esperas con sondeo, como en GRV-03. Las cifras esperadas se calculan en Node con la librería salvo donde se dan valores concretos. Las ayudas nuevas (contar contextos WebGL, comparar el orden de los enlaces, gzip de los scripts) amplían `tests/e2e/ayudas.ts`.

**Núcleo puro y almacén**

1. **Orden de la galería.** Dado el resumen de las seis órbitas (energía calculada con `energia(estadoInicial)`), cuando se ordena, entonces `catalogo` da `lagrange, figura-de-ocho, butterfly-i, goggles, moth-i, yin-yang-i` aunque la entrada llegue barajada; `periodo` da `butterfly-i, figura-de-ocho, lagrange, goggles, moth-i, yin-yang-i`; `energia` da `goggles, butterfly-i, yin-yang-i, moth-i, figura-de-ocho, lagrange`; con dos elementos de igual periodo, el que va antes en `SLUGS` sale antes aunque entren al revés; la entrada, congelada con `Object.freeze`, no se muta ni cambia de orden y el resultado es un array distinto; y `ORDENES` tiene exactamente los ids `catalogo`, `periodo`, `energia` con las etiquetas «Catálogo», «Periodo», «Energía». `avisoDeOrden('energia')` vale «Galería ordenada por energía.» y `esOrden('precio')` es falso. *(Vitest)*
2. **Navegación y etiquetas.** Dadas las seis órbitas, cuando se piden sus vecinas, entonces `vecinas('lagrange')` es `{ anterior: 'yin-yang-i', siguiente: 'figura-de-ocho' }`, `vecinas('yin-yang-i')` es `{ anterior: 'moth-i', siguiente: 'lagrange' }`, `vecinas('goggles')` es `{ anterior: 'butterfly-i', siguiente: 'moth-i' }` y, para las seis, la siguiente de la anterior es la propia órbita; `rutaDeOrbita('figura-de-ocho')` vale `/orbitas/figura-de-ocho`; `RUTA_GALERIA` vale `/#galeria`; y `ETIQUETA_SOLUCION` da «Solución exacta» a Lagrange, «Estable» a la figura de ocho y «Hallada en 2013» a las otras cuatro. *(Vitest)*
3. **Formato de cifras.** Dados valores concretos, cuando se formatean, entonces `formatearCifra(-1.287142, 3)` es `−1,287` con U+2212 (no el guion `-`), `formatearCifra(6.32591398, 2)` es `6,33`, `formatearCifra(-0.0004, 3)` es `0,000` (sin signo), `formatearCifra(-0.0006, 3)` es `−0,001`, `formatearCifra(12, 0)` es `12` y `formatearCifra(NaN, 3)` e `Infinity` dan `—`; `formatearPorcentaje(0.3744)` es `37,4 %` con espacio duro U+00A0, `formatearPorcentaje(0.99999)` y `formatearPorcentaje(1 - 1e-12)` son `99,9 %` (nunca `100,0 %`), `formatearPorcentaje(0.29)` es `29,0 %` y `formatearPorcentaje(0)` es `0,0 %`; `formatearTiempo(3.16295699)` es `3,16`, `formatearTiempo(6.32585)` es `6,32` (trunca) mientras que `formatearCifra(6.32585, 2)` es `6,33`, y `formatearTiempo(0.29)` es `0,29`; `textoPosicion(0.5, 6.32591398)` es `50,0 % del periodo (t = 3,16 de 6,33)`; `textoEstela` da `5 % del periodo` para 0,05, `15 % del periodo` para 0,15 y `100 % del periodo` para 1; y `textoVelocidad` da `0,25×`, `0,5×`, `1×`, `2×` y `4×` con U+00D7. *(Vitest)*
4. **Mapeo de controles.** Dados los valores de los deslizadores, cuando se convierten, entonces `VELOCIDADES` es `[0.25, 0.5, 1, 2, 4]`, `esVelocidad(2)` es verdadero y `esVelocidad(3)` y `esVelocidad('2')` son falsos; `LONGITUD_ESTELA` es `{ minima: 0.05, maxima: 1, paso: 0.05, inicial: 0.5 }` y `POSICION` es `{ minima: 0, maxima: 0.999, paso: 0.001 }`; `valorDeDeslizador(0.9996)` es `0.999`, `valorDeDeslizador(0.5004)` es `0.5`, `valorDeDeslizador(0.5006)` es `0.501`, `valorDeDeslizador(1.25)` es `0.25` y `valorDeDeslizador(-0.25)` es `0.75`; `posicionDeDeslizador(0.4)` es `0.4`, `posicionDeDeslizador(1.5)` es `0.999` y `posicionDeDeslizador(NaN)` es `0`. *(Vitest)*
5. **Telemetría en vivo.** Dado el estado construido a mano `[0,0, 3,0, 0,4, 1,0, 0,2, 0,0]` (posiciones y velocidades de GRV-02) con periodo 10 y `u = 0.25`, cuando se lee, entonces `tiempo` vale 2,5, `fase` 0,25, `energia` `2,5 − 47/60 ≈ 1,716667` (tolerancia 1e-6), `momentoLineal` `√5`, `distanciaMinima` 3 y `velocidadMaxima` 2, y `formatearLectura` da `2,50`, `25,0 %`, `1,717`, `2,236`, `3,000` y `2,000`. Dada Lagrange en `u = 0`, `energia` es `−√3/2`, `momentoLineal` menor que 1e-12, `distanciaMinima` `√3` y `velocidadMaxima` `3^(−1/4)`, todo con tolerancia 1e-9. Dadas las seis trayectorias interpoladas con `estadoEn` en `u = k/720` (k de 0 a 719), `|E(u) − E(0)|` es menor que 1e-6 y `momentoLineal` menor que 1e-12 en las seis (medido con 20 000 muestras: ≤ 1,68e-7 y ≤ 4,2e-14), y el texto de la energía con 3 decimales (`formatearLectura`) es idéntico al de `E(0)` en todas las muestras de las seis. *(Vitest)*
6. **Ritmo de la telemetría.** Dado `INTERVALO_TELEMETRIA_MS` igual a 100, cuando se consulta `debeActualizar`, entonces con reproducción vale `false` a 99 ms de la última escritura y `true` a 100 ms y a 250 ms; en pausa vale `true` a 0 ms y a 1 ms; y un intervalo de 50 ms pasado como argumento se respeta. *(Vitest)*
7. **Almacén.** Dado `crearAlmacenInterfaz()`, cuando se lee el estado inicial, entonces es `{ ordenGaleria: 'catalogo', ultimaOrbita: null, velocidad: 1, longitudEstela: 0.5, reanudacion: {}, entradaPorHistorial: false }` y `ESTADO_INICIAL` (y su `reanudacion`) está congelado. Cuando se actúa: `elegirOrden('energia')` lo fija, y repetirlo o pasar un valor desconocido no cambia el estado ni notifica a un suscriptor; `recordarOrbita('goggles')` y `olvidarOrbita()` fijan y limpian `ultimaOrbita`; `fijarVelocidad(2)` se acepta y `fijarVelocidad(3)` se ignora; `fijarLongitudEstela(2)` queda en 1, `(0)` en 0.05 y `(NaN)` se ignora; `guardarReanudacion('goggles', { posicion: 1.25, vista: v })` guarda `posicion` 0.25 y una copia de `v` (modificar `v` después no cambia el almacén), no toca otros slugs, sustituye el valor anterior y crea un objeto `reanudacion` nuevo (la referencia cambia); `guardarReanudacion` con `posicion` `NaN` se ignora; `marcarEntradaPorHistorial(true)` lo fija y repetirlo no notifica. Dos almacenes creados por separado no comparten estado (cambiar uno no cambia el otro) y `getInitialState()` no refleja los cambios. El módulo no exporta ninguna instancia de almacén (ningún export tiene `getState`). Los selectores devuelven primitivos o la misma referencia en dos lecturas seguidas. *(Vitest)*
8. **Sitio y metadatos.** Dados entornos concretos, cuando se resuelve la URL, entonces `{}` da origen `http://localhost:3000`; `{ URL_SITIO: 'https://orbitas.example.dev' }` da ese origen; `{ VERCEL_PROJECT_PRODUCTION_URL: 'orbitas.vercel.app' }` da `https://orbitas.vercel.app`; si están las dos, gana `URL_SITIO`; una cadena vacía cuenta como ausente; `{ URL_SITIO: 'https://orbitas.example.dev/' }` se acepta; y lanzan un `Error` cuyo mensaje contiene `URL_SITIO` los valores `'no es una url'`, `'ftp://orbitas.example.dev'` y `'https://orbitas.example.dev/base'`. La función acepta `process.env` sin error de tipos (`npm run typecheck`). `entradasSitemap(new URL('https://orbitas.example.dev'))` devuelve siete entradas: `https://orbitas.example.dev/` y las seis `https://orbitas.example.dev/orbitas/<slug>` en orden de catálogo. `metadatosDeOrbita` de Goggles da título `Goggles · Órbitas`, la descripción del catálogo, `canonical` y `openGraph.url` iguales a `/orbitas/goggles`, `openGraph.title` igual al título, `siteName` `Órbitas`, `locale` `es_ES` y `type` `website`; y los seis títulos son distintos. *(Vitest)*
9. **Datos de servidor.** Dadas las seis órbitas, cuando se piden sus fichas, entonces `miniatura` es igual a `trazarMiniatura(integrarPeriodo(orbita))`; `energiaInicial` (calculada con `Float64Array.from(estadoInicial)`) vale `−√3/2` en Lagrange (tolerancia 1e-12) y `−1,287142` en la figura de ocho (tolerancia 1e-5); `distanciaMinima` y `velocidadMaxima` son los campos de la `Trayectoria`; `lecturaInicial` tiene `tiempo` 0, `fase` 0, la energía de `energiaInicial` (1e-12) y `momentoLineal` menor que 1e-12; dos llamadas devuelven la misma referencia; `resumirCatalogo()` devuelve seis resúmenes en orden de `SLUGS` con la energía de cada estado inicial; y preparar las seis fichas tarda menos de 3 s (cota holgada, como en GRV-02). *(Vitest)*
10. **Invariantes del repositorio.** Dado el código, entonces `zustand` solo se importa desde `src/store/`; `src/store/` no contiene, **en código** (los comentarios no cuentan: «no persiste» no debe disparar la búsqueda), `localStorage`, `sessionStorage`, llamadas a `persist(` ni importaciones de `zustand/middleware`; `package.json` declara `zustand` en `dependencies` con un rango que empieza por `^5.`; `src/app/layout.tsx` envuelve a `children` en `ProveedorAlmacen`; `src/components/galeria`, `src/components/detalle`, `src/components/comunes`, `src/store`, `src/lib/galeria` y los `.tsx` de `src/app` no contienen literales de color (la expresión de GRV-03 se amplía a esas carpetas); `src/app/icon.svg` existe, contiene un `polygon` y su `fill` coincide con `--color-electric-iris` de `globals.css`; y `.env.example` contiene la línea `URL_SITIO=http://localhost:3000`. Con la API de ESLint (`lintText` con la configuración del repositorio y una ruta de archivo simulada) se comprueba: importar `three` o `zustand` desde `src/app/x.tsx` da error; `zustand` desde `src/components/escena/x.ts` da error y `three` no; `three` desde `src/store/x.ts` da error y `zustand` no; `import('zustand')` fuera de `src/store/` da error; y `import { SLUGS } from '@/lib/fisica'` da error en `src/components/galeria/x.tsx`, en `src/store/x.ts` y en `src/lib/galeria/orden.ts`, mientras que `import type { Slug } from '@/lib/fisica'` y `import { SLUGS } from '@/lib/fisica/tipos'` no. *(Vitest)*

**Rutas, HTML del servidor y presupuesto**

11. **Rutas estáticas.** Dado el build que arranca el servidor de pruebas, cuando se lee `.next/prerender-manifest.json`, entonces `routes` contiene las seis claves `/orbitas/lagrange`, …, `/orbitas/yin-yang-i`, cada una con `initialRevalidateSeconds: false`, y ninguna otra clave que empiece por `/orbitas/`; la ruta de detalle es estática **sin fallback** (`dynamicParams = false`): en el manifiesto, `dynamicRoutes['/orbitas/[slug]'].fallback === false` o la forma equivalente que tenga esa versión de Next, verificada leyendo `node_modules/next/dist/docs/` y con un build real antes de fijar el test (el `.next` actual es anterior al ticket y no la contiene); `/` sigue siendo estática (`initialRevalidateSeconds: false`) y su `htmlSize` no supera 200 000 bytes (línea base: 21 330; con las seis miniaturas, unos 133 000); el `htmlSize` de cada una de las seis rutas de detalle no supera 80 000 bytes (medido: 24 000 a 34 000; un tope así detecta una `Trayectoria` serializada); y `GET /orbitas/no-existe` y `GET /orbitas` devuelven 404. *(Playwright; depende de la forma del manifiesto de Next)*
12. **Detalle sin JavaScript.** Dadas las seis rutas de detalle con JavaScript desactivado, cuando cargan, entonces responden 200 con exactamente un `h1` igual al nombre; el `<title>` es `Nombre · Órbitas`; aparecen la descripción y el crédito del catálogo; el contenedor `[data-estado-escena="cargando"]` trae la miniatura con tres trazos cuyo `d` y cuyo `viewBox` son los de `trazarMiniatura`, una región `role="status"` vacía y ningún botón con «animación» visible ni `canvas`; los enlaces «Volver a la galería» (`/#galeria`), «Anterior: …» y «Siguiente: …» apuntan a las vecinas de `vecinas`; los cinco textos `[data-resumen]` tienen el valor de la ficha y las cinco cifras `[data-cifra]` y la barra (`data-valor="0.000"`) traen la lectura inicial; y no hay controles visibles ni enfocables (la región `[data-region="controles"]` existe, pero es `invisible` e `inert`: ni el botón, ni los deslizadores, ni el grupo de velocidad, ni «Restablecer vista» están visibles ni salen en el árbol de accesibilidad). Valores concretos: la figura de ocho muestra energía `−1,287`, distancia mínima `1,000` y velocidad máxima `1,272`; Lagrange, `−0,866`, `1,732` y `0,760`; y las dos tienen `0,00`, `0,0 %` y momento `0,000`. *(Playwright, sin JavaScript)*
13. **404.** Dadas `/orbitas/no-existe`, `/orbitas` y `/ruta-que-no-existe`, cuando cargan, entonces el estado es 404; hay un `h1` «Aquí no hay ninguna órbita.», un enlace «Volver a la galería» a `/#galeria`, la cabecera y el pie del layout, `<meta name="robots" content="noindex">`, ningún `[data-estado-escena]` y ningún `canvas`; el `<title>` es `Página no encontrada · Órbitas`; y el cuerpo es negro y el `h1` pesa 400. *(Playwright)*
14. **Metadatos y sitemap.** Dadas las seis rutas de detalle, cuando se lee su `<head>`, entonces `description` es la del catálogo; el `<link rel="canonical">` tiene ruta `/orbitas/<slug>` (el origen lo decide `URL_SITIO`, que en las pruebas es el valor por defecto); `og:title` es el título, `og:description` la descripción, `og:url` tiene la misma ruta, `og:type` es `website` y no hay `og:image`; y los seis títulos son distintos. La portada conserva el título `Órbitas`. `GET /sitemap.xml` responde 200 con `<loc>` para `/` y las seis rutas, siete en total. *(Playwright)*
15. **Icono.** Dadas la portada y un detalle, cuando cargan, entonces el `<head>` trae `link[rel="icon"]` con un `href` que contiene `icon.svg`; esa URL responde 200 con tipo `image/svg+xml` y un `polygon`; y durante la carga de ambas páginas no hay ninguna respuesta con estado de 400 en adelante. *(Playwright)*
16. **Galería en el HTML del servidor.** Dada la portada con JavaScript desactivado, cuando carga, entonces `#galeria` tiene un `h2` «Seis soluciones periódicas» y exactamente seis enlaces a `/orbitas/<slug>` en orden de catálogo; cada uno contiene un `svg` con tres `path` cuyos `d` son los de `trazarMiniatura(integrarPeriodo(orbita))` (las seis, no solo la figura de ocho), el nombre y los textos `Periodo` y `Energía` con estos valores: Lagrange `8,27` y `−0,866`; figura de ocho `6,33` y `−1,287`; Butterfly I `6,24` y `−2,170`; Goggles `10,47` y `−2,430`; Moth I `14,89` y `−1,382`; Yin-Yang I `17,33` y `−1,429`; y la etiqueta de la solución. Dentro de `#galeria` no hay `canvas` ni `[data-estado-escena]`; en toda la página hay exactamente un `[data-estado-escena]` (el del hero), ningún `canvas` (sin JavaScript no lo hay) y un `h1`. Los enlaces y sus elementos de lista no tienen borde (ancho 0), sombra ni fondo (transparente). *(Playwright, sin JavaScript)*
17. **Presupuesto de JavaScript y three fuera.** Dada la portada, cuando se descarga su HTML, entonces la suma de los tamaños con gzip (nivel 9) de los scripts que referencia (`<script src>` y `<link rel="preload" as="script">`, sin repetir) no supera en más de 8 192 bytes (8 KB) la línea base `BASE_JS_PORTADA_GZIP_BYTES`, que fija el primer CI sobre `develop` con este mismo método (gzip -9) y se anota con el hash del commit (referencias medidas: 181 502 B en CI y 181 373 B en local, con 8 scripts y 585 893 B sin comprimir; un prototipo mínimo de este ticket añadió 1 330 B). Ninguno de esos scripts, en `/` ni en `/orbitas/butterfly-i`, contiene `WebGLRenderer`, y al llegar a `lista` el detalle sí descarga uno que lo contiene. En `/`, tras llegar a `lista` y esperar 2 s, hay exactamente un `canvas` en toda la página (el del hero) y ninguno en `#galeria`. *(Playwright)*

**Galería y estado al volver**

18. **Orden e hidratación.** Dada la portada con JavaScript, cuando carga, entonces el grupo «Ordenar por» tiene tres radios («Catálogo», «Periodo», «Energía») con «Catálogo» marcado y es una sola parada de tabulación; los enlaces están en orden de catálogo, igual que en el HTML del servidor; no hay eventos `pageerror` ni mensajes de consola que mencionen hidratación; el `role="status"` de la galería está vacío. Cuando se elige «Periodo», los enlaces quedan en el orden del criterio 1 y el aviso dice «Galería ordenada por periodo.»; con «Energía», en su orden y su aviso; el foco sigue en el radio elegido; con el foco en «Catálogo», la flecha derecha elige «Periodo». Cada opción es un `<input type="radio">` con un `<label>` asociado (`input.labels[0]`), que es su etiqueta visible. La opción marcada tiene subrayado ámbar (`text-decoration-line` con `underline` y color `rgb(255, 184, 41)` = `--color-saffron-spark`) y las otras ninguno; el subrayado se mide en esa etiqueta o en un descendiente visible suyo, nunca en el `input`, que puede estar oculto. La altura de `#galeria` con JavaScript difiere menos de 2 px de la que tiene sin él. *(Playwright)*
19. **Volver con el botón del navegador.** Dada la portada a 375×812 y a 1440×900 con el orden «Energía» elegido, cuando se pulsa el enlace de Moth I y luego «atrás» del navegador, entonces la URL es `/`; «Energía» sigue marcada y los enlaces están en su orden; el enlace `[data-orbita="moth-i"]` es el elemento enfocado y está entero dentro del viewport; el hero vuelve a llegar a `lista`; y **el primer orden de la lista que se pinta tras volver ya es el de energía** (un `MutationObserver` instalado antes de volver registra el orden de los enlaces cada vez que aparece la lista, y el primer registro no es el de catálogo). *(Playwright)*
20. **Volver con el enlace y sin persistencia.** Dado el orden «Periodo» elegido, cuando se entra en Goggles y se pulsa «Volver a la galería», entonces la URL es `/#galeria`, «Periodo» sigue marcada y el enlace de Goggles está enfocado y entero en el viewport. Dado un detalle abierto directamente por URL (`goto('/orbitas/goggles')`, almacén recién creado), cuando se pulsa «Volver a la galería», entonces también queda enfocado y visible el enlace de Goggles. Cuando se recarga la portada, el orden es «Catálogo», ningún enlace de la galería está enfocado y `localStorage.length` y `sessionStorage.length` valen 0. *(Playwright)*
21. **Anterior y siguiente.** Dado `/orbitas/lagrange`, cuando se pulsa «Anterior: Yin-Yang I», entonces se navega sin recarga (una marca puesta en `window` antes de pulsar sigue definida después) a `/orbitas/yin-yang-i`, el `h1` cambia, `data-detalle` vale `yin-yang-i` y la escena llega a `lista`; y desde `/orbitas/yin-yang-i`, «Siguiente: Lagrange» vuelve a `/orbitas/lagrange`. Desde Lagrange, «Siguiente: Figura de ocho» lleva a `/orbitas/figura-de-ocho` y «Volver a la galería» deja enfocada la miniatura de la figura de ocho. *(Playwright)*
22. **Limpieza al desmontar.** Dado un contexto con instrumentación de inicio que registra cada contexto `webgl2` que se crea, cuenta las construcciones de `Worker` y los `postMessage` de tipo `calcular`, cuando se hacen 12 idas y vueltas por navegación cliente, alternando la figura de ocho y Goggles (portada → enlace de la órbita → `lista` → «Volver a la galería» → portada en `lista`), entonces se crearon al menos 24 contextos; en cada vuelta hay como mucho 2 contextos no perdidos (`isContextLost()` falso) y al terminar como mucho 1 vivo; ninguna salida de consola contiene «Too many active WebGL contexts» (0 avisos); no hay `pageerror`; se construyó un solo `Worker` y se enviaron exactamente 2 peticiones `calcular` (figura de ocho y Goggles: la caché del cliente funciona). Tiempos: el primer `goto`, en frío, tarda como mucho 3 s y cada navegación cliente en caliente hasta `lista` como mucho 600 ms (medido: 0,9–1,35 s en frío y 61–290 ms en caliente). La prueba llama a `test.setTimeout(180_000)`. *(Playwright)*

**Detalle**

23. **Controles presentes.** Dada la figura de ocho con la escena en `lista`, cuando se inspecciona, entonces están el botón «Pausar animación», el grupo «Velocidad de reproducción» con los cinco radios y «1×» marcado, el deslizador «Posición en el periodo» (`min` 0, `max` 0.999, `step` 0.001, valor cercano a la posición actual), el deslizador «Longitud de la estela» (`min` 0.05, `max` 1, `step` 0.05, valor 0.5) y el botón «Restablecer vista»; partiendo del lienzo enfocado, Tab recorre en este orden: botón de animación, grupo de velocidad (una parada), deslizador de posición, deslizador de estela, «Restablecer vista», «Anterior: …» y «Siguiente: …»; exactamente un botón de la página tiene fondo `rgb(128, 82, 255)`; «Restablecer vista» tiene fondo transparente y color `rgb(154, 154, 154)`; los dos deslizadores tienen `accent-color` `rgb(128, 82, 255)`; y no hay bordes ni sombras en ningún control. *(Playwright)*
24. **Velocidad.** Dada la figura de ocho en marcha (periodo 6,32591398 s), cuando se elige «2×», entonces `data-velocidad` vale 2 y la fracción de periodo avanza a 2/6,32591398 ≈ 0,316 por segundo, con tolerancia del 10 % (medido: desviación máxima del 2,1 %). La velocidad se mide muestreando `data-posicion` con su hora cada 100 ms durante 2 s, desenvolviendo cada incremento (cada diferencia entre lecturas consecutivas es menor que 0,5 del periodo) y ajustando una recta a la posición desenvuelta frente al tiempo; no vale comparar dos lecturas aisladas, porque `data-posicion` se escribe como mucho cada 100 ms. Con «0,25×» la pendiente es ≈ 0,0395 por segundo y con «4×» ≈ 0,632 (o, si la tolerancia resulta frágil a 4×, se mide en Yin-Yang I, de periodo 17,33 s, donde 4× da ≈ 0,231). Solo el radio marcado está subrayado. *(Playwright)*
25. **Deslizador de posición.** Dada la figura de ocho en marcha, cuando se fija el deslizador a 0,5 (con el mecanismo de entrada de Playwright, que dispara `input`), entonces `data-reproduciendo` pasa a `false` y el botón a «Reproducir animación»; `data-posicion` vale 0.500 en menos de 500 ms y coincide con el valor del deslizador con diferencia menor que 0,002; las cinco cifras en vivo valen exactamente `formatearLectura(leerTelemetria(estadoEn(T, 0.5), 0.5, periodo))` calculado en Node (tiempo `3,16` y fase `50,0 %`, esta última leída del texto visible de fase de la columna `tiempo`, con U+00A0; una telemetría que se quedase con la lectura inicial no lo cumple); y `aria-valuetext` es `50,0 % del periodo (t = 3,16 de 6,33)`. Con el foco en el deslizador, la flecha derecha da el valor 0.501 (no 0.51), `Home` da 0 (`data-posicion` 0.000, tiempo `0,00`) y `End` da 0.999 (fase `99,9 %`). Arrastrar con el ratón hasta el 25 % de su recorrido da un valor de 0,25 con tolerancia 0,03 y `data-posicion` coincide con él. Tras fijar la posición, «Reproducir animación» continúa desde ahí (la posición no vuelve a 0). Con la escena en marcha y sin tocar ni enfocar el deslizador, su valor sigue a `data-posicion` con diferencia menor que 0,05 y `data-reproduciendo` sigue siendo `true`. *(Playwright)*
26. **Longitud de la estela.** Dada la figura de ocho en pausa, cuando se fija el deslizador a 0,05 y después a 1, entonces `data-longitud-estela` cambia, `aria-valuetext` es `5 % del periodo` y `100 % del periodo`, y el lienzo con longitud 1 tiene al menos el doble de píxeles cercanos a los colores de los cuerpos que con 0,05 (umbral que se calibra en el primer verde sin bajarlo de 1,5). *(Playwright con `pngjs`)*
27. **Reproducir, pausar y restablecer.** Dado el detalle en marcha, cuando se pulsa el botón violeta o Espacio con el lienzo enfocado, entonces `data-reproduciendo` alterna, el texto del botón cambia entre «Pausar animación» y «Reproducir animación», y en pausa `data-posicion`, `data-vista` y las cifras de telemetría no cambian durante 600 ms (y después un cambio de deslizador demuestra que la página los procesaba). Con la escena en marcha y sin tocar nada, `data-vista` no cambia en 2 s (sin giro automático). Cuando se pulsan tres veces la flecha derecha en el lienzo y luego «Restablecer vista» (con ratón y con Enter), entonces `data-vista` vuelve a `0.600 1.000 1.000`. *(Playwright)*
28. **Preferencias compartidas.** Dado el detalle de Lagrange con «2×» y estela 1, cuando se pulsa «Siguiente: Figura de ocho», entonces en la nueva órbita «2×» está marcado, `data-velocidad` vale 2 y el deslizador de estela vale 1; la posición y la vista son las de una órbita nueva (la distancia circular de `data-posicion` a 0 es menor que `(segundos desde el clic + 0,5) · 2 / periodo`, con el periodo de la figura de ocho, porque se reproduce a 2×; vista `0.600 1.000 1.000`); y tras `page.reload()` todo vuelve a «1×» y 0.5. *(Playwright)*
29. **Reanudación por órbita.** Dado un contexto con movimiento reducido, cuando en Butterfly I se fija la posición a 0,5, se pulsa dos veces la flecha derecha en el lienzo (se anota el texto de `data-vista`, `V`), se vuelve a la galería con «Volver a la galería» y se entra de nuevo en Butterfly I, entonces en la nueva escena `data-posicion` vale 0.500, `data-vista` es exactamente `V`, el deslizador vale 0.5, la fase mostrada es `50,0 %` y la escena empieza pausada. Cuando se pulsa «Restablecer vista», `data-vista` es `0.600 1.000 1.000` y no `V`. Una órbita que no se visitó (Moth I) empieza en posición 0.000 y vista inicial. Tras recargar, Butterfly I empieza en 0.000 y vista inicial. Sin movimiento reducido, la prueba usa **Yin-Yang I** (periodo 17,33 s) y se toma como referencia el `data-posicion` leído justo antes de pulsar «Volver a la galería», con su hora; la posición al volver está a una distancia circular de ella menor que `(segundos desde esa lectura + 0,6) / periodo`. Se usa Yin-Yang I porque con periodos cortos (figura de ocho, 6,33 s; Butterfly I, 6,24 s) la cota, de varias décimas de periodo, no distinguiría un reinicio a 0 de una reanudación correcta. La vista guardada es la vista **objetivo** (la de `alCambiarVista`, la que escribe `data-vista`), no la suavizada de la cámara. *(Playwright)*
30. **Telemetría en vivo.** Dada la figura de ocho en marcha, cuando se leen durante 3 s los textos de `[data-cifra]` cada 100 ms, entonces `energia` vale siempre `−1,287` y `momento` siempre `0,000` (y lo mismo, con su propio valor, en Goggles, la órbita de encuentros más fuertes); `tiempo` toma al menos 5 valores distintos, y `distancia-minima` y `velocidad-maxima` al menos 3 cada una (una telemetría congelada en la lectura inicial no lo cumple); la distancia mínima en vivo nunca es menor que 0,95 veces `distanciaMinima` de la trayectoria ni la velocidad máxima en vivo mayor que 1,05 veces su `velocidadMaxima`; los textos estáticos `[data-resumen]` tienen los valores de la ficha, calculados en Node (por ejemplo `Periodo 6,33`); y el contador `data-actualizaciones` avanza entre 2 y 12 veces por segundo mientras se reproduce y nunca más que `data-fotogramas`, que avanza al menos 20 veces por segundo (suelo que hace distinguible una actualización por fotograma de una a 10 Hz; medido: 47–60 fps con lienzo de 1280×720). Un `data-posicion` puede ir retrasado hasta 300 ms respecto a la escena (medido: 100–140 ms pico a pico), y los criterios que lo comparan con otra lectura lo toleran. Medido: 27–29 lecturas distintas de `tiempo` por 30 muestras y escritura de la telemetría a ≈9,7 Hz. En pausa `data-actualizaciones` no cambia durante 1 s, y fijar la posición con el deslizador a 0,5 lo incrementa en menos de 500 ms. La barra de fase tiene `data-valor` cercano a `data-posicion` (diferencia menor que 0,05). Las cifras tienen `font-variant-numeric` con `tabular-nums`, tamaño de al menos 27 px (42 px desde 900 px de ancho) y el peso del cuerpo (300 por debajo de 640 px y 200 desde 640 px); las etiquetas son ámbar `rgb(255, 184, 41)`, en mayúsculas y de 14 px; y ninguna columna tiene borde, sombra ni fondo. *(Playwright)*
31. **Accesibilidad de controles y telemetría.** Dado el detalle en `lista`, cuando se examina el árbol de accesibilidad (`ariaSnapshot` de la región de telemetría) en dos instantes separados 1,5 s con la escena en marcha, entonces ambos son idénticos (la parte viva no aparece) y contienen las etiquetas y los textos estáticos; todas las cifras en vivo tienen `aria-hidden="true"`; dentro del detalle no hay `aria-live`, `<output>`, `role="timer"`, `role="alert"` ni `role="log"`, y solo existe un `role="status"` (el del visor); cada control tiene nombre accesible (los nombres exactos del contrato); con el foco por teclado en un radio de velocidad, su etiqueta visible tiene contorno blanco de 2 px (`rgb(255, 255, 255)`), y lo mismo el deslizador de posición, el de estela, el botón violeta y «Restablecer vista» (la etiqueta es `input.labels[0]` o un descendiente visible suyo; el contorno, el subrayado y el área mínima nunca se miden en el `input` del radio, que puede estar oculto); cada botón, deslizador y etiqueta de radio mide al menos 44 px de alto y 44 px de ancho a 375 px y a 1440 px; y las flechas cambian la velocidad dentro del grupo. Con el foco en el deslizador de posición y la escena en marcha, su `value` y su `aria-valuetext` no cambian durante 1 s mientras el texto visible de al lado sí cambia; el grupo de velocidad y el selector de orden de la galería tienen como nombre accesible su texto visible («Velocidad de reproducción», «Ordenar por»). *(Playwright)*
32. **Responsive y estabilidad.** Dado el detalle a 375, 768 y 1440 px de ancho, cuando carga y cuando llega a `lista`, entonces no hay desbordamiento horizontal; el `h1` pesa 400 y mide al menos 46 px a 375 px y al menos 78 px a 1440 px; el lienzo mide al menos 327 px de ancho y 360 de alto a 375 px, y al menos 800 px de ancho y 480 de alto a 1440 px; los controles se pliegan sin salirse; las cinco columnas de telemetría son visibles, quedan dentro del viewport y no se solapan; y el borde superior de `[data-region="telemetria"]` se desplaza menos de 2 px entre una carga con el Worker mudo (estado `cargando`, con los controles `invisible` e `inert`) y la carga normal (`lista`), a 375 y a 1440 px. A 375×812, con el borde inferior de la telemetría alineado con el inferior del viewport, quedan visibles al menos 100 px del lienzo (la telemetría va justo bajo el visor); a 1440 px el orden visual es el del DOM. Dada la pantalla de 375×600, cuando la página se desplaza hasta que el lienzo sale por completo de la vista, entonces `data-fotogramas` y `data-actualizaciones` dejan de crecer; al volver a mostrarlo, en 1 s `data-fotogramas` crece al menos 20 y `data-actualizaciones` al menos 2, y la posición no salta: la distancia circular entre el `data-posicion` anterior a la pausa y el posterior al reanudar es menor que `(segundos reales transcurridos + 0,4) / periodo` (los 0,4 s cubren el retraso de hasta 300 ms de la telemetría; ya no se remite al criterio 14 de GRV-03). *(Playwright)*
33. **Movimiento reducido y galería sin animación.** Dado `prefers-reduced-motion: reduce`, cuando carga el detalle, entonces `data-reproduciendo` es `false`, el botón dice «Reproducir animación», `data-posicion` y `data-actualizaciones` no cambian en 1 s ni `data-vista` en 2 s, y tras pulsar el botón la posición avanza. Dada la portada con movimiento normal, entonces `document.querySelector('#galeria').getAnimations({ subtree: true })` está vacío. *(Playwright)*
34. **Estados alternativos en el detalle.** Dado un navegador sin WebGL2, cuando carga un detalle, entonces el contenedor pasa a `sin-webgl`, la miniatura sigue visible, la región `role="status"` explica que no se puede mostrar la escena 3D, no hay controles visibles ni enfocables (en `sin-webgl` y `error` los controles pasan a `hidden` (`display: none`): ni botón de animación, ni deslizadores, ni grupo de velocidad, ni «Restablecer vista»), la telemetría sigue mostrando la lectura inicial y los textos estáticos, los enlaces de vuelta, anterior y siguiente funcionan, y no hay `pageerror` ni respuestas de error. Dado un Worker que falla, el estado es `error` con la miniatura y el aviso «No se pudo calcular la órbita». *(Playwright)*
35. **Sin regresiones de GRV-03.** Dado el conjunto de pruebas de GRV-01 a GRV-03, cuando se ejecutan con el código de este ticket, entonces pasan sin cambios en sus archivos (salvo, con justificación escrita en el commit, ayudas comunes); `tests/unit/layout.test.ts` sigue pasando con `metadata.title` como cadena. *(Vitest y Playwright)*
36. **El logotipo no restaura la galería.** Dada la portada con el orden «Energía» elegido y la página desplazada, cuando se entra en Moth I y se pulsa el logotipo «Órbitas, inicio» de la cabecera, entonces la URL es `/` (sin hash), `window.scrollY` vale 0 (a 1280×720 el detalle es más alto que la ventana, así que hay desplazamiento previo que comprobar; la portada que se abre «de nuevo» empieza arriba y el `scrollY` esperado es 0, no la posición de la galería), ningún enlace de `#galeria` es el elemento enfocado y el orden «Energía» sigue marcado (el estado de interfaz se conserva; solo se omiten foco y scroll). Dado el mismo recorrido con «Volver a la galería» o con «atrás» del navegador, el foco y la visibilidad se restauran (criterios 19 y 20). *(Playwright)*

## Variantes erróneas que la revisión de los tests debe probar

La revisión independiente de los tests (paso 5 del orden de trabajo) introduce cada una de estas variantes en el código y comprueba que algún test falla.

| Criterio | Variantes |
|---|---|
| 1 | Orden descendente; por nombre; `sort` sobre la propia entrada; `catalogo` que devuelve la entrada tal cual; empates inestables |
| 3 | Guion corto en lugar de U+2212; punto decimal; `−0,000`; `100,0 %` al final del periodo (también con `1 − 1e-12`, sin el tope de 999); redondear en lugar de truncar el tiempo; `0,28` por falta de tolerancia |
| 4 | Paso 0,01; sin límite superior (1 en lugar de 0,999); aceptar velocidades fuera del conjunto |
| 5 | Energía cinética sola; módulos sumados en lugar del momento vectorial; distancia máxima o media; velocidad media; energía con otra convención de signo |
| 6 | Limitar el ritmo también en pausa (la última posición fijada no se vería); límite exclusivo |
| 7 | Almacén como instancia de módulo; acciones que notifican sin cambio; `persist`; `reanudacion` mutada en lugar de sustituida; vista guardada por referencia; posición sin envolver |
| 8 | Cadena vacía tratada como URL; precedencia invertida; canonical absoluto con otro origen; `URL_SITIO` con esquema o ruta no válidos aceptado |
| 10 | Bloque de ESLint de zustand que desactiva la regla de three (o al revés); bloque del barril que olvida repetir los patrones de three y zustand; `allowTypeImports` ausente |
| 11–14 | `dynamicParams` activo (200 en un slug inventado); `h1` duplicado; metadatos iguales en las seis; título con la plantilla del layout; una `Trayectoria` serializada en el HTML del detalle |
| 12, 34 | Controles visibles o enfocables antes de `lista` o sin WebGL (`visibility`/`inert` olvidados) |
| 16 | Orden por nombre en el servidor; solo la figura de ocho con miniatura propia; tarjetas con borde |
| 17 | Three en el chunk inicial; JS de la portada por encima de la línea base más 8 192 B |
| 18 | Orden distinto en servidor y cliente; radios sin agrupar (varias paradas de tabulación); nombre accesible del grupo distinto del texto visible |
| 19–21 | Aplicar el orden restaurado en un efecto (parpadeo: el `MutationObserver` del criterio 19 ve primero el catálogo); registrar la última órbita en el clic de la miniatura (falla en entrada directa); foco sin hacerla visible; hacerla visible sin foco; navegación cíclica sin envolver; navegación con recarga (falta la marca de `window`) |
| 36 | Restaurar foco y scroll sin condición (el logotipo los mueve). No consumir `ultimaOrbita` al decidir no restaurar no tiene una trampa E2E directa: lo cubre el criterio 7 (unitario) y la revisión del PR |
| 22 | Contexto sin liberar al desmontar; Worker nuevo en cada navegación; peticiones repetidas por no usar la caché |
| 24–26 | Velocidad ignorada; subrayado en el radio equivocado; deslizador que no pausa; paso 0,01; valor del deslizador desfasado de `data-posicion`; estela sin efecto en el lienzo; telemetría congelada en la lectura inicial tras fijar la posición (criterio 25) |
| 29 | Reanudación global y no por órbita; «Restablecer vista» que vuelve a la vista recordada; guardar al montar en lugar de al desmontar; guardar la vista suavizada en lugar de la objetivo; persistir tras recargar |
| 30 | Energía cinética o instantánea sin conservar; actualización por fotograma; ninguna actualización; escritura limitada también en pausa; distancia mínima y velocidad máxima congeladas |
| 31 | `<output>` o `aria-live` en la telemetría; deslizadores sin nombre; radios con el foco invisible; objetivos menores de 44 px; deslizador de posición que escribe `value` o `aria-valuetext` con el foco puesto y la escena en marcha |
| 32 | Controles que aparecen al llegar a `lista` y empujan la telemetría; lienzo pequeño; columnas solapadas; telemetría en móvil lejos del visor |

## Orden de trabajo

1. `docs`: esta spec y sus correcciones tras la revisión.
2. `docs` (tras la aprobación y antes de los tests): `AGENTS.md` (propiedad de `src/lib/galeria/`, regla de `zustand`, `URL_SITIO`) y `DESIGN.md` (selector de texto, telemetría, alturas de los deslizadores, excepción de color de `icon.svg`). `frontend` los lee antes de tocar la interfaz.
3. **Prueba de riesgo local y línea base — realizada** (28/10, con 4 núcleos y con `taskset` a 1 núcleo). Con una página y una prueba desechables que **no se commitearon**, que montan y desmontan 12 veces un `VisorOrbita` de tamaño `grande` por navegación cliente, y con la misma configuración que el CI (`CI=1`, un solo worker), se midió: ningún contexto WebGL sin liberar (24 de 25 perdidos al final, 1 vivo), 0 avisos «Too many active WebGL contexts», SwiftShader a 47–60 fps con un lienzo de 1280×720, retraso de `data-posicion` de 100–140 ms pico a pico, 27–29 lecturas distintas de `tiempo` por 30 muestras de 100 ms, escritura de telemetría a ≈9,7 Hz, navegación cliente hasta `lista` en 61–290 ms, `goto` en frío en 0,9–1,35 s y build de 8,8–9,2 s con la caché caliente. No hay motivo para partir el ticket. Con esas cifras se han fijado las tolerancias de los criterios 22, 24, 30 y 32. El veredicto real lo da el CI de la PR de GRV-04; si allí hubiera inestabilidad, se ajustan las tolerancias, y solo si la limpieza de contextos o los fps lo exigen, el ticket se parte en **GRV-04a** (rutas, galería, almacén, detalle con visor y navegación) y **GRV-04b** (controles, telemetría y reanudación). Línea base de JS: 181 373 B gzip -9 en local y 181 502 B en CI (HTML de `/`: 21 330 B); la constante `BASE_JS_PORTADA_GZIP_BYTES` la fija el primer CI sobre `develop` y el criterio 17 usa «línea base + 8 KB». El tiempo de build varía de una máquina a otra, así que los umbrales son relativos a la línea base.
4. `test`: criterios 1 a 36 en rojo; deben fallar por falta de código, no por errores del test (los del almacén, por falta del módulo). Este commit marca la spec como aprobada.
5. `test`: revisión independiente de los tests con las variantes de la tabla anterior; se refuerzan donde ninguna variante falle.
6. `feat`, en cuatro bloques por riesgo, cada uno con su commit y con el linter, los tipos y los tests de sus criterios en verde: (a) refactor de `VisorOrbita` (modo controlado, `useReproduccion`, `vistaRestablecida`, props nuevas) con las pruebas de GRV-03 en verde; (b) controles imperativos y telemetría; (c) galería, almacén y foco al volver; (d) rutas, metadatos, 404, `sitemap` e icono. Antes de (c): instalar `zustand` y los cambios de `devops`.
7. Refactor con los tests en verde.
8. `docs`: ADR 0006 (estado de interfaz, rutas del detalle y metadatos), ticket `docs/tickets/GRV-04-galeria-detalle-y-rutas.md` (con los tiempos de build y el peso real de JS y HTML) y `docs/estado.md`.
9. Revisión (`pr-reviewer`; `seguridad` solo si la revisión lo pide) y enlace para abrir el PR.

## Traspasos tras la aprobación

- `frontend`: `src/lib/galeria/`, `src/store/`, `src/components/` (galería, detalle, comunes y los cambios de `escena/`), `src/app/` (rutas de detalle, `not-found`, `icon.svg`, `sitemap`, layout y portada) y `tests/e2e/`.
- `devops`: las reglas de ESLint de «Reglas de ESLint» (tres bloques combinados de three y zustand, más el bloque del barril, con `lintText` como comprobación), la línea `URL_SITIO=http://localhost:3000` en `.env.example` (es de `devops`), fijar `BASE_JS_PORTADA_GZIP_BYTES` en el primer CI sobre `develop` y revisar que el `timeout` de Playwright admite la prueba de 12 vueltas (la prueba fija el suyo). GRV-07 pasa `URL_SITIO` como `ARG` de la etapa de build.
- `backend`: nada que implementar. Solo se le consulta si algo exige cambiar `src/lib/fisica` o el Worker.
- `arquitecto`: `AGENTS.md` y `DESIGN.md` en el paso 2, y ADR 0006 en el paso 8; corrige la spec si la prueba de riesgo local o el CI de la PR obligan a cambiar tolerancias o a partir el ticket.
- `documentacion`: ticket y `docs/estado.md`.
- `seguridad`: sin entrada de usuario en el servidor, sin secretos y sin `dangerouslySetInnerHTML`; solo revisa si `pr-reviewer` lo pide.
- `pr-reviewer`: revisión de la rama contra esta spec.

## Riesgos y límites

- **Tiempo de build.** Un prototipo mínimo midió +1,0 a +1,3 s de build total (+0,3 s de generación estática); las seis integraciones con sus miniaturas tardan 104 ms en frío. La referencia de 4,4 s de la traza de GRV-03 no se reproduce (el build sale en 8,7 a 10,1 s según la máquina), así que los umbrales son relativos a la línea base del paso 3: si el build crece más de 3 s sobre ella, se revisa la memoización de `fichaDeOrbita` (es por proceso, y Next prerenderiza en varios).
- **Peso del HTML de `/`.** Pasa de 21 KB a unos 133 KB sin comprimir (de 5 a 34 KB con gzip): 68 714 B son datos de Next en línea y 57 330 B son SVG. Cada trazo viaja dos veces (HTML y datos de Next) y el de la figura de ocho cuatro (hero y galería). Es el coste de no enviar JavaScript 3D en la galería; los topes de 200 000 B (`/`) y 80 000 B (detalle) detectan errores gruesos, no regresiones finas. El peso real se anota en el ticket.
- **Tope de JavaScript.** Los 8 KB sobre la línea base (181 502 B gzip) son siete veces lo que midió el prototipo mínimo (+1 330 B). Importar `SLUGS` del barril costó +999 B más: de ahí la regla de ESLint.
- **Distancia mínima del periodo.** Es una cota superior calculada sobre los nodos (GRV-02): la distancia instantánea puede quedar por debajo en la última cifra.
- **Telemetría congelada fuera de pantalla.** Con el lienzo fuera de la vista el bucle se detiene (GRV-03) y la telemetría con él: se acepta, es coherente con la pausa por `IntersectionObserver`. Por debajo de 900 px la telemetría va visualmente justo bajo el visor, de modo que al desplazarse hasta ella el lienzo sigue a la vista; los controles, que van debajo, pueden dejarlo fuera. El criterio 32 lo cubre y salda la prueba pendiente de `IntersectionObserver` de GRV-03.
- **Lectores de pantalla y el deslizador.** Con el deslizador de posición enfocado y la escena en marcha no se escriben su `value` ni su `aria-valuetext`, así que no se anuncian cambios; tocarlo pausa la reproducción.
- **Fps de SwiftShader.** Distinguir una telemetría a 10 Hz de una por fotograma exige muchos fotogramas por segundo; medido el 28/10 (4 núcleos y con `taskset` a 1 núcleo): 47–60 fps con el lienzo grande, así que los criterios 30 y 32 exigen al menos 20. Un runner de CI más lento podría no llegar: en ese caso se ajustan las tolerancias, no se desactivan los tests.
- **Sin JavaScript.** Los enlaces de la galería y el HTML del detalle funcionan; el selector de orden no (los radios se pintan pero no actúan).
- **Orden de efectos de Next.** Foco y centrado de la miniatura se aplican tras el desplazamiento propio de Next, en un `requestAnimationFrame` desde un efecto de montaje de la isla, y solo si la llegada trae `#galeria` o es un `popstate`. Si una versión futura cambia ese orden o esas señales, los criterios 19, 20 y 36 lo detectan.
- **Sin prueba directa de renders.** No hay una forma estable de contar renders de React por fotograma desde Playwright. Se acota con la separación entre `data-fotogramas` y `data-actualizaciones` (criterio 30) y con la revisión del PR: `alFotograma` no debe llamar a ningún `set` de estado.
- **Reanudación por órbita.** Es una propuesta (ver decisiones). Es estado de sesión: no sobrevive a una recarga.
- **Anterior y siguiente en orden de catálogo.** No siguen el orden elegido en la galería, para que el HTML del detalle sea estático.
- **`/orbitas` da 404.** Es consistente con la decisión de no tener ruta índice; el 404 ofrece el enlace a la galería.
- **Icono.** No se añade `favicon.ico`: los navegadores sin soporte de icono SVG pedirán `/favicon.ico` y recibirán 404, inofensivo; el resto, no.
- **`URL_SITIO`.** Se lee al compilar. Sin él, el canonical y el sitemap apuntan a `http://localhost:3000` (o al host de producción de Vercel, si existe `VERCEL_PROJECT_PRODUCTION_URL`). En Docker debe pasarse como `ARG` de la etapa de build, o las páginas estáticas quedarían con el valor por defecto (GRV-07).
- **Sin Cache Components.** Next podría conservar el estado de React de una ruta con `<Activity>`, pero es incompatible con `dynamicParams`; el estado compartido va en el almacén.
- **WebGL por software.** La prueba de 12 vueltas crea 24 escenas con SwiftShader; es lenta y puede fallar un intento aislado en el CI (hay un reintento configurado). La prueba local del paso 3 (28/10) no encontró fugas ni fps insuficientes; si el CI de la PR las encontrara, se ajustan tolerancias y solo si la limpieza o los fps lo exigen el ticket se parte en GRV-04a y GRV-04b.
- **Los atributos `data-*`, los nombres accesibles y los textos fijados arriba** son contrato de las pruebas.
