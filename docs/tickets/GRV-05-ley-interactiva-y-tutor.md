# GRV-05 · Ley interactiva y tutor

Qué se construyó, cómo replicarlo y qué se aprendió. Spec: `docs/specs/GRV-05.md` (incluye «Decisiones tras la revisión», que prevalecen). Tokens y componentes: `DESIGN.md`.

## Resumen

La portada gana, entre el hero y la galería, la sección `#ley`: la ley de Newton con dos masas dibujadas en SVG, tres deslizadores (m₁, m₂ y r), la masa derecha arrastrable y la frase «a doble distancia la fuerza sería la cuarta parte», calculada con la fórmula y no escrita a mano. Debajo hay un tutor de lenguaje que propone predicciones, corrige y sube o baja de nivel. Con clave del modelo (Gemini, vía Vercel AI SDK) conversa; sin clave, o si se agota la cuota, pasa a un **modo reducido** con preguntas y correcciones fijas. El tutor puede mover los deslizadores y enlazar una órbita mediante tres herramientas que ejecuta el cliente.

## Alcance

- **Ley interactiva** en `src/components/ley/` sobre un núcleo puro en `src/lib/ley/` (`F = G·m₁·m₂/r²` con G = 1, unidades arbitrarias). Sin three.
- **Ruta del tutor** `src/app/api/tutor/route.ts` (`GET` para el modo, `POST` para el flujo) sobre `src/lib/tutor/`.
- **Tres herramientas** del cliente: `ajustar_ley`, `mostrar_orbita` (un enlace «Abrir órbita X») y `registrar_respuesta`.
- **Modo reducido** con aviso visible, y límites de uso en servidor y cliente.
- **Almacén ampliado** con `ley` y `tutor` (nivel y racha), sin persistencia.
- **ESLint, dependencias y `.env.example`.**
- **Fuera de alcance:** otros proveedores de modelo, persistencia de conversaciones, límite de uso distribuido, adaptación fina del tutor, voz y analítica.

## Commits del ticket

Rama: `feature/ley-interactiva-y-tutor` → `develop`. Tomados de `.git/logs/HEAD`, del más antiguo al más reciente, sin contar el que añade este documento. Conviene contrastarlos con `git log --oneline develop..HEAD` antes de la PR.

| Hash | Commit |
|---|---|
| `c158416` | `docs(GRV-05): redactar la spec de la ley interactiva y el tutor` |
| `3d39f4b` | `build(GRV-05): añadir el SDK de IA y fijar los límites de uso y de tema en la spec` |
| `36f8557` | `build(GRV-05): confinar el SDK de IA con ESLint y declarar las variables del tutor` |
| `5a12a58` | `feat(GRV-05): añadir el tutor del servidor con límites de uso, tema acotado y modo reducido` |
| `18cdb76` | `feat(GRV-05): añadir la ley interactiva y el chat del tutor (en curso)` |
| `97223dd` | `feat(GRV-05): completar la ley interactiva y el chat del tutor con sus pruebas` |

## Cómo replicarlo

