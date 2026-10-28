# GRV-02 · Motor de física y catálogo

**Estado:** aprobada el 28 de octubre de 2026 · **Tamaño:** L · **Rama:** `feature/motor-de-fisica` → `develop`

## Contexto

El núcleo del dominio: integrar las seis órbitas con precisión controlada y servirlas a la interfaz sin bloquear el hilo principal. Lo consumen la escena 3D (GRV-03), la galería y el detalle (GRV-04) y el tutor (GRV-05). Es TypeScript puro, sin React ni DOM, y se prueba en Node.

## Alcance

1. **Convención de estado.** Masas 1, G = 1. Un estado es un `Float64Array` de 12 valores: posiciones `x1, y1, x2, y2, x3, y3` y velocidades `vx1, vy1, vx2, vy2, vx3, vy3`.
2. **Integrador.** RK4 con duplicación de paso (tolerancia 1e-10) que integra exactamente un periodo y devuelve una **trayectoria**: los nodos son los pasos aceptados.
3. **Interpolación.** Hermite cúbico entre nodos, para posiciones y velocidades (`estadoEn`), búsqueda de segmento (`indiceEn`) y remuestreo periódico (`muestrear`).
4. **Métricas.** Energía, momento lineal y angular, distancia mínima y velocidad máxima de un estado, y distancia mínima y velocidad máxima de una trayectoria.
5. **Catálogo** de las seis órbitas, con periodo, estado inicial, descripción y crédito.
6. **Web Worker** que calcula una órbita bajo petición, con protocolo tipado y cliente.
7. **Contraste con la literatura**, desviaciones y límites, recogidos en tres ADR (0002 a 0004) y en el documento del ticket.

## Fuera de alcance

Escena 3D y estelas (GRV-03). Miniaturas SVG, telemetría en pantalla y rutas (GRV-04). Buscador de órbitas propias. Integrar más de un periodo. Corrección del error de cierre.

## Desviaciones respecto al brief (a aprobar)

### 1. Nodos adaptativos con Hermite, en lugar de 720 muestras uniformes con interpolación lineal

Medido contra una integración de referencia de tolerancia 1e-13, el error máximo de posición entre muestras es:

| Órbita | 720 uniformes + lineal | 2880 uniformes + Hermite | Pasos adaptativos + Hermite |
|---|---|---|---|
| Lagrange | 9,5e-6 | 9,7e-13 | 5,6e-11 |
| Figura de ocho | 2,1e-5 | 2,6e-12 | 2,2e-9 |
| Butterfly I | 1,6e-2 | 8,1e-4 | 7,3e-8 |
| Goggles | 2,2e-2 | 7,0e-4 | 2,2e-7 |
| Moth I | 6,9e-3 | 4,2e-6 | 2,3e-8 |
| Yin-Yang I | 4,2e-2 | 2,5e-3 | 2,2e-7 |

Hay encuentros muy cercanos: la distancia mínima real es de 0,011 en Butterfly I y 0,013 en Yin-Yang I. Con la rejilla uniforme del brief una telemetría de «distancia mínima» habría mostrado 0,025 y 0,091 (hasta siete veces más), y el cuerpo recortaría la curva. Con los pasos del propio integrador como nodos y Hermite, el error baja de 3e-7 en las seis, con 724 a 9034 nodos por órbita (hasta ≈1 MB). Coste: la trayectoria no es una rejilla uniforme. El segmento se busca por bisección y las estelas recorren nodos (`indiceEn`) o usan `muestrear`.

### 2. Figura de ocho con los datos de Chenciner–Montgomery y Simó

El brief da `v = (0,347111; 0,532728)`. Los valores publicados por Chenciner y Montgomery (a partir de los cálculos de Simó) son `x1 = (0,97000436; −0,24308753)`, `x2 = −x1`, `x3 = 0`, `v3 = (−0,93240737; −0,86473146)`, `v1 = v2 = −v3/2`, con `T = 6,32591398`. Rotados a nuestra convención (`x1 = (−1, 0)`, `x2 = (1, 0)`) dan **`v = (0,34711689; 0,53272494)`**. Difieren del brief en 5,9e-6 y 3,1e-6, y el cierre mejora de 2,5e-5 a 1,1e-7. Se adoptan los segundos, derivados de una fuente publicada. La energía es la misma en ambos sistemas (−1,287142).

