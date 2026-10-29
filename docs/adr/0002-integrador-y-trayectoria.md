# ADR 0002 · Integrador y representación de la trayectoria

**Fecha:** 28 de octubre de 2026 · **Ticket:** GRV-02 · **Estado:** aceptada

## Contexto

El motor tiene que calcular las seis órbitas con precisión controlada y servirlas a la escena, a las miniaturas y a la telemetría. En cuatro de ellas hay encuentros muy cercanos: la distancia mínima real entre dos cuerpos es de 0,011 en Butterfly I y de 0,013 en Yin-Yang I. Un paso fijo diverge en esos encuentros, y una trayectoria guardada en una rejilla uniforme los representa mal.

## Opciones

| Opción                                                      | Valoración                                                                                                                                                                                                                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 720 muestras uniformes por periodo e interpolación lineal   | Es lo que proponía el planteamiento inicial. Error de posición entre muestras de hasta 4,2e-2, del orden de la propia distancia mínima. La «distancia mínima» de la telemetría saldría hasta siete veces mayor que la real                                             |
| 2880 muestras uniformes e interpolación de Hermite          | Mejora, pero no basta: hasta 2,5e-3 en Yin-Yang I. El error se concentra en los encuentros y una rejilla uniforme no puede adaptarse                                                                                                                                   |
| **Pasos adaptativos como nodos e interpolación de Hermite** | Elegida. Los nodos son densos justo donde hace falta. Error ≤ 2,2e-7 en las seis                                                                                                                                                                                       |
| Dormand–Prince 5(4) con salida densa                        | Más eficiente (unas 6 evaluaciones de fuerza por paso frente a 12 de la duplicación: 4 por cada una de las 3 integraciones de RK4) y trae interpolación de cuarto orden. Más código, y con menos de 10 000 nodos y pocos milisegundos por órbita el ahorro no compensa |
| Integrador simpléctico de paso fijo                         | Conserva bien la energía a largo plazo, pero un paso fijo no resuelve los encuentros cercanos                                                                                                                                                                          |
| Regularización de Kustaanheimo–Stiefel                      | Pensada para colisiones. Innecesaria con distancias de al menos 0,011                                                                                                                                                                                                  |

## Decisión

- **Integrador:** Runge–Kutta de cuarto orden con duplicación de paso. Un paso `h` se calcula entero (`yA`) y en dos mitades (`yB`); el error es la mayor diferencia absoluta entre las 12 componentes y, si no supera 1e-10, se acepta `yB` (sin extrapolación de Richardson, que deja un margen conservador). El paso siguiente se ajusta con el factor `0,9 · (tol / err)^(1/5)`, limitado entre 0,3 y 2, y nunca supera `T/720`.
- **Trayectoria:** los pasos aceptados son los nodos. Se guardan sus tiempos y sus estados de 12 valores, cada array con su propio buffer.
- **Interpolación:** Hermite cúbico entre nodos. Las posiciones usan las velocidades como derivadas; las velocidades usan las aceleraciones, recalculadas con la misma función de fuerzas en los dos extremos del segmento.
- **Garantías de terminación:** el tope de pasos cuenta intentos (aceptados y rechazados) y un error o un paso no finito, o que no avanza, lanzan una excepción.

## Evidencia

`npm run medir:fisica` reproduce estas cifras con una reimplementación separada de `src/lib/fisica`: comparte el algoritmo pero no el código, así que detecta errores de implementación, no de diseño. El error de interpolación de las velocidades (≤ 1,1e-4) no lo mide el script, sino el criterio 10 de la spec.

| Órbita         | 720 uniformes + lineal | 2880 uniformes + Hermite | Pasos adaptativos + Hermite |
| -------------- | ---------------------- | ------------------------ | --------------------------- |
| Lagrange       | 9,5e-6                 | 9,7e-13                  | 5,6e-11                     |
| Figura de ocho | 2,1e-5                 | 2,6e-12                  | 2,2e-9                      |
| Butterfly I    | 1,6e-2                 | 8,1e-4                   | 7,3e-8                      |
| Goggles        | 2,2e-2                 | 7,0e-4                   | 2,2e-7                      |
| Moth I         | 6,9e-3                 | 4,2e-6                   | 2,3e-8                      |
| Yin-Yang I     | 4,2e-2                 | 2,5e-3                   | 2,2e-7                      |

Error máximo de posición entre muestras frente a una referencia de tolerancia 1e-13. La velocidad se interpola con error ≤ 1,1e-4. Las seis órbitas necesitan entre 724 y 9034 nodos (≈ 1 MB como máximo) y se integran en unos pocos milisegundos.

## Consecuencias

- La trayectoria no es una rejilla uniforme: el segmento se busca por bisección (`indiceEn`) y las estelas recorren nodos o usan `muestrear`, que devuelve estados equiespaciados.
- Las distancias mínimas y las velocidades máximas de una trayectoria se calculan sobre los nodos: la primera es una cota superior del mínimo real y la segunda una cota inferior del máximo real.
- El paso máximo `T/720` asegura al menos 721 nodos, pero no es lo que evita saltarse un encuentro: eso lo hace el control del error.
- Determinismo: los mismos datos dan los mismos bits **en el mismo motor de JavaScript**. El estándar no obliga a redondeo correcto en `pow`, `hypot` ni `sin`/`cos`, así que Node y un navegador pueden diferir en 1 ulp y generar nodos distintos. A la vista no se nota.
- La duplicación de paso cuesta más evaluaciones por paso que un método encajado. Es el coste de un código corto y fácil de defender.