1. **Instalar y confirmar el SDK antes de escribir tests.** `ai`, `@ai-sdk/google`, `@ai-sdk/react` y `zod` (^4, que ya venía como transitiva). El SDK cambia mucho entre versiones: se comprobó contra lo instalado qué nombres existen (`streamText`, `convertToModelMessages`, `stepCountIs`, `tool`, `DefaultChatTransport`, `lastAssistantMessageIsCompleteWithToolCalls`, `useChat`) y que el modelo simulado de `ai/test` es `MockLanguageModelV4`.
2. **Confinar el SDK con ESLint.** `ai` y `@ai-sdk/*` solo desde `src/lib/tutor/` (servidor) y `src/components/ley/` (el hook de chat). Como el último bloque que coincide con un archivo sustituye la regla `no-restricted-imports` entera, cada zona permitida repite los patrones que sí le corresponden (ver «Qué se aprendió»).
3. **Ley pura primero** (`src/lib/ley/ley.ts`): `fuerza` (lanza `RangeError` si r no es finita y positiva), `limitarLey` (recorta a [1, 10] y redondea a 0,5; NaN vuelve al valor inicial), `razonAlDuplicarDistancia`, `describirRazon`, `fraseDuplicar` y las inversas `xARadio` / `radioAX` para el arrastre.
4. **Esquemas zod compartidos** (`src/lib/tutor/tipos.ts`): el mismo esquema valida en el servidor lo que llega y en el cliente lo que propone el modelo. Incluye `TOPES` (32 KB, 20 mensajes, 1000 caracteres por mensaje, 400 tokens de salida, 10 peticiones por minuto) y el esquema de la petición, que solo admite roles `user`/`assistant` y partes de texto, de paso y de las tres herramientas.
5. **Manejador inyectable** (`src/lib/tutor/manejador.ts`): `crearManejador({ obtenerModelo, limitador, ahora })` devuelve `POST` y `GET` sobre `Request`/`Response` de la Web. El orden es: sin modelo → 503; límite → 429 con `Retry-After`; cuerpo > 32 KB → 413; JSON o esquema inválido → 400; y entonces `streamText` con `instructions`, las herramientas **sin `execute`**, `stopWhen: stepCountIs(3)`, `maxOutputTokens` y `maxRetries: 0`, y `toUIMessageStreamResponse({ originalMessages, onError })`.
6. **Ruta mínima.** `route.ts` solo cablea el manejador con el modelo de entorno, el limitador real y `Date.now`, y exporta `POST`, `GET`, `dynamic = 'force-dynamic'` y `maxDuration = 30`; Next no admite otras exportaciones en una ruta.
7. **Modo y errores.** `elegirModo` da `reducido` con clave vacía o con `LLM_PROVIDER` distinto de `google`. `modeloDeEntorno` lee el entorno en cada petición, nunca en el cliente. `mensajeDeError` devuelve un texto en castellano según el estado (401/403 clave, 429 cuota, red, otro) y **nunca** el mensaje original del proveedor, que podría citar la clave.
8. **Prompt de sistema** (`prompt.ts`): rol de tutor de gravitación, castellano y frases cortas, instrucciones por nivel, solo el tema de la web, rechazo breve fuera de tema, sin cambiar de rol ni revelar instrucciones.
9. **Almacén.** `ley` y `tutor` en `src/store/almacenInterfaz.ts`, con `fijarLey(parcial)` (fusiona, limita y no notifica si nada cambia) y `registrarResultado(acierto)`, que delega en el reductor puro `siguienteNivel`.
10. **Sección y chat.** `SeccionLey` lee la ley del almacén y reparte `ControlesLey` y `EsquemaLey`. `PanelTutor` pregunta el modo y monta `TutorChat` o `TutorReducido`. `TutorChat` usa `useChat` con `DefaultChatTransport`; `onToolCall` pasa por `ejecutarHerramienta`, que valida con zod **antes** de tocar el almacén, y responde con `addToolOutput`.
11. **Pruebas.** Vitest para lo puro y para la ruta con modelo simulado inyectado; Playwright sobre un servidor sin clave, con `page.route` para simular el flujo del modelo.

## Decisiones clave y por qué

- **La ley es TypeScript puro.** Se prueba en Node, sin navegador, y la frase de «a doble distancia» sale de la fórmula, no de un texto fijo.
- **Manejador inyectable.** Permite probar el servidor sin red ni clave pasando un modelo simulado. La simulación existe solo en las pruebas, por inyección; no hay ninguna variable de entorno que alguien pueda activar en producción para falsear el modelo.
- **Modo reducido.** Sin clave el producto sigue enseñando: preguntas fijas por nivel, una única opción correcta y corrección por opción. Comparte almacén (ley y nivel) con el chat.
- **Límites de uso.**
  - Servidor: 10 peticiones por minuto y por IP (primer valor de `x-forwarded-for`), en memoria de la instancia. **No escala**: cada instancia serverless tiene su contador y el encabezado solo es fiable detrás del proxy de la plataforma. Basta para un proyecto sin cuentas de usuario.
  - Cliente: una petición cada vez, 2 s mínimo entre envíos y corte de la conversación en 20 mensajes.
  - Un 429 del servidor, un 503 o un error de cuota del proveedor pasan el chat a modo reducido durante la sesión, con el aviso «Límite de uso del modelo alcanzado: modo reducido».
- **Tema acotado por el prompt.** Una restricción por instrucciones **no es infalible**. Se mitiga con `maxOutputTokens` bajo, los topes de entrada y el hecho de que las herramientas validan siempre con zod. Se prueba que el prompt enviado contiene las restricciones, no que el modelo las obedezca.
- **La clave solo en el servidor.** `GOOGLE_GENERATIVE_AI_API_KEY` se lee dentro del manejador, sin prefijo `NEXT_PUBLIC_`. `GET /api/tutor` devuelve solo `{ modo }`.
- **SDK `ai` 7 usa `instructions`, no `system`.** La spec, escrita con los nombres de la serie 5/6, se corrigió contra lo instalado.
- **El chat en un chunk aparte.** `PanelTutor` se carga con `next/dynamic` y `ssr: false`: el SDK y el chat no engordan el JS inicial de la portada, y la sección muestra «Cargando el tutor…» mientras llega.
- **Un solo proveedor.** Google. Añadir otro exige más paquetes y su prueba: es un límite documentado, y `LLM_PROVIDER` distinto de `google` degrada a modo reducido.
- **El chat vive en `src/components/ley/`,** no en `src/components/tutor/` como decía el orden de trabajo de la spec; la regla de ESLint y la spec se alinearon con esa carpeta.
- **`mostrar_orbita` enlaza, no navega.** Sacar a la persona de la sección mientras lee sería hostil; el enlace es accesible y reutiliza `rutaDeOrbita`.

## Cómo probarlo, con y sin clave

