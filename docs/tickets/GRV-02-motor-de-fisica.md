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

Además, reglas de ESLint que aíslan `src/lib/` y el Worker, y `scripts/medir-fisica.mjs` (`npm run medir:fisica`), una medición independiente que reproduce las tablas de los ADR.

## Cómo replicarlo

1. Escribir la spec y contrastar los datos con sus fuentes antes de aprobarla.
2. Medir antes de decidir: un script independiente mostró que la rejilla uniforme con interpolación lineal fallaba en los encuentros cercanos.
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
- **Recorte del criterio de aislamiento.** La spec tenía un test dedicado para las reglas de ESLint. Se recortó para acotar el alcance. Las reglas quedan en `eslint.config.mjs`, las vigila el lint del CI y se comprobaron a mano con once casos.
- **Lista blanca de importaciones imposible.** Los patrones de `no-restricted-imports` no admitían una lista blanca fiable para el Worker (bloqueaban incluso `@/lib/fisica`), así que se prohíbe una lista explícita de lo que podría colarse.
- **Revisión independiente de la spec.** Detectó cuatro errores de la primera versión (el periodo de Lagrange, la estabilidad, un bucle infinito posible con valores no finitos y un criterio imposible de cumplir con exactitud) y varios criterios que faltaban. Todos se incorporaron.

## Verificación

| Criterio | Prueba |
|---|---|
| 1 Catálogo | `tests/unit/fisica/catalogo.test.ts` |
| 2 Convención de estado | `tests/unit/fisica/catalogo.test.ts` |
| 3 Datos de la tabla | `tests/unit/fisica/catalogo.test.ts` |
| 4 Momento lineal | `tests/unit/fisica/conservacion.test.ts` |
| 5 Energía | `tests/unit/fisica/conservacion.test.ts` |
| 6 Momento angular | `tests/unit/fisica/conservacion.test.ts` |
| 7 Cierre | `tests/unit/fisica/conservacion.test.ts` |
| 8 Determinismo | `tests/unit/fisica/conservacion.test.ts` |
| 9 Estructura de la trayectoria | `tests/unit/fisica/trayectoria.test.ts` |
| 10 Interpolación | `tests/unit/fisica/interpolacion.test.ts` |
| 11 Envoltura, muestreo e índice | `tests/unit/fisica/interpolacion.test.ts` |
| 12 Métricas | `tests/unit/fisica/metricas.test.ts` |
| 13 Extremos de la trayectoria | `tests/unit/fisica/metricas.test.ts` |
| 14 Contraste con la literatura | `tests/unit/fisica/literatura.test.ts` |
| 15 Entradas inválidas | `tests/unit/fisica/errores.test.ts` |
| 16 Protocolo del Worker | `tests/unit/workers/protocolo.test.ts` |
| 17 Cliente del Worker | `tests/unit/workers/clienteFisica.test.ts` |
| 18 Coste razonable | `tests/unit/fisica/trayectoria.test.ts` |

Las pruebas de física calculan la energía y los momentos con fórmulas propias, independientes de la librería.

### El Worker en un navegador real

Con una página desechable (no se versiona) y Chromium se comprobó que Next 16 con Turbopack empaqueta el Worker (`turbopack-worker-*.js`), que el prerenderizado no lo instancia en el servidor, y que devuelve la figura de ocho con 733 nodos y 70 368 bytes de estados (733 · 12 · 8) en unos 0,5 s contando la carga de la página. La caché devuelve la misma promesa en la segunda petición. La prueba permanente llegará con la primera página que use el Worker (GRV-04).

## Qué se aprendió

- **Medir antes de decidir.** Las distancias mínimas que salían de la rejilla uniforme (0,025 y 0,091) eran falsas; las reales son 0,011 y 0,013. Sin un integrador independiente no se habría visto.
- **Cuidado con las tolerancias escritas sin medir.** Dos de la spec eran irreales y solo se vio al ejecutar.
- **Los datos «conocidos» conviene contrastarlos.** El valor redondeado de la figura de ocho difería en la sexta cifra del publicado.
- **Una regla de ESLint hay que probarla aunque no tenga test.** La primera versión de la regla del Worker bloqueaba también lo permitido.

## Límites

- **Contraste con las fuentes.** Los valores de Chenciner y Montgomery se tomaron tal como los reproducen dos artículos leídos a través de un buscador, y conviene cotejarlos con el PDF original. No se consultó el artículo de Moore (1993). La cita de Li y Liao no se ha cotejado con el original.
- **Un solo periodo.** El salto al cerrar el bucle llega a 2,4e-3 en velocidad en Goggles (ADR 0003).
- **Extremos de la trayectoria.** `distanciaMinima` y `velocidadMaxima` se calculan sobre los nodos y son una cota, con un error pequeño.
- **El Worker aún no tiene una prueba E2E permanente.**
- **Determinismo.** Mismos bits en el mismo motor de JavaScript, no entre motores distintos.
