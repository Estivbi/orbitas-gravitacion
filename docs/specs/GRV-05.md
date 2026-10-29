# GRV-05 · Ley interactiva y tutor

**Estado:** implementada, pendiente de revisión · **Tamaño:** L · **Rama:** `feature/ley-interactiva-y-tutor` → `develop`

## Contexto

La portada enseña las órbitas pero no la ley que las gobierna. Este ticket añade, entre el hero y la galería (`#galeria`), una ley de gravitación que se puede manipular y un tutor de lenguaje que propone predicciones, corrige y adapta el nivel. Sin clave del modelo, la sección sigue funcionando con preguntas y correcciones fijas.

## Alcance

1. **Ley interactiva** (`<section id="ley">`): dos masas en SVG, deslizadores de masa (m₁, m₂) y de distancia (r), masa derecha arrastrable, `F = G·m₁·m₂/r²` con G = 1 (unidades arbitrarias) y la frase «a doble distancia la fuerza sería la cuarta parte», calculada con la fórmula. Sin three.
2. **Tutor**: ruta `src/app/api/tutor/route.ts` (`streamText`, Google), panel de chat en la misma sección, nivel 1 a 3 en el almacén.
3. **Tres herramientas** que ejecuta el cliente: `ajustar_ley`, `mostrar_orbita`, `registrar_respuesta`.
4. **Modo reducido** sin clave: preguntas predefinidas, correcciones fijas y aviso «Modo reducido: sin modelo de lenguaje».
5. `.env.example`, ESLint y dependencias nuevas.

## Fuera de alcance

Persistencia de conversaciones, autenticación, límite de uso distribuido, adaptación fina del tutor, voz, analítica, buscador de órbitas, otros proveedores de modelo (límite asumido: ver decisiones).

## Decisiones clave

