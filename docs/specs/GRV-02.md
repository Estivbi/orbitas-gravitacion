# GRV-02 · Motor de física y catálogo

**Estado:** borrador, pendiente de aprobación · **Tamaño:** L · **Rama:** `feature/motor-de-fisica` → `develop`

## Contexto

El núcleo del dominio: integrar las seis órbitas con precisión controlada y servirlas a la interfaz sin bloquear el hilo principal. Lo consumen la escena 3D (GRV-03), la galería y el detalle (GRV-04) y el tutor (GRV-05). Es TypeScript puro, sin React ni DOM, y se prueba en Node.

## Alcance

1. **Convención de estado.** Masas 1, G = 1. Un estado es un `Float64Array` de 12 valores: posiciones `x1, y1, x2, y2, x3, y3` y velocidades `vx1, vy1, vx2, vy2, vx3, vy3`.
2. **Integrador.** RK4 con duplicación de paso (tolerancia 1e-10) que integra exactamente un periodo y devuelve una **trayectoria**: los nodos son los pasos aceptados.
3. **Interpolación.** Hermite cúbico entre nodos (`estadoEn`) y remuestreo uniforme (`muestrear`) para estelas y miniaturas.
4. **Métricas.** Energía, momento total, distancia mínima y velocidad máxima de un estado.
5. **Catálogo** de las seis órbitas, con periodo, estado inicial, descripción y crédito.
6. **Web Worker** que calcula una órbita bajo petición, con protocolo tipado y cliente.
7. **Contraste con la literatura** y límites, recogidos en el ADR 0002.

## Fuera de alcance

Escena 3D y estelas (GRV-03). Miniaturas SVG, telemetría en pantalla y rutas (GRV-04). Buscador de órbitas propias. Integrar más de un periodo. Corrección del error de cierre.

## Desviación respecto al brief (a aprobar)

El brief proponía 720 muestras uniformes por periodo con interpolación lineal. Medido contra una integración de referencia (tolerancia 1e-13), el error máximo de posición entre muestras es:

| Órbita | Distancia mínima | 720 uniformes + lineal | 2880 uniformes + Hermite | Pasos adaptativos + Hermite |
|---|---|---|---|---|
| Lagrange | 1,732 | 9,5e-6 | 1,9e-13 | 5,7e-11 |
| Figura de ocho | 0,690 | 2,1e-5 | 8,8e-12 | 2,2e-9 |
| Butterfly I | 0,025 | 1,3e-2 | 8,2e-4 | 7,7e-8 |
| Goggles | 0,020 | 2,2e-2 | 7,0e-4 | 2,2e-7 |
| Moth I | 0,087 | 6,8e-3 | 4,3e-6 | 2,3e-8 |
| Yin-Yang I | 0,091 | 4,2e-2 | 2,7e-3 | 2,2e-7 |

En los encuentros cercanos (distancia mínima de 0,02) el error de la rejilla uniforme es del mismo orden que la propia distancia: la telemetría de «distancia mínima» sería falsa y el cuerpo recortaría la curva. Con los pasos adaptativos como nodos y Hermite el error baja a menos de 3e-7 en las seis, con 700 a 9000 nodos por órbita (hasta ≈1 MB). **Propuesta:** adoptar esta variante. Coste: la trayectoria no es una rejilla uniforme, así que se busca el intervalo por bisección y las estelas usan `muestrear`.

## Decisiones propuestas

| Tema | Propuesta | Razón y coste |
|---|---|---|
| Estado | `Float64Array` plano de 12 valores y accesores `posicion(estado, i)` | Se transfiere al Worker sin copiar y evita objetos por frame. Menos legible que objetos |
| Paso | Máximo `T/720`, tolerancia 1e-10, incremento limitado a ×2 y reducción a ×0,3 | Garantiza al menos 720 nodos y no se salta un encuentro. Más pasos en las órbitas difíciles |
| Un periodo | Se integra exactamente de 0 a T. El estado final difiere del inicial por el error de cierre | El bucle de reproducción envuelve `u` módulo 1. Las órbitas no estables se desvían si se integran más periodos |
| `estadoEn(u)` | `u` se envuelve módulo 1 (`u = 1` equivale a `0`) | La reproducción en bucle no necesita casos especiales |
| Errores | Tolerancia ≤ 0, cuerpos coincidentes, estado no finito o más de 2 000 000 de pasos lanzan un error con mensaje claro | Evita bucles infinitos y resultados con `NaN` |
| Determinismo | Sin aleatoriedad ni reloj; mismos datos, mismos bits | Permite tests exactos y miniaturas reproducibles |
| Dependencias | Ninguna | La validación de mensajes del Worker se hace a mano; zod llega con el tutor (GRV-05) |

## Datos del catálogo

