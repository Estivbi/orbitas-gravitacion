# AGENTS.md — Contrato del equipo de agentes de orbitas-gravitacion

Fuente de verdad para los agentes y las personas que trabajan en este repositorio.

**Reglas comunes (flujo SDD/TDD, ramas, commits, diseño, seguridad):** `.claude/base/base.md`. Léelas antes de empezar. Si algo de este archivo choca con la base, manda este archivo.

## Qué es orbitas-gravitacion

{{DESCRIPCION_EN_UNA_FRASE}}

Tablero de tickets: {{JIRA_O_TRACKER}}. Decisiones de arquitectura en `docs/adr/`. Estado actual en `docs/estado.md`.

## Stack

- Frontend: {{FRONT}}
- Backend: {{BACK}}
- Base de datos: {{BBDD}}
- Despliegue: {{DESPLIEGUE}}

## Equipo de agentes

Los subagentes viven en `.claude/agents/<nombre>.md`.

| Agente | Rol | Es dueño de | Puede escribir |
|---|---|---|---|
| arquitecto | Diseño, specs y ADRs | `docs/adr/`, `docs/specs/` | Solo documentación |
| frontend | Interfaz | {{CARPETA_FRONT}} | Sí |
| backend | API, modelos, migraciones | {{CARPETA_BACK}} | Sí |
| seguridad | Revisión de seguridad | — | No (solo informa) |
| devops | CI, contenedores, despliegue | `infra/`, `.github/` | Sí |
| documentacion | Docs de ticket y estado | `docs/tickets/`, `docs/estado.md`, `README.md` | Solo documentación |
| pr-reviewer | Revisión de la rama contra su spec | — | No (solo informa) |

Quita las filas que el proyecto no use.

## Estructura del repositorio

```
{{ARBOL_DE_CARPETAS}}
```

Las carpetas se crean cuando el ticket que las necesita las introduce; no se versionan carpetas vacías.

## Arquitectura

{{CAPAS_Y_REGLAS_DE_DEPENDENCIA}}

## Entorno y comandos

{{COMANDOS_INSTALAR_TEST_LINT_DEV}}

## Particularidades del proyecto

{{COSAS_QUE_SOLO_APLICAN_AQUI}}