## Decisiones propuestas

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Estado de trabajo | `Float64Array` plano de 12 valores y accesores `posicion(estado, i)` | Sin objetos por frame, y se transfiere sin copiar de vuelta del Worker. Menos legible que objetos |
| Estado inicial del catálogo | `readonly number[]` congelado; `integrarPeriodo` lo copia a un `Float64Array` | Es serializable (props de servidor a cliente, herramientas del tutor) y no se puede mutar por error. Una copia al empezar |
| Un periodo | Se integra exactamente de 0 a T. El estado final difiere del inicial por el error de cierre | El bucle de reproducción envuelve `u` módulo 1. Las órbitas inestables se desvían si se integran más periodos |
| Determinismo | Sin aleatoriedad ni reloj; mismos datos dan los mismos bits **en el mismo motor de JavaScript**. Las fuerzas usan `Math.sqrt`, no `Math.hypot` | El estándar no obliga a redondeo correcto en `pow`, `hypot` ni `sin`/`cos`, así que Node y los navegadores pueden diferir en 1 ulp |
| Dependencias | Ninguna | La validación de mensajes del Worker se hace a mano; zod llega con el tutor (GRV-05) |

## Algoritmo del integrador

- **Estimador de error.** Un paso `h` da `yA`; dos pasos `h/2` dan `yB`. `err = máx sobre las 12 componentes de |yA − yB|`, absoluto y por paso. Se acepta el paso si `err ≤ tolerancia` y se conserva `yB` (sin extrapolación de Richardson, lo que deja un margen conservador).
- **Control del paso.** `h ← h · clamp(0,9 · (tol / máx(err, 1e-300))^(1/5), 0,3, 2)`, y después `h ← mín(h, pasoMaximo)`. Paso inicial `pasoMaximo / 8`. `pasoMaximo` por defecto es `T/720`.
- **Final exacto.** En el último paso `h = T − t`, y el último nodo se asigna con `tiempos[último] = periodo`.
- **Tolerancia.** Se rechazan tolerancias menores que 1e-14, que el redondeo hace inalcanzables.
- **Garantías de terminación.** El tope de `pasosMaximos` cuenta intentos (aceptados y rechazados). Un `err` o un `h` no finitos, o un paso que no avanza `t`, lanzan error. Por defecto `pasosMaximos = 200 000`.
- **Fuerzas.** Atracción newtoniana entre pares con `Math.sqrt(dx*dx + dy*dy)`.
- **Interpolación.** Hermite cúbico en posiciones, con las velocidades en los nodos como derivadas. Las velocidades también con Hermite cúbico, usando las aceleraciones recalculadas con la misma función de fuerzas en los dos extremos del segmento.

## Datos del catálogo

Posiciones iniciales (salvo Lagrange): `x1 = (−1, 0)`, `x2 = (1, 0)`, `x3 = (0, 0)`. Velocidades: `v1 = v2 = (vx, vy)`, `v3 = (−2vx, −2vy)`. Lagrange: tres cuerpos sobre una circunferencia de radio 1 a 90°, 210° y 330°, con velocidad tangencial de módulo `ω = 3^(−1/4)` y `T = 2π/ω = 2π · 3^(1/4) = 8,269137…`.

| Slug | Nombre | vx | vy | T | E |
|---|---|---|---|---|---|
| `lagrange` | Lagrange | — | — | 8,269137 | −0,866025 |
| `figura-de-ocho` | Figura de ocho | 0,34711689 | 0,53272494 | 6,32591398 | −1,287142 |
| `butterfly-i` | Butterfly I | 0,30689 | 0,12551 | 6,2356 | −2,170197 |
| `goggles` | Goggles | 0,08330 | 0,12789 | 10,4668 | −2,430116 |
| `moth-i` | Moth I | 0,46444 | 0,39606 | 14,8939 | −1,382296 |
| `yin-yang-i` | Yin-Yang I (variante Ia) | 0,51394 | 0,30474 | 17,3284 | −1,428998 |