Posiciones iniciales (salvo Lagrange): `x1 = (−1, 0)`, `x2 = (1, 0)`, `x3 = (0, 0)`. Velocidades: `v1 = v2 = (vx, vy)`, `v3 = (−2vx, −2vy)`. Lagrange: tres cuerpos sobre una circunferencia de radio 1 a 90°, 210° y 330°, con velocidad tangencial de módulo `ω = 3^(−1/4)` y `T = 2π/ω`.

| Slug | Nombre | vx | vy | T | E | Cierre medido |
|---|---|---|---|---|---|---|
| `lagrange` | Lagrange | — | — | 8,26894… | −0,86603 | 5,4e-11 |
| `figura-de-ocho` | Figura de ocho | 0,347111 | 0,532728 | 6,32591398 | −1,28715 | 2,5e-5 |
| `butterfly-i` | Butterfly I | 0,30689 | 0,12551 | 6,2356 | −2,1702 | 1,2e-3 |
| `goggles` | Goggles | 0,08330 | 0,12789 | 10,4668 | −2,4301 | 2,4e-3 |
| `moth-i` | Moth I | 0,46444 | 0,39606 | 14,8939 | −1,3823 | 2,3e-4 |
| `yin-yang-i` | Yin-Yang I (variante Ia) | 0,51394 | 0,30474 | 17,3284 | −1,4290 | 8,6e-4 |

«Cierre medido» es el mayor desacuerdo entre el estado inicial y el estado tras T (posiciones y velocidades), obtenido con un integrador independiente escrito para esta spec. Es consistente con valores publicados con cinco cifras.

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
  estadoInicial: Readonly<Estado>;
  descripcion: string;
  credito: string;
}

export interface Trayectoria {
  periodo: number;
  tiempos: Float64Array; // nodos, de 0 a periodo
  estados: Float64Array; // 12 valores por nodo
  radioMaximo: number;   // mayor distancia al origen, mínimo 1
}

export const ORBITAS: readonly Orbita[];
export function obtenerOrbita(slug: string): Orbita | undefined;
export function integrarPeriodo(
  orbita: Pick<Orbita, 'periodo' | 'estadoInicial'>,
  opciones?: { tolerancia?: number; pasoMaximo?: number },
): Trayectoria;
export function estadoEn(t: Trayectoria, u: number, salida?: Estado): Estado;
export function muestrear(t: Trayectoria, n: number): Float64Array; // (n + 1) estados equiespaciados
export function energia(e: Estado): number;
export function metricas(e: Estado): { energia: number; momento: number; distanciaMinima: number; velocidadMaxima: number };
```

```ts
// src/workers/protocolo.ts
export type Peticion = { tipo: 'calcular'; id: number; slug: Slug };
export type Respuesta =
  | { tipo: 'resultado'; id: number; slug: Slug; trayectoria: Trayectoria }
  | { tipo: 'error'; id: number; mensaje: string };