- **SDK.** `ai` (^7), `@ai-sdk/google` (^4), `@ai-sdk/react` y `zod` (^4, ya presente como transitiva: se declara). Razón: es lo que pide el stack. Coste: el SDK cambia mucho entre versiones, por eso el paso 0 confirma contra lo instalado los nombres de abajo, y si difieren el arquitecto corrige esta sección antes de los tests.
- **API del SDK (serie 5/6; confirmar en 7).** Servidor: `streamText({ model, system, messages: await convertToModelMessages(uiMessages), tools, stopWhen: stepCountIs(3), maxOutputTokens })` y `result.toUIMessageStreamResponse({ onError })`. Herramientas con `tool({ description, inputSchema })` **sin `execute`** (las resuelve el cliente). Cliente: `useChat` de `@ai-sdk/react` con `DefaultChatTransport({ api: '/api/tutor', body: () => ({ nivel }) })`, `sendMessage({ text })`, `onToolCall` que valida y llama a `addToolOutput`, y `sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls`. Los mensajes son `UIMessage` con `parts` (`text`, `step-start`, `tool-<nombre>`).
- **Proveedor.** Solo Google: `createGoogleGenerativeAI({ apiKey })` con `process.env.GOOGLE_GENERATIVE_AI_API_KEY` (nombre por defecto del paquete), leída dentro del manejador y nunca con prefijo `NEXT_PUBLIC_`. `LLM_PROVIDER` distinto de `google` se trata como sin modelo (modo reducido). Razón: openai y anthropic exigen dos paquetes más y su prueba; es un límite documentado, no un hueco. Modelo por `LLM_MODEL`, por defecto `gemini-2.5-flash-lite` (alias oficial de Google, ya en `.env.example`, con plan gratuito en AI Studio y sin id que se retire). Coste: el alias puede cambiar de modelo; quien quiera fijarlo usa `LLM_MODEL`.
- **Dónde vive la lógica.** `src/lib/tutor/manejador.ts` exporta `crearManejador({ obtenerModelo, limitador, ahora })` (Web `Request` → `Response`, sin React) y la ruta solo hace `export const POST = …`, `GET = …`, `dynamic = 'force-dynamic'`, `maxDuration = 30`, porque Next prohíbe otras exportaciones en `route.ts`. Con esto la ruta se prueba sin red inyectando un modelo simulado.
- **Simulación del modelo.** Solo en pruebas y por inyección, nunca por variable de entorno de producción: Vitest pasa un modelo simulado de `ai/test` (`MockLanguageModel*`; nombre exacto en el paso 0); Playwright (servidor sin clave) intercepta `/api/tutor` con `page.route` y responde con lo que produce `crearManejador` + modelo simulado importado en Node. Razón: sin interruptor en el servidor que alguien active en producción.
- **Estado compartido.** Los deslizadores y las herramientas tocan lo mismo, así que `ley {m1, m2, r}` y `tutor {nivel, racha}` van al almacén de `src/store/` (acciones `fijarLey`, `registrarRespuesta`), sin persistencia y respetando que `zustand` solo se importa ahí.
- **Límites del servidor.** Cuerpo ≤ 32 KB; ≤ 20 mensajes; texto ≤ 1000 caracteres por mensaje; `maxOutputTokens` 400; 10 peticiones por minuto y por IP (primer valor de `x-forwarded-for`). El contador está en memoria de la instancia: **no escala** (cada instancia serverless tiene el suyo y el encabezado solo es fiable detrás del proxy de la plataforma). Basta para un proyecto sin usuarios.
- **Errores.** `toUIMessageStreamResponse({ onError })` devuelve mensajes en castellano (clave inválida, cuota, otro fallo del proveedor); el cliente añade el de red. Nunca se devuelve el mensaje original del proveedor, que podría citar la clave.
- **`mostrar_orbita`** muestra un enlace «Abrir órbita X» (con `rutaDeOrbita`) en vez de navegar solo: no saca a la persona de la sección mientras lee y es accesible.
- **Estilo.** Sin tarjetas ni bordes. Un solo botón relleno por vista: los controles del tutor usan el estilo de selector de texto o enlace fantasma. El aviso usa `saffron-spark`. Deslizadores con `accent-color: var(--color-electric-iris)` y área táctil de 44 px.

## Contratos