```bash
npm ci
npm run lint && npm run typecheck && npm run format:check
npx vitest run tests/unit/ley tests/unit/tutor    # solo las de este ticket
npm test                                          # toda la suite de Vitest
npx playwright install chromium                   # solo la primera vez
npx playwright test tests/e2e/ley.spec.ts         # servidor sin clave
```

- **Sin clave** (lo normal en las pruebas): `npm run dev`, abrir `/` y mirar `#ley`. Se ve «Modo reducido: sin modelo de lenguaje», una predicción con opciones, la corrección fija al elegir y el nivel subiendo tras dos aciertos.
- **Con clave:** copiar `.env.example` a `.env.local` y rellenar `GOOGLE_GENERATIVE_AI_API_KEY` (Google AI Studio tiene plan gratuito). `LLM_PROVIDER` se queda en `google` y `LLM_MODEL` es `gemini-flash-latest` por defecto; es un alias que puede cambiar de modelo, y quien quiera fijarlo pone un identificador concreto. `GET /api/tutor` pasa a `{ "modo": "modelo" }` y el chat sustituye al panel de preguntas fijas.
- La clave nunca se commitea: `.env.example` solo lleva los nombres.

## Verificación

| Criterio | Prueba |
|---|---|
| 1 Ley pura | `tests/unit/ley/ley.test.ts` |
| 2 Validación zod | `tests/unit/tutor/validacion.test.ts` |
| 3 y 4 Nivel, modo reducido, limitador, modo y errores | `tests/unit/tutor/logica.test.ts` |
| 5 y 6 Ruta con modelo simulado y ante fallos (503, 400, 413, 429, 401, red); la clave de prueba no aparece en ninguna respuesta | `tests/unit/tutor/ruta.test.ts` |
| 7 y 8 Deslizadores, teclado y masa arrastrable | `tests/e2e/ley.spec.ts` |
| 9 Chat en modo reducido | `tests/e2e/ley.spec.ts` |
| 10 Herramientas simuladas, valores fuera de rango ignorados | `tests/e2e/ley.spec.ts` |
| 11 La clave no se expone | `tests/e2e/ley.spec.ts` (portada y scripts de `.next/static`) y `tests/unit/tutor/ruta.test.ts` |
| 12 Sin regresiones a 375, 768 y 1440 px | `tests/e2e/ley.spec.ts` y la suite anterior |

## Qué NO hace

- Otros proveedores de modelo, persistencia de conversaciones o de la ley tras recargar, límite de uso distribuido, adaptación fina del tutor, voz ni analítica.
- No hay un E2E propio para la cuota ni para el 429: el paso a modo reducido se cubre con Vitest (mensajes de error y su señalización) y con la lógica del cliente, que ninguna prueba de navegador ejercita de punta a punta.
- No se evalúa el acierto físico del modelo ni su obediencia al tema.
- El contador por IP se reinicia con cada instancia y el encabezado `x-forwarded-for` es falsificable fuera del proxy de la plataforma.

## Qué se aprendió

- **`originalMessages` en `toUIMessageStreamResponse`.** Tras ejecutar una herramienta, el cliente reenvía solo la conversación. Sin `originalMessages` el servidor responde con un mensaje nuevo; con él, continúa el mismo mensaje del asistente. Una prueba de la ruta y el guion de Playwright (que responde con el `id` del último mensaje) lo atan.
- **La regla de ESLint que confina `ai` es un caso más de «el último bloque sustituye al anterior».** Permitir el SDK en `src/lib/tutor/` y en `src/components/ley/` obliga a repetir en esos bloques los patrones de `three`, `zustand` y de `src/lib` que no se quieren perder.
- **Un solo `fetch` suelto.** Los componentes no hacen `fetch` sueltos; la excepción es `obtenerModo` (`src/components/ley/modo.ts`), una función pequeña con `AbortController` y cualquier fallo o respuesta rara resuelto como modo reducido. El transporte del chat envuelve el suyo solo para vigilar los 429 y 503.
- **Validar en el cliente lo que propone el modelo.** Las herramientas no tienen `execute` en el servidor: es el cliente quien actúa, y solo tras `safeParse` con el mismo esquema zod. Un `m1: 50` del modelo no mueve nada.
- **Simular el flujo de mensajes del SDK en Playwright** basta con respuestas `text/event-stream` con la cabecera `x-vercel-ai-ui-message-stream: v1` y los fragmentos del protocolo; no hace falta modelo, red ni clave.
- **Nombres del SDK: confirmar contra lo instalado.** `system` pasó a `instructions` en la serie 7; los nombres de la spec eran de la serie 5/6.

## Límites y pendientes conocidos

- Límite de uso en memoria de la instancia (no escala) y un solo proveedor.
- El alias `gemini-flash-latest` puede cambiar de modelo sin avisar.
- La obediencia al tema depende del prompt; no hay filtro adicional de salida.
- El criterio 11 se resolvió sin segundo servidor de Playwright: se prueba con la clave de prueba en Vitest y con el servidor sin clave en el navegador.