export function manejarPeticion(peticion: unknown): Respuesta; // pura, no lanza
// src/workers/fisica.worker.ts: recibe Peticion, responde Respuesta con los buffers transferidos
// src/workers/clienteFisica.ts: calcularTrayectoria(slug: Slug): Promise<Trayectoria>
```

## Criterios de aceptación

Cada uno tiene su prueba, en `tests/unit/fisica/` y `tests/repo/`.

1. **Catálogo completo.** Dado el catálogo, cuando se listan sus slugs, entonces son exactamente los seis de la tabla, en ese orden, con nombre, descripción y crédito no vacíos y periodo mayor que 0; y `obtenerOrbita('no-existe')` devuelve `undefined`.
2. **Convención de estado.** Dadas las cinco órbitas con parámetros, cuando se lee su estado inicial, entonces las posiciones son (−1, 0), (1, 0), (0, 0) y las velocidades `(vx, vy)`, `(vx, vy)`, `(−2vx, −2vy)`; y en Lagrange los cuerpos están a radio 1 en 90°, 210° y 330° con velocidad tangencial de módulo `3^(−1/4)` y periodo `2π · 3^(1/4)`.
3. **Datos publicados.** Dado el catálogo, cuando se leen periodo y velocidades, entonces coinciden exactamente con la tabla de datos de esta spec.
4. **Momento total.** Dada cada órbita, cuando se integra un periodo, entonces `|P| ≤ 1e-12` en todos los nodos.
5. **Energía.** Dada cada órbita, cuando se integra un periodo, entonces `|E(t) − E(0)| ≤ 1e-6` en todos los nodos, y `E(0)` coincide con la tabla con tolerancia 1e-4 (en Lagrange, con `−√3/2` con tolerancia 1e-12).
6. **Cierre.** Dada cada órbita, cuando se integra un periodo, entonces el estado final (posiciones y velocidades) difiere del inicial menos que la tolerancia por órbita: Lagrange 1e-9, figura de ocho 1e-4, Butterfly I 3e-3, Goggles 5e-3, Moth I 1e-3, Yin-Yang I 3e-3. Las tolerancias son entre 2 y 4 veces lo medido. No se ajustan para que pase una prueba: si una órbita no cierra, se documenta como límite.
7. **Determinismo.** Dadas dos integraciones de la misma órbita, también en orden distinto, entonces los `Float64Array` resultantes son idénticos bit a bit.
8. **Interpolación.** Dada cada trayectoria, cuando se evalúa `estadoEn` en un nodo, entonces devuelve exactamente ese nodo; y evaluada en 7200 instantes equiespaciados, la posición difiere menos de 1e-6 de una integración de referencia con tolerancia 1e-13.
9. **Envoltura y muestreo.** Dado `estadoEn`, cuando `u` es `1,25`, `−0,75` o `1`, entonces equivale a `0,25`, `0,25` y `0`; y `muestrear(t, 720)` devuelve 721 estados equiespaciados que coinciden con `estadoEn` en cada instante.
10. **Métricas.** Dado Lagrange, cuando se calculan sus métricas, entonces la distancia mínima es `√3` y el momento 0 en todo instante; dada la figura de ocho, la energía es −1,28715 con tolerancia 1e-4; y `velocidadMaxima` y `distanciaMinima` coinciden con un cálculo directo sobre todos los nodos.
11. **Contraste con la literatura.** Dado el estado publicado para la figura de ocho por Chenciner y Montgomery (a partir de los cálculos de Simó): posiciones `±(0,97000436, −0,24308753)` y `0`, velocidad del tercer cuerpo `(−0,93240737, −0,86473146)` y las otras dos `−v3/2`, con `T = 6,32591398`, cuando se calcula su energía y se integra un periodo, entonces la energía coincide con la del catálogo con tolerancia 1e-5 y el estado vuelve al inicial con tolerancia 1e-5.
12. **Errores.** Dadas entradas inválidas, cuando se integra, entonces una tolerancia ≤ 0, un estado con `NaN` o dos cuerpos en la misma posición lanzan un error con un mensaje que explica la causa, y un tope de pasos excedido lanza `La integración no converge`.
13. **Protocolo del Worker.** Dada la función pura `manejarPeticion`, cuando recibe `{ tipo: 'calcular', id: 7, slug: 'figura-de-ocho' }`, entonces devuelve `resultado` con `id` 7 y una trayectoria igual a `integrarPeriodo` del catálogo; y ante peticiones mal formadas (sin `id`, tipo desconocido, slug que no es una cadena o que no existe) devuelve `error` con mensaje claro y no lanza.
14. **Aislamiento.** Dado el código de `src/lib/`, cuando se leen sus imports y sus globales, entonces no usa `react`, `next`, `three`, `window`, `document` ni `Worker`; y el módulo del Worker solo importa de `@/lib/fisica` y de `./protocolo`. *(Vitest sobre el código fuente)*
15. **Coste razonable.** Dadas las seis órbitas, cuando se integran en Node, entonces cada una usa menos de 20 000 nodos y el total tarda menos de 3 s. *(cota holgada para detectar regresiones, no una medida de rendimiento)*

El Worker en un navegador real no se prueba en este ticket (no hay página que lo use). Antes de abrir el PR se comprueba a mano con una página desechable y Playwright que el build lo empaqueta y responde, y queda anotado en el documento del ticket. La prueba permanente llega con la primera página que lo use (GRV-04).

## Orden de trabajo

1. `docs`: esta spec.
2. `test`: criterios 1 a 15 en rojo, más la aprobación de la spec.
3. `feat`: integrador, interpolación, métricas, catálogo y Worker hasta pasar todo.
4. `docs`: ADR 0002 (contraste, desviación y límites), documento del ticket y estado.
5. Revisión y enlace para abrir el PR.

Se mantienen los commits al mínimo útil: cuatro, uno por paso.

## Traspasos tras la aprobación

`backend` (`src/lib/fisica/`, `src/workers/`), `documentacion` (ADR 0002, ticket, estado), `pr-reviewer` (revisión).

## Riesgos y límites

- **Contraste con la fuente original.** Solo la figura de ocho se ha contrastado con valores publicados (criterio 11) y Lagrange es analítico. Los datos de Butterfly I, Goggles, Moth I y Yin-Yang I (Šuvakov y Dmitrašinović, *Phys. Rev. Lett.* 110, 114301) quedan pendientes de cotejar con la tabla del artículo, porque el entorno no puede acceder a arXiv. Se documenta tal cual en el ADR 0002 hasta que se compruebe.
- **Inestabilidad.** Las órbitas distintas de Lagrange y la figura de ocho son inestables: Li y Liao (arXiv:1312.6796) comprobaron que varias de las halladas por Šuvakov y Dmitrašinović se alejan de la periodicidad con el tiempo. Por eso se integra un solo periodo y se reproduce en bucle.
- **Salto al cerrar el bucle.** Tras T el estado difiere del inicial hasta 2,4e-3 (Goggles). Es menor que un píxel en pantalla, pero existe.
- **Worker.** Empaquetarlo con `new Worker(new URL(...))` en Next 16 se verifica a mano en este ticket y de forma permanente en GRV-04.
