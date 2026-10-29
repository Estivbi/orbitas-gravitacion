# Base de trabajo — Forma de trabajar del proyecto

Reglas comunes de flujo, calidad y seguridad. Lo específico del proyecto (stack, estructura, tickets) va en `AGENTS.md`. Si algo del `AGENTS.md` choca con este archivo, manda el del proyecto.

## Flujo SDD y TDD

Todo ticket sigue: spec → test en rojo → código en verde → refactor → documentación → revisión.

1. **Spec** (`arquitecto`): `docs/specs/<TICKET>.md` con contexto, alcance, fuera de alcance y criterios de aceptación en formato dado / cuando / entonces. Se aprueba antes de seguir.
2. **Tests en rojo**: se escriben desde los criterios, nunca desde la implementación. Se comprueba que fallan por el motivo correcto y se commitean (`test(<TICKET>): ...`).
3. **Código en verde**: lo mínimo para que pasen (`feat(<TICKET>): ...`).
4. **Refactor** con los tests en verde.
5. **Documentación** (`documentacion`): `docs/tickets/<TICKET>-<nombre>.md`, ADRs nuevos y `docs/estado.md`.
6. **Revisión** (`pr-reviewer` y, si procede, `seguridad`) antes de abrir la PR.

Un ticket está hecho cuando: cada criterio de la spec tiene test y pasa, el linter y los tipos están limpios, la documentación está al día y los revisores no tienen bloqueos. Nunca se salta, desactiva ni pone en cuarentena un test para conseguir el verde.

## Tests de interfaz (front)

- Los criterios con comportamiento visible se cubren con Playwright (E2E) además de los tests unitarios.
- Antes de dar por hecha una pantalla: capturas en móvil, tablet y escritorio, y comprobación de accesibilidad básica (contraste, foco, etiquetas).
- Los tests E2E salen de los criterios de la spec, no de lo que pinta la pantalla.

## Diseño y UI

- Cada proyecto con interfaz tiene un `DESIGN.md` en la raíz: fuente de verdad de colores, tipografía, espaciado, movimiento y componentes, más su **intensidad de estilo**.
- Antes de tocar UI, el agente `frontend` lee `DESIGN.md`. Si el proyecto no tiene uno, se crea antes de escribir interfaz (a partir de una referencia de Refero Styles o del skill `refero-design`).
- Prohibidos los valores de color, tamaño o espaciado escritos a mano fuera de los tokens definidos en `DESIGN.md`.
- Skills de diseño recomendados: `frontend-design` (base), `ui-ux-pro-max` (paletas y estilos), `web-design-guidelines` (corrección y accesibilidad), `refero-design` (investigar referencias antes de diseñar). Se instalan con `scripts/skills.sh`.
- No mezclar referencias de diseño: se elige una dirección principal y las demás solo aportan detalles concretos.
- Criterio de hecho visual: la pantalla respeta los tokens, funciona en móvil y tablet, y pasa la revisión de accesibilidad.

## Trabajo en paralelo

- Cada agente toca solo las carpetas de las que es dueño; si necesita un cambio en otra, lo pide al agente dueño.
- Commits pequeños y frecuentes; antes de empezar y de commitear, `git pull --ff-only`.
- Los contratos entre agentes (esquema de datos, OpenAPI, eventos) se fijan primero en la spec y los fija el `arquitecto`.

## Ramas, commits y PRs

- Dos ramas largas: `main` (estable, solo recibe lo que la persona responsable aprueba de forma expresa) y `develop` (integración y pruebas).
- Una rama por ticket, desde `develop`, con nombre en español que explique lo que hace: `feature/motor-de-fisica`. Se fusiona a `develop` mediante PR.
- Las PRs las abre y las fusiona la persona responsable del proyecto. Al terminar un ticket, el agente deja la URL de comparación de GitHub, el título y la descripción para pegar. No se empieza el siguiente ticket hasta que el anterior está fusionado.
- El paso de `develop` a `main` nunca lo hace el agente.
- Conventional Commits con descripción en español, en infinitivo: `tipo(<TICKET>): descripción` con `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`, `build`.
- El autor es la identidad Git configurada en el repo.
- Nunca se reescribe el historial de una rama compartida (sin rebase, amend ni push --force).

## Calidad común

Tipado estricto, linter y formateador del stack, sin código muerto, funciones pequeñas con un solo propósito, nombres claros en español para el dominio y en inglés para los términos técnicos habituales. Las capas y dependencias concretas las define el `AGENTS.md` del proyecto.

## Documentación

- El repositorio es la fuente de verdad y sirve como material de enseñanza para replicar la estrategia.
- `docs/specs/`: qué se construye y cómo se sabrá que está bien.
- `docs/tickets/`: qué se construyó, paso a paso, cómo replicarlo y qué se aprendió. Se escribe en cada ticket, antes de la PR.
- `docs/adr/NNNN-<titulo>.md`: una decisión por archivo (contexto, opciones, decisión, consecuencias). Inmutables: si cambia, un ADR nuevo sustituye al anterior.
- `docs/estado.md`: foto actual del repo; se actualiza tras cada merge.

## Seguridad y secretos

- Ningún secreto en git. Solo `.env.example` con nombres de variables y valores ficticios.
- Todo acceso a datos requiere autenticación.
- Las acciones externas irreversibles (enviar un email, publicar, cobrar) pasan por aprobación manual.
- Sin servicios de pago innecesarios: toda infraestructura se evalúa primero contra planes gratuitos o ya contratados.