Medidas con un integrador independiente (script `scripts/medir-fisica.mjs`, que se versiona), un periodo, tolerancia 1e-10:

| Slug | Cierre (posiciones y velocidades) | Máx. \|ΔE\| | Máx. \|ΔL\| | Distancia mínima | Velocidad máxima | Nodos |
|---|---|---|---|---|---|---|
| `lagrange` | 5,4e-11 | 2,4e-13 | 3,1e-13 | 1,7321 | 0,7598 | 724 |
| `figura-de-ocho` | 1,1e-7 | 6,6e-11 | 1,7e-11 | 0,6905 | 1,2717 | 733 |
| `butterfly-i` | 1,2e-3 | 1,5e-8 | 2,3e-12 | 0,0110 | 9,5503 | 5650 |
| `goggles` | 2,4e-3 | 1,4e-8 | 1,7e-11 | 0,0185 | 7,4894 | 9034 |
| `moth-i` | 2,3e-4 | 3,5e-9 | 2,3e-11 | 0,0794 | 3,5609 | 3202 |
| `yin-yang-i` | 8,6e-4 | 1,2e-8 | 3,8e-11 | 0,0133 | 8,7224 | 5396 |

El momento lineal total queda por debajo de 4,3e-14 en todas. El momento angular inicial es 0 en las cinco órbitas con parámetros y `3 · 3^(−1/4) = 2,279507` en Lagrange. Error de interpolación frente a la referencia: posición ≤ 2,2e-7 (Goggles y Yin-Yang I) y velocidad ≤ 1,1e-4 (Yin-Yang I).

## Contratos

```ts
// src/lib/fisica
export const SLUGS = ['lagrange', 'figura-de-ocho', 'butterfly-i', 'goggles', 'moth-i', 'yin-yang-i'] as const;
export type Slug = (typeof SLUGS)[number];

export type Estado = Float64Array; // 12 valores

export interface Orbita {
  slug: Slug;
  nombre: string;
  periodo: number;
  estadoInicial: readonly number[]; // 12 valores, congelado
  descripcion: string;
  credito: string;
}

export interface Trayectoria {
  periodo: number;
  tiempos: Float64Array; // nodos: 0 = tiempos[0] < … < tiempos[n - 1] = periodo
  estados: Float64Array; // 12 valores por nodo, con su propio ArrayBuffer
  radioMaximo: number; // mayor distancia al origen entre los nodos, mínimo 1
  distanciaMinima: number; // entre cuerpos, mínimo sobre los nodos (cota superior del mínimo real)
  velocidadMaxima: number; // módulo de velocidad máximo sobre los nodos (cota inferior del máximo real)
}

export const ORBITAS: readonly Orbita[];
export function obtenerOrbita(slug: string): Orbita | undefined;

export function integrarPeriodo(
  orbita: Pick<Orbita, 'periodo' | 'estadoInicial'>,
  opciones?: { tolerancia?: number; pasoMaximo?: number; pasosMaximos?: number },
): Trayectoria;

export function estadoEn(t: Trayectoria, u: number, salida?: Estado): Estado; // u se envuelve módulo 1
export function indiceEn(t: Trayectoria, u: number): number; // nodo izquierdo del segmento que contiene u
export function muestrear(t: Trayectoria, n: number): Float64Array; // n estados en u_k = k / n, k = 0 … n - 1

export function energia(e: Estado): number;
export function momentoAngular(e: Estado): number;
export function metricas(e: Estado): {
  energia: number;
  momentoLineal: number; // módulo del momento lineal total
  momentoAngular: number;
  distanciaMinima: number;
  velocidadMaxima: number;
};
```

```ts
// src/workers/protocolo.ts
export type Peticion = { tipo: 'calcular'; id: number; slug: Slug };
export type Respuesta =
  | { tipo: 'resultado'; id: number; slug: Slug; trayectoria: Trayectoria }
  | { tipo: 'error'; id: number | null; mensaje: string };
export function manejarPeticion(peticion: unknown): Respuesta; // pura, no lanza

// src/workers/fisica.worker.ts: sin caché; responde con postMessage(respuesta, { transfer: [tiempos.buffer, estados.buffer] })
// src/workers/clienteFisica.ts:
export function crearClienteFisica(fabrica: () => TrabajadorLike): { calcularTrayectoria(slug: Slug): Promise<Trayectoria> };
export const calcularTrayectoria: (slug: Slug) => Promise<Trayectoria>; // cliente real, Worker creado en la primera llamada
```

