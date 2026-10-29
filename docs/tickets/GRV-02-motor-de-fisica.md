# GRV-02 · Motor de física y catálogo

Qué se construyó, cómo replicarlo y qué se aprendió. Spec: `docs/specs/GRV-02.md`. Decisiones: `docs/adr/0002-integrador-y-trayectoria.md`, `docs/adr/0003-un-periodo-con-bucle.md` y `docs/adr/0004-datos-del-catalogo-y-fuentes.md`.

## Qué se construyó

En `src/lib/fisica/`, TypeScript puro sin React ni DOM:

- **`integrador.ts`:** `integrarPeriodo`, Runge–Kutta de cuarto orden con duplicación de paso (tolerancia 1e-10) que integra exactamente un periodo y devuelve una trayectoria cuyos nodos son los pasos aceptados.
- **`interpolacion.ts`:** `estadoEn` (Hermite cúbico para posiciones y velocidades, con la fracción del periodo envuelta módulo 1), `indiceEn` y `muestrear`.
- **`metricas.ts`:** energía, momento lineal y angular, distancia mínima y velocidad máxima.
- **`catalogo.ts`:** las seis órbitas, con periodo, estado inicial congelado, descripción y crédito.
- **`fuerzas.ts` y `tipos.ts`:** la atracción newtoniana y los tipos compartidos.

En `src/workers/`:

- **`protocolo.ts`:** `manejarPeticion`, función pura que valida una petición y calcula la órbita pedida sin lanzar nunca.
- **`fisica.worker.ts`:** el Web Worker, que transfiere los dos buffers de la trayectoria en lugar de copiarlos.
- **`clienteFisica.ts`:** `crearClienteFisica` y el cliente real `calcularTrayectoria`, con el Worker creado en la primera petición y una caché de promesas por órbita.

Además, reglas de ESLint que aíslan `src/lib/` y el Worker, y `scripts/medir-fisica.mjs` (`npm run medir:fisica`), una reimplementación separada que reproduce las tablas de los ADR.

## Cómo replicarlo

1. Escribir la spec y contrastar los datos con sus fuentes antes de aprobarla.
2. Medir antes de decidir: un script aparte mostró que la rejilla uniforme con interpolación lineal fallaba en los encuentros cercanos.
3. Escribir los tests desde los criterios, con fórmulas propias para energía y momentos, sin usar las métricas de la librería.
4. Implementar el integrador, la interpolación, las métricas y el catálogo hasta pasar los tests.
5. Añadir el Worker y comprobar, con una página desechable, que Next lo empaqueta y funciona en un navegador real.

## Decisiones y desvíos respecto al planteamiento inicial

- **Nodos adaptativos con Hermite** en lugar de 720 muestras uniformes con interpolación lineal (ADR 0002).
- **Figura de ocho con los valores de Chenciner y Montgomery**, que cierran 200 veces mejor que los redondeados (ADR 0004).
- **Periodo de Lagrange 8,269137.** Una tabla recibida traía 8,2689; el catálogo lo calcula con la fórmula.
- **Estabilidad matizada.** La spec decía que las cuatro órbitas numéricas eran inestables. El artículo original esperaba que fueran estables o marginalmente inestables, así que solo se afirma que Lagrange es inestable y que la figura de ocho es estable.
- **Dos tolerancias de la spec se corrigieron al implementar**, con su razón:
  - En los nodos, la velocidad coincide con una tolerancia de 1e-9 y no de 1e-12: `u·T` no recupera `tiempos[i]` exactamente (error de ~1e-15) y en los encuentros la velocidad cambia hasta ~10⁴ por unidad de tiempo. La posición sí coincide a 1,5e-14.
  - Los extremos de Lagrange son valores integrados, con 2e-11 de diferencia respecto a los analíticos, así que la tolerancia es 1e-9.
- **Recorte del criterio de aislamiento.** La spec tenía un test dedicado para las reglas de ESLint. La persona responsable del proyecto aprobó expresamente quitarlo para acotar el alcance. Las reglas quedan en `eslint.config.mjs` y las vigila el lint del CI.
- **Reglas de aislamiento endurecidas tras la revisión.** La primera versión usaba una lista de prohibiciones y tenía huecos (alias de la aplicación, más globales del navegador, `import()` dinámico, y no cubría el protocolo ni el cliente). Una revisión mostró que una `regex` con _lookahead_ negativo permite una lista blanca de verdad, que es lo que usan ahora el Worker, su protocolo y su cliente. Se comprobaron a mano 41 casos, sin test dedicado.
- **Revisión independiente del código.** Encontró y se corrigió: un Worker que fallaba seguía en uso aunque ya no respondía (ahora se descarta y se crea otro), una petición que quedaba pendiente si no se podía crear el Worker, una envoltura de `u` que daba el final del periodo para valores negativos minúsculos y una salida de tamaño incorrecto aceptada sin aviso. Y varias pruebas que no habrían detectado un fallo: se añadieron para el tope de intentos, la tolerancia, los bordes del índice y los fallos del cliente. Esas correcciones se hicieron en un commit aparte del código original, con sus pruebas.
- **Tolerancias cambiadas en el mismo commit que el código.** Las dos tolerancias de la spec que se corrigieron (velocidad en los nodos y extremos de Lagrange) se cambiaron al implementar, no antes. Es lo que el método intenta evitar; queda dicho aquí con la razón.
- **Revisión independiente de la spec.** Detectó cuatro errores de la primera versión (el periodo de Lagrange, la estabilidad, un bucle infinito posible con valores no finitos y un criterio imposible de cumplir con exactitud) y varios criterios que faltaban. Todos se incorporaron.

