# ADR 0003 · Un solo periodo, reproducido en bucle

**Fecha:** 28 de octubre de 2026 · **Ticket:** GRV-02 · **Estado:** aceptada

## Contexto

Las seis órbitas son periódicas, pero los datos de las cuatro halladas numéricamente tienen cinco cifras, así que tras un periodo el estado no vuelve exactamente al inicial. Medido con `npm run medir:fisica`, el mayor desacuerdo entre el estado inicial y el estado tras `T` (posiciones y velocidades) es:

| Órbita         | Cierre  |
| -------------- | ------- |
| Lagrange       | 5,4e-11 |
| Figura de ocho | 1,1e-7  |
| Moth I         | 2,3e-4  |
| Yin-Yang I     | 8,6e-4  |
| Butterfly I    | 1,2e-3  |
| Goggles        | 2,4e-3  |

Sobre la estabilidad:

- La figura de ocho es estable: los cálculos de Simó, recogidos en el artículo de Chenciner y Montgomery, indican que es completamente elíptica con torsión.
- La solución equilátera de Lagrange con masas iguales es inestable (criterio de Routh): si cierra tan bien es porque sus datos son exactos.
- De las cuatro numéricas, el artículo que las presenta esperaba que fueran estables o marginalmente inestables. Li y Liao (arXiv:1312.6796) afirman que varias de las órbitas de ese artículo se alejan de la periodicidad con el tiempo. No se ha determinado cuáles, y esa cita no se ha cotejado con el original.

## Opciones

| Opción                                          | Valoración                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Integrar un periodo y reproducirlo en bucle** | Elegida. Es lo que muestra la órbita tal como la define su periodo                   |
| Integrar varios periodos                        | Las órbitas inestables se desviarían y la animación dejaría de parecerse a la figura |
| Corregir el cierre para que el bucle no salte   | Maquilla un límite real de los datos                                                 |

## Decisión

Se integra exactamente de `0` a `T`. La reproducción envuelve la fracción del periodo módulo 1 y el estado final no se corrige: el salto al cerrar el bucle queda documentado como límite.

## Consecuencias

- Al cerrar el bucle hay un salto de hasta el cierre de la tabla. En posición llega a 6,7e-4 (el radio máximo es ≈ 1,4), una fracción de píxel en un lienzo de unos 800 px; en velocidad llega a 2,4e-3 en Goggles.
- `estadoEn(t, 1)` equivale a `estadoEn(t, 0)`; el último nodo de la trayectoria, que es el estado tras `T`, no se usa como estado de reproducción.
- Quien dibuje estelas con envoltura debe saltarse ese último nodo, que duplica al primero salvo por el cierre.
- Si algún día se quisiera simular más de un periodo, haría falta una órbita estable o una indicación visible de que la trayectoria se desvía.