El Worker transfiere al hilo principal los dos `ArrayBuffer` de la trayectoria; `periodo`, `radioMaximo`, `distanciaMinima`, `velocidadMaxima`, `slug` e `id` se copian. Cada `Float64Array` tiene su propio buffer con `byteOffset` 0 y `byteLength` exacto. La caché de trayectorias vive en el cliente (`Map<Slug, Promise<Trayectoria>>`).

## Criterios de aceptación

Cada uno tiene su prueba, en `tests/unit/fisica/` y `tests/unit/workers/`.

El aislamiento de `src/lib/` (sin React, Next, three ni globales del navegador) y del Worker (solo importa `@/lib/fisica` y `./protocolo`) lo vigilan reglas de ESLint, `no-restricted-imports` y `no-restricted-globals`, que se añaden a `eslint.config.mjs`. Un criterio con test dedicado para esas reglas se recortó para acotar el alcance: las vigila el lint del CI.

1. **Catálogo completo.** Dado el catálogo, cuando se listan sus slugs, entonces son exactamente los seis de la tabla, en ese orden, con nombre, descripción y crédito no vacíos y periodo mayor que 0; `obtenerOrbita('no-existe')` devuelve `undefined`; y cada `estadoInicial` está congelado y sobrevive a `JSON.stringify` y `JSON.parse` como un array de 12 números.
2. **Convención de estado.** Dadas las cinco órbitas con parámetros, cuando se lee su estado inicial, entonces las posiciones son (−1, 0), (1, 0), (0, 0) y las velocidades `(vx, vy)`, `(vx, vy)`, `(−2vx, −2vy)`. En Lagrange, los cuerpos están a radio 1 en 90°, 210° y 330°, con velocidad tangencial de módulo `3^(−1/4)`, y el periodo vale `2π · 3^(1/4)` con tolerancia relativa 1e-15.
3. **Datos de la tabla.** Dado el catálogo, cuando se leen periodo y velocidades de las cinco órbitas con parámetros, entonces coinciden exactamente con la tabla de datos.
4. **Momento lineal.** Dada cada órbita, cuando se integra un periodo, entonces el módulo del momento lineal es ≤ 1e-12 en todos los nodos (medido ≤ 4,3e-14).
5. **Energía.** Dada cada órbita, cuando se integra un periodo, entonces `|E(t) − E(0)| ≤ 1e-6` en todos los nodos (medido ≤ 1,5e-8), y `E(0)` coincide con la tabla con tolerancia 1e-5; en Lagrange con `−√3/2` con tolerancia 1e-12.
6. **Momento angular.** Dada cada órbita, cuando se integra un periodo, entonces `L(0)` es 0 con tolerancia 1e-12 en las cinco con parámetros y `3 · 3^(−1/4)` con tolerancia 1e-12 en Lagrange, y `|L(t) − L(0)| ≤ 1e-9` en todos los nodos (medido ≤ 3,8e-11).
7. **Cierre.** Dada cada órbita, cuando se integra un periodo, entonces el estado final (posiciones y velocidades) difiere del inicial menos que la tolerancia por órbita: Lagrange 1e-9, figura de ocho 1e-6, Butterfly I 3e-3, Goggles 5e-3, Moth I 1e-3, Yin-Yang I 3e-3. Las tolerancias dejan margen sobre lo medido y no se ajustan para que pase una prueba: si una órbita no cierra, se documenta como límite.
8. **Determinismo.** Dadas dos integraciones de la misma órbita, también en orden distinto, entonces los `Float64Array` resultantes son idénticos bit a bit.
9. **Estructura de la trayectoria.** Dada cada trayectoria, entonces `tiempos[0] === 0`, el último tiempo es exactamente `periodo`, los tiempos son estrictamente crecientes, ningún intervalo supera `pasoMaximo` (con holgura relativa de 1e-12) y hay al menos 721 nodos con el `pasoMaximo` por defecto; `estados.length === 12 · tiempos.length`; el primer estado es el inicial bit a bit; `tiempos` y `estados` tienen buffers distintos de tamaño exacto; y el `estadoInicial` del catálogo no cambia tras integrar, interpolar y muestrear.
10. **Interpolación.** Dada cada trayectoria, cuando se llama a `estadoEn`, entonces con `u = 0` devuelve el estado inicial exactamente, en cada nodo, salvo el último (que por la envoltura equivale al primero), coincide con él con tolerancia absoluta 1e-12 en posición (medido ≤ 1,5e-14) y 1e-9 en velocidad (medido ≤ 1e-11: `u·T` no recupera `tiempos[i]` exactamente, y en los encuentros la velocidad cambia hasta ~10⁴ por unidad de tiempo), y devuelve la instancia `salida` cuando se la pasa. En 7200 instantes equiespaciados, frente a una referencia (`integrarPeriodo` con tolerancia 1e-12 y `pasoMaximo = T/7200`), la posición difiere menos de 1e-6 (medido ≤ 2,2e-7) y la velocidad menos de 5e-4 (medido ≤ 1,1e-4). Esta prueba comprueba la interpolación; la física la cubren los criterios 4 a 7 y 14.
11. **Envoltura, muestreo e índice.** Dado `estadoEn`, cuando `u` es `1,25`, `−0,75` o `1`, entonces equivale a `0,25`, `0,25` y `0`. `muestrear(t, n)` devuelve `n` estados en `u_k = k / n` que coinciden bit a bit con `estadoEn`. `indiceEn(t, u)` devuelve el índice `i` tal que `tiempos[i] ≤ u·T < tiempos[i + 1]`.
12. **Métricas.** Dado un estado construido a mano con tres cuerpos en (0, 0), (3, 0) y (0, 4) y velocidades conocidas, cuando se calculan sus métricas, entonces energía, momento lineal, momento angular, distancia mínima (3) y velocidad máxima coinciden con el valor calculado a mano. Dado Lagrange, la distancia mínima es `√3` y la energía `−√3/2` con tolerancia 1e-12.
13. **Extremos de la trayectoria.** Dada Lagrange, `distanciaMinima` es `√3` y `velocidadMaxima` es `3^(−1/4)` con tolerancia 1e-9 (son valores integrados con tolerancia 1e-10 por paso, no analíticos; medido ≤ 2e-11). Dadas las demás, difieren menos del 5 % de los obtenidos con una referencia muy fina (`integrarPeriodo` con tolerancia 1e-12 y `pasoMaximo = T/20000`).
14. **Contraste con la literatura.** Dado el estado de la figura de ocho de Chenciner y Montgomery (a partir de los cálculos de Simó) rotado a la convención del catálogo, cuando se compara con el catálogo, entonces coincide con tolerancia 5e-8; su energía coincide con la del catálogo con tolerancia 1e-6; y integrado un periodo vuelve al inicio con tolerancia 1e-6.
15. **Entradas inválidas.** Cuando se integra con una tolerancia menor que 1e-14, un periodo ≤ 0 o no finito, un `pasoMaximo` ≤ 0 o no finito, un estado inicial que no tiene 12 valores o contiene `NaN`, o dos cuerpos en la misma posición, entonces se lanza un error cuyo mensaje explica la causa. Con `pasosMaximos` pequeño se lanza `La integración no converge`. Con dos cuerpos a 1e-9 de distancia no hay bucle infinito. `muestrear` con `n` no entero o menor que 1, y `estadoEn` con `u` no finito, también lanzan un error claro.
16. **Protocolo del Worker.** Dada la función pura `manejarPeticion`, cuando recibe `{ tipo: 'calcular', id: 7, slug: 'figura-de-ocho' }`, entonces devuelve `resultado` con `id` 7 y una trayectoria igual a la de `integrarPeriodo` del catálogo, con buffers propios de tamaño exacto. Ante peticiones mal formadas (sin `id`, tipo desconocido, slug que no es una cadena o que no existe) devuelve `error` con mensaje claro, `id` si se conoce y `null` si no, y no lanza.
17. **Cliente del Worker.** Dado `crearClienteFisica` con un Worker simulado, cuando se piden varias trayectorias a la vez, entonces cada promesa se resuelve con la suya (correlación por `id`); una respuesta de error rechaza la promesa con su mensaje; un evento `error` del Worker rechaza las pendientes; el Worker no se crea hasta la primera llamada; y una segunda petición del mismo slug reutiliza la promesa sin enviar otro mensaje.
18. **Coste razonable.** Dadas las seis órbitas, cuando se integran en Node, entonces cada una usa menos de 20 000 nodos y el total tarda menos de 3 s. *(cota holgada para detectar regresiones, no una medida de rendimiento)*

