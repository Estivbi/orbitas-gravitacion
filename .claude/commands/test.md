---
description: Escribe los tests en rojo de un ticket desde sus criterios
argument-hint: <TICKET>
---

Escribe los tests de `docs/specs/$1.md` a partir de los criterios de aceptación, nunca desde la implementación. Unitarios y de integración donde apliquen; Playwright para comportamiento visible en interfaz.

Ejecútalos y comprueba que fallan por el motivo correcto (no por errores de configuración). Commitea como `test($1): ...` y para: el código en verde es un paso aparte.