```ts
// src/lib/ley/ley.ts  (puro)
export const LIMITES = {
  masa: { min: 1, max: 10 },
  distancia: { min: 1, max: 10 },
  paso: 0.5,
} as const;
export interface Ley {
  m1: number;
  m2: number;
  r: number;
}
export const LEY_INICIAL: Ley; // m1 4, m2 2, r 4
export function fuerza(m1: number, m2: number, r: number): number; // m1·m2/r²; RangeError si r ≤ 0 o no finito
export function limitarLey(l: Ley): Ley; // recorta a LIMITES y redondea al paso; NaN → valor inicial
export function razonAlDuplicarDistancia(l: Ley): number; // fuerza(m1,m2,2r) / fuerza(m1,m2,r), calculada
export function describirRazon(razon: number): string; // 0,5 → «la mitad»; 0,25 → «la cuarta parte»; otro → «0,13 veces»
export function fraseDuplicar(l: Ley): string; // «A doble distancia la fuerza sería la cuarta parte.»
export function xARadio(x: number, g: Geometria): number;
export function radioAX(r: number, g: Geometria): number; // inversas, recortadas

// src/lib/tutor/herramientas.ts  (zod compartido por servidor y cliente)
export const CONCEPTOS = [
  'masa',
  'distancia',
  'inverso-cuadrado',
  'atraccion-mutua',
  'tres-cuerpos',
] as const;
export const esquemaAjustarLey: z.ZodType<{ m1: number; m2: number; r: number }>; // rangos de LIMITES, finitos
export const esquemaMostrarOrbita: z.ZodType<{ slug: Slug }>; // z.enum(SLUGS)
export const esquemaRegistrarRespuesta: z.ZodType<{ concepto: Concepto; acierto: boolean }>;
export const esquemaPeticion: z.ZodType<{ mensajes: UIMessage[]; nivel: 1 | 2 | 3 }>; // límites del servidor

// src/lib/tutor/nivel.ts
export interface EstadoNivel {
  nivel: 1 | 2 | 3;
  racha: number;
}
export function siguienteNivel(e: EstadoNivel, acierto: boolean): EstadoNivel; // 2 aciertos seguidos suben, 2 fallos seguidos bajan, tope 1 a 3, la racha se pone a 0 al cambiar

// src/lib/tutor/{limitador,modo,errores,reducido,prompt,manejador}.ts
export function crearLimitador(
  max: number,
  ventanaMs: number,
): (ip: string, ahora: number) => { permitido: boolean; reintentarEnS: number };
export function elegirModo(env: { clave?: string; proveedor?: string }): 'modelo' | 'reducido'; // clave vacía o proveedor ≠ google → 'reducido'
export function mensajeDeError(causa: unknown): string; // clave inválida | cuota | red | otro, en castellano
export interface PreguntaFija {
  id: string;
  nivel: 1 | 2 | 3;
  concepto: Concepto;
  pregunta: string;
  ley?: Ley;
  opciones: { texto: string; correccion: string; acierto: boolean }[];
}
export const PREGUNTAS_FIJAS: readonly PreguntaFija[]; // al menos 2 por nivel
export function siguientePregunta(nivel: 1 | 2 | 3, vistas: readonly string[]): PreguntaFija; // del nivel y no vista; si se agotan, reinicia
// GET /api/tutor → 200 { modo }. POST → flujo de mensajes de la UI; 400 entrada inválida, 413 cuerpo grande,
// 429 + Retry-After, 503 { codigo: 'modo_reducido' } sin clave. Los errores JSON llevan { codigo, mensaje }.
```

## Criterios de aceptación

**Vitest** (`tests/unit/ley/`, `tests/unit/tutor/`, `tests/repo/tutor.test.ts`)

1. **Ley pura.** Dados m₁, m₂ y r, cuando se calcula, entonces `fuerza` vale m₁·m₂/r²; para cualquier ley válida (incluidas 20 aleatorias con semilla fija) `razonAlDuplicarDistancia` vale 0,25 (±1e-12) y `fraseDuplicar` dice «la cuarta parte»; `describirRazon(0,5)` dice «la mitad»; `limitarLey` recorta y redondea a 0,5 y trata NaN; `xARadio` y `radioAX` son inversas y no salen de [1, 10].
2. **Validación zod.** Dada una petición, entonces se rechazan: más de 20 mensajes, texto de más de 1000 caracteres, rol ajeno a `user`/`assistant`, nivel fuera de 1 a 3 y partes desconocidas; y las herramientas rechazan masas o distancias fuera de [1, 10], `NaN`, un `slug` fuera de los seis (`'x'`, `'../'`) y un concepto o `acierto` inválidos; los casos válidos pasan.
3. **Nivel y modo reducido.** Dado el reductor, cuando llegan dos aciertos seguidos sube, con dos fallos baja, nunca sale de 1 a 3 y la racha se reinicia al cambiar; `PREGUNTAS_FIJAS` tiene una única opción correcta por pregunta, una corrección no vacía por opción y al menos 2 preguntas por nivel; `siguientePregunta` respeta el nivel y no repite hasta agotar.
4. **Límite y selección.** Dado el limitador, cuando una IP supera 10 peticiones en la ventana, entonces recibe `permitido: false` con `reintentarEnS` > 0, otra IP no se ve afectada y al pasar la ventana vuelve a permitirse (reloj inyectado); `elegirModo` da `reducido` con clave vacía, ausente o proveedor distinto de `google`, y `modelo` en otro caso; `mensajeDeError` distingue clave inválida (401/403), cuota (429), red y otro, y su texto nunca contiene el mensaje original.
5. **Ruta con modelo simulado.** Dado `crearManejador` con un modelo simulado, cuando se hace POST con una petición válida, entonces la respuesta es un flujo con el texto troceado en orden; el modelo recibió el prompt de sistema (menciona gravitación y el nivel recibido, y no la clave), las tres herramientas y el tope de tokens; una llamada simulada a `ajustar_ley` llega al flujo como parte de herramienta; y `GET` devuelve `{ modo: 'modelo' }`.
6. **Ruta ante fallos.** Dado `crearManejador`, cuando no hay clave, entonces `GET` da `{ modo: 'reducido' }` y `POST` da 503 `modo_reducido` sin invocar el modelo; cuando el modelo simulado falla con 401, 429 o error de red, el flujo lleva el mensaje en castellano correspondiente y no el original ni la clave de prueba; un cuerpo no JSON o inválido da 400, uno mayor de 32 KB da 413 y la petición 11 de la misma IP da 429 con `Retry-After`. Un invariante de `tests/repo/tutor.test.ts` comprueba que ningún archivo de `src/components/`, `src/store/` ni `src/app/` fuera de `api/` cita `GOOGLE_GENERATIVE_AI_API_KEY`, y que `.env.example` define esa variable, `LLM_PROVIDER` y `LLM_MODEL`.