El Worker en un navegador real no se prueba de forma permanente en este ticket (no hay página que lo use). Al empezar la fase de código se prueba con una página desechable y Playwright que Next 16 lo empaqueta y responde, para detectar pronto un fallo de diseño. El resultado queda en el documento del ticket y la prueba permanente llega con la primera página que lo use (GRV-04).

## Orden de trabajo

1. `docs`: la spec (hecho) y sus correcciones tras la revisión.
2. `test`: criterios 1 a 18 en rojo (el 18 de la numeración original, el aislamiento, se recortó después). Este commit también marca la spec como aprobada.
3. `feat`: integrador, interpolación, métricas, catálogo, Worker y cliente hasta pasar todo, más el script `scripts/medir-fisica.mjs` y las reglas de ESLint. Antes de nada, la comprobación desechable del Worker.
4. `docs`: ADR 0002 (integrador y representación), 0003 (un periodo con envoltura) y 0004 (datos y fuentes), documento del ticket y estado.
5. Revisión y enlace para abrir el PR.

Cuatro commits más el de la spec, uno por paso.

## Traspasos tras la aprobación

`backend` (`src/lib/fisica/`, `src/workers/`, `scripts/medir-fisica.mjs`), `devops` (reglas de ESLint, `scripts/` pasa a su ámbito), `documentacion` (ADR 0002 y 0003, ticket, estado), `pr-reviewer` (revisión).

