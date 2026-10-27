---
description: Crea la spec de un ticket (SDD) con criterios dado/cuando/entonces
argument-hint: <TICKET> <descripción corta>
---

Usa el agente `arquitecto` para crear `docs/specs/$1.md` para: $ARGUMENTS

Incluye: contexto, alcance, fuera de alcance, contratos (datos, API, eventos) y criterios de aceptación en formato dado / cuando / entonces, cada uno verificable con un test. Si hay interfaz, indica qué pantallas y qué secciones de `DESIGN.md` aplican.

No implementes nada. Termina pidiendo la aprobación de la spec.