**Playwright** (`tests/e2e/ley.spec.ts`, `tests/e2e/tutor.spec.ts`; el servidor arranca sin clave)

7. **Ley con deslizadores y teclado.** Dada la portada, cuando se mueven los deslizadores de masa y de distancia con el ratón y con las flechas, entonces `F` y la frase se actualizan con el valor calculado, la sección está entre el hero y `#galeria`, y cada deslizador mide al menos 44 px.
8. **Masa arrastrable.** Dado el SVG, cuando se arrastra la masa derecha (ratón) y se usan las flechas sobre ella (`role="slider"`), entonces `r` cambia, el deslizador de distancia refleja el valor y no se sale de [1, 10].
9. **Chat en modo reducido.** Dada la portada sin clave, cuando carga, entonces se ve «Modo reducido: sin modelo de lenguaje», el tutor propone una predicción con opciones, al elegir una muestra su corrección fija y el nivel cambia tras dos aciertos.
10. **Herramienta simulada.** Dado `/api/tutor` interceptado con un modelo simulado que pide `ajustar_ley {m1: 8, m2: 2, r: 2}` y `mostrar_orbita {slug: 'lagrange'}`, cuando se envía un mensaje, entonces los deslizadores pasan a esos valores, aparece un enlace a `/orbitas/lagrange`, y una llamada con valores fuera de rango no los cambia.
11. **La clave no se expone.** Dado un servidor adicional con `GOOGLE_GENERATIVE_AI_API_KEY` de prueba, cuando se piden la portada, sus scripts de `.next/static` y `GET /api/tutor`, entonces ninguno contiene el valor de la clave ni el nombre de la variable, y el GET da `modo: 'modelo'`.
12. **Sin regresiones.** Dada la portada a 375, 768 y 1440 px, entonces no hay desbordamiento horizontal, siguen el `h1`, la escena y la galería de GRV-03 y GRV-04, y la suite E2E anterior pasa sin cambios (salvo las comprobaciones de orden de secciones que lo exijan).

## Orden de trabajo