## Verificación

| Criterio                           | Prueba                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| 1 Catálogo                         | `tests/unit/fisica/catalogo.test.ts`                                             |
| 2 Convención de estado             | `tests/unit/fisica/catalogo.test.ts`                                             |
| 3 Datos de la tabla                | `tests/unit/fisica/catalogo.test.ts`                                             |
| 4 Momento lineal                   | `tests/unit/fisica/conservacion.test.ts`                                         |
| 5 Energía                          | `tests/unit/fisica/conservacion.test.ts`                                         |
| 6 Momento angular                  | `tests/unit/fisica/conservacion.test.ts`                                         |
| 7 Cierre                           | `tests/unit/fisica/conservacion.test.ts`                                         |
| 8 Determinismo                     | `tests/unit/fisica/conservacion.test.ts`                                         |
| 9 Estructura de la trayectoria     | `tests/unit/fisica/trayectoria.test.ts`                                          |
| 10 Interpolación                   | `tests/unit/fisica/interpolacion.test.ts`                                        |
| 11 Envoltura, muestreo e índice    | `tests/unit/fisica/interpolacion.test.ts`                                        |
| 12 Métricas                        | `tests/unit/fisica/metricas.test.ts`                                             |
| 13 Extremos de la trayectoria      | `tests/unit/fisica/metricas.test.ts`                                             |
| 14 Contraste con la literatura     | `tests/unit/fisica/literatura.test.ts`                                           |
| 15 Entradas inválidas              | `tests/unit/fisica/errores.test.ts`                                              |
| 16 Protocolo del Worker            | `tests/unit/workers/protocolo.test.ts`                                           |
| 17 Cliente del Worker              | `tests/unit/workers/clienteFisica.test.ts`                                       |
| 18 Coste razonable                 | `tests/unit/fisica/trayectoria.test.ts`                                          |
| 19 La tolerancia gobierna el error | `tests/unit/fisica/tolerancia.test.ts`                                           |
| Bordes (11 y 15)                   | `tests/unit/fisica/bordes.test.ts`, `tests/unit/workers/protocoloFallos.test.ts` |

Las pruebas de física calculan la energía y los momentos con fórmulas propias, independientes de la librería.

### El Worker en un navegador real

Con una página desechable (no se versiona) y Chromium se comprobó que Next 16 con Turbopack empaqueta el Worker (`turbopack-worker-*.js`), que el prerenderizado no lo instancia en el servidor, y que devuelve la figura de ocho con 733 nodos y 70 368 bytes de estados (733 · 12 · 8) en unos 0,5 s contando la carga de la página. La caché devuelve la misma promesa en la segunda petición. La prueba permanente llegará con la primera página que use el Worker (GRV-04).

## Qué se aprendió

- **Medir antes de decidir.** Las distancias mínimas que salían de la rejilla uniforme (0,025 y 0,091) eran falsas; las reales son 0,011 y 0,013. Sin una reimplementación aparte con la que comparar no se habría visto.
- **Cuidado con las tolerancias escritas sin medir.** Dos de la spec eran irreales y solo se vio al ejecutar.
- **Los datos «conocidos» conviene contrastarlos.** El valor redondeado de la figura de ocho difería en la sexta cifra del publicado.
- **Una regla de ESLint hay que probarla aunque no tenga test.** La primera versión de la regla del Worker bloqueaba también lo permitido, y afirmé que una lista blanca era imposible sin haber probado todas las opciones: no lo era.
- **Un umbral de aceptación casi nunca se activa.** Cambiar `error <= tolerancia` por `error <= 1000 · tolerancia` apenas altera el resultado, porque el controlador del paso mantiene el error cerca de la tolerancia. El código a vigilar es el factor de control, y para eso sirve la prueba de la tolerancia.

## Límites

- **Contraste con las fuentes.** Los valores de Chenciner y Montgomery se verificaron contra el PDF del artículo (Figura 1) y los de las cuatro órbitas numéricas contra la Tabla I de Šuvakov y Dmitrašinović. No se consultó el artículo de Moore (1993). La cita de Li y Liao no se ha cotejado con el original.
- **Un solo periodo.** El salto al cerrar el bucle llega a 2,4e-3 en velocidad en Goggles (ADR 0003).
- **Extremos de la trayectoria.** `distanciaMinima` y `velocidadMaxima` se calculan sobre los nodos y son una cota, con un error pequeño.
- **El Worker aún no tiene una prueba E2E permanente**, y la transferencia de sus buffers (`fisica.worker.ts`) no tiene ninguna prueba automática. El `npm run build` del repositorio no lo ejercita hasta que una página use el cliente (GRV-04).
- **`medir:fisica` comparte el algoritmo** con la librería: detecta errores de implementación, no de diseño del control de paso.
- **Trayectoria compartida.** El cliente entrega el mismo objeto a todos los llamadores; no se congela ni se copia, y no debe modificarse.
- **Determinismo.** Mismos bits en el mismo motor de JavaScript, no entre motores distintos.