## Riesgos y límites

- **Contraste con las fuentes.** Butterfly I, Goggles, Moth I y Yin-Yang I (variante a) coinciden en velocidades y periodo con la Tabla I de Šuvakov y Dmitrašinović, *Phys. Rev. Lett.* 110, 114301 (2013), verificada contra el PDF del artículo. Las dos variantes de Yin-Yang I del artículo (a y b) son la misma órbita a distinta escala de espacio y de tiempo; se usa la a. La figura de ocho no está en esa tabla: se contrasta con los valores de Chenciner y Montgomery (criterio 14). Lagrange es analítico.
- **Estabilidad.** Solo la figura de ocho es linealmente estable. La solución equilátera de Lagrange con masas iguales es inestable (criterio de Routh), y si cierra bien es porque sus datos son exactos. De las cuatro numéricas, el artículo original esperaba que fueran estables o marginalmente inestables, y Li y Liao (arXiv:1312.6796) afirman que varias de las órbitas del artículo se alejan de la periodicidad con el tiempo. No se ha determinado cuáles, y esa cita está pendiente de cotejar. Por eso se integra un solo periodo y se reproduce en bucle.
- **Salto al cerrar el bucle.** Tras T el estado difiere del inicial hasta 2,4e-3 en velocidad (Goggles). En posición es menor que un píxel, pero existe.
- **Extremos de la trayectoria.** `distanciaMinima` y `velocidadMaxima` se calculan sobre los nodos: la primera es una cota superior del mínimo real y la segunda una cota inferior del máximo real, con error pequeño porque los nodos son densos en los encuentros.
- **Garantías.** El paso máximo `T/720` asegura al menos 721 nodos; que no se salte un encuentro lo asegura el control del error, no el paso máximo.
- **Worker.** Empaquetarlo con `new Worker(new URL(...))` en Next 16 se verifica al empezar la fase de código y de forma permanente en GRV-04.
