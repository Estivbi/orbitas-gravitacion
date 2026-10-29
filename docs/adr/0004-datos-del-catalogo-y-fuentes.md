# ADR 0004 · Datos del catálogo y su contraste con las fuentes

**Fecha:** 28 de octubre de 2026 · **Ticket:** GRV-02 · **Estado:** aceptada

## Contexto

Los datos de partida de las seis órbitas se recogieron de memoria y hay que contrastarlos con sus fuentes antes de darlos por buenos. Convención común: masas 1, G = 1, cuerpos en `(−1, 0)`, `(1, 0)` y `(0, 0)`, velocidad libre `(vx, vy)` para el primero, `v2 = v1` y `v3 = −2 v1`.

## Decisión y contraste

| Órbita         | Datos usados                                                                               | Fuente y contraste                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lagrange       | Radio 1 a 90°, 210° y 330°; velocidad tangencial `3^(−1/4)`; `T = 2π · 3^(1/4) = 8,269137` | Solución analítica. El valor 8,2689 que circula es una aproximación menos precisa; el cierre con el valor exacto es de 5,4e-11                                                                                                                                   |
| Figura de ocho | `v = (0,34711689; 0,53272494)`, `T = 6,32591398`, `E = −1,287142`                          | Derivada de los valores de Chenciner y Montgomery (_Ann. Math._ 152, 2000, 881–901, a partir de los cálculos de Simó), girados a nuestra convención. Los valores coinciden con la leyenda de la Figura 1 del artículo, verificada contra su PDF. Véase más abajo |
| Butterfly I    | `(0,30689; 0,12551)`, `T = 6,2356`                                                         | Tabla I de Šuvakov y Dmitrašinović (_Phys. Rev. Lett._ 110, 114301, 2013), fila I.A.1. Coincide con el PDF del artículo                                                                                                                                          |
| Goggles        | `(0,08330; 0,12789)`, `T = 10,4668`                                                        | Tabla I, fila I.B.5. Coincide                                                                                                                                                                                                                                    |
| Moth I         | `(0,46444; 0,39606)`, `T = 14,8939`                                                        | Tabla I, fila I.B.1. Coincide                                                                                                                                                                                                                                    |
| Yin-Yang I     | `(0,51394; 0,30474)`, `T = 17,3284`                                                        | Tabla I, fila II.C.2a (variante a). Coincide                                                                                                                                                                                                                     |

La Tabla I da las velocidades con cinco decimales y los periodos con cuatro. De ahí el cierre de hasta 2,4e-3 de las cuatro órbitas numéricas (ADR 0003).

### Yin-Yang I: variantes a y b

El artículo ofrece dos juegos de condiciones iniciales para la órbita Yin-Yang I (II.C.2a y II.C.2b) que llevan a la misma órbita en el espacio de formas, con distinta energía y distinto periodo. Son la misma órbita a otra escala de espacio y de tiempo. Se usa la variante a; la b sería igual de válida.

### Figura de ocho: por qué no los valores redondeados

El valor `vx = 0,347111` que se cita a menudo difiere en la sexta cifra del derivado de Chenciner y Montgomery: `0,34711689` tras girar sus condiciones iniciales a nuestra convención. Con el primero la órbita cierra con un error de 2,5e-5; con el segundo, de 1,1e-7. La energía del estado de Chenciner y Montgomery y la del catálogo coinciden (−1,287142) y el periodo es el mismo. Un test del repositorio (`tests/unit/fisica/literatura.test.ts`) lo comprueba.

## Consecuencias

- El catálogo y las pruebas llevan estos datos literales; si cambian hay que actualizar también `scripts/medir-fisica.mjs`.
- La Tabla I se verificó contra el PDF del artículo.

## Contraste con el artículo de Chenciner y Montgomery

Verificado contra el PDF del artículo (arXiv:math/0011268). La leyenda de la Figura 1 da las condiciones iniciales calculadas por Carles Simó: `x₁ = −x₂ = 0,97000436 − 0,24308753 i`, `x₃ = 0`, `V = ẋ₃ = −2ẋ₁ = −2ẋ₂ = −0,93240737 − 0,86473146 i`, `T̄ = 12T = 6,32591398`, `I(0) = 2` y masas 1. Son exactamente los valores de los que parte el catálogo (con `|x₁| = 1,000000003`, coherente con `I(0) = 2`). El artículo recoge además que los cálculos de Simó indican que la órbita es «estable» (completamente elíptica con torsión).

## Pendiente de cotejar

- No se ha consultado el artículo original de Moore (1993).
- La afirmación de Li y Liao sobre la pérdida de periodicidad de varias órbitas (arXiv:1312.6796) no se ha cotejado con el original.