0. `docs`: esta spec. Antes de los tests, el arquitecto instala `ai`, `@ai-sdk/google` y `@ai-sdk/react` y corrige la sección «API del SDK» con lo que diga la documentación instalada, y confirma el modelo por defecto.
1. `test`: criterios 1 a 12 en rojo. Los de la ruta usan el modelo simulado. Este commit marca la spec como aprobada.
2. `feat` (`backend`): `src/lib/ley/`, `src/lib/tutor/`, ruta, dependencias y `.env.example`. `devops`: segundo servidor en `playwright.config.ts` (criterio 11, tras el primero) y regla de ESLint para que `ai` solo se importe desde `src/lib/tutor/` y `@ai-sdk/react` desde `src/components/tutor/`.
3. `feat` (`frontend`): extensión del almacén, `src/components/ley/` (con el chat del tutor) y la sección en `page.tsx`. Después `docs` (`documentacion`: ticket y estado; `arquitecto`: fila del deslizador/aviso en `DESIGN.md` si cambia) y revisión.

## Riesgos y límites

- **API del SDK sin verificar al redactar.** Nombres de la serie 5/6; el paso 0 los confirma antes de escribir tests.
- **Límite por IP** en memoria de instancia: no escala y el encabezado es falsificable fuera del proxy. Documentado, no resuelto.
- **Un solo proveedor.** `LLM_PROVIDER` ≠ `google` degrada a modo reducido; añadir otro es un ticket aparte.
- **Segundo servidor de Playwright** (criterio 11): depende de que arranque tras la compilación del primero; si Playwright no garantiza el orden, se serializa con un comando que compile y lance ambos.
- **Calidad del modelo.** El tutor puede equivocarse en física; el prompt lo acota a gravitación y a frases cortas, pero no se evalúa su acierto.

## Decisiones tras la revisión (prevalecen sobre lo anterior)

- **Paso 0 hecho:** instalado `ai@7.0.156`, `@ai-sdk/google@4.0.107` y `@ai-sdk/react`; existen `streamText`, `convertToModelMessages`, `stepCountIs`, `tool`, `DefaultChatTransport`, `lastAssistantMessageIsCompleteWithToolCalls`, `useChat` y la variable `GOOGLE_GENERATIVE_AI_API_KEY`. El modelo simulado de `ai/test` es `MockLanguageModelV4` (también existe V3). Quien implemente verifica los detalles de firma contra lo instalado antes de escribir tests y avisa si algo difiere.
- **Criterio 11 sin segundo servidor:** se prueba (a) en Vitest, que el manejador con una clave de prueba no la devuelve ni la registra en ninguna respuesta (ni en errores), y (b) en Playwright, que `GET /api/tutor` solo devuelve `{ modo }` y que ningún script de `.next/static` ni la portada contienen `GOOGLE_GENERATIVE_AI_API_KEY`. No se añade nada a `playwright.config.ts`.
- **Propiedad:** `src/lib/ley/` pasa a `frontend`; `src/lib/tutor/` y la ruta, a `backend`. La regla de ESLint de `ai` y `@ai-sdk/*` (solo desde `src/lib/tutor/` y el hook de cliente que se indique) la añade `devops`.
- **Presupuesto:** como mucho 6 tests E2E y los de Vitest de los criterios; sin campañas de variantes ni revisiones extra de la spec.
- **Límites de uso (añadido):** el cliente envía una petición cada vez (sin envíos en paralelo) y con al menos 2 s entre envíos; la conversación se corta en 20 mensajes. Si el servidor responde 429 o el proveedor devuelve error de cuota, el chat pasa en esa sesión al modo reducido con el aviso «Límite de uso del modelo alcanzado: modo reducido». Se prueba en Vitest (error de cuota simulado → modo reducido) y en la lógica del cliente.
- **Solo el tema de la web (añadido):** el prompt de sistema restringe las respuestas a la ley de gravitación universal y al contenido de esta aplicación (masas, distancia, fuerza, órbitas, problema de los tres cuerpos y las seis soluciones); fuera de tema, rechazo breve y amable que reconduce al tema, y no cambia de rol aunque se lo pidan. Se prueba que el prompt enviado al modelo contiene estas restricciones. Límite asumido: una restricción por instrucciones no es infalible; se mitiga con `maxOutputTokens` bajo y los topes de entrada.
