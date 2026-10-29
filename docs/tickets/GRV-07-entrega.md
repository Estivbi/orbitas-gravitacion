# GRV-07 · Entrega

Qué se construyó, cómo replicarlo y qué se aprendió. Este ticket no añade funciones: deja el proyecto ejecutable por cualquiera con un comando y explicado en el README.

## Resumen

- **README** para quien llega al repositorio: qué es, cómo verlo y ejecutarlo, variables, cómo probar el tutor con clave propia, pruebas, arquitectura, decisiones con su coste, mediciones, límites, seguridad y créditos.
- **Docker:** `docker compose up --build` sirve la aplicación en <http://localhost:3000>. Imagen multietapa (`deps`, `build`, `runtime`) sobre `node:22-alpine`, con la salida `standalone` de Next y usuario sin privilegios.
- **`URL_SITIO` como `ARG`** de la etapa de build, porque se lee al compilar (cierra el pendiente de GRV-04).

## Cómo replicarlo

1. **Salida standalone solo en Docker.** `next.config.ts` activa `output: 'standalone'` únicamente si `NEXT_OUTPUT=standalone`; `next start` y Vercel no cambian. El Dockerfile define esa variable en la etapa de build.
2. **Tres etapas.** `deps` instala con `npm ci` (capa cacheable), `build` compila con `URL_SITIO` y `runtime` copia solo `.next/standalone` y `.next/static` y arranca con `node server.js`.
3. **Compose.** Pasa `URL_SITIO` como argumento de build y las variables del tutor como entorno; lee un `.env` opcional (`required: false`) y declara un `healthcheck` sobre `/`.
4. **Que la imagen no lleve secretos.** `.dockerignore` excluye `.env*` (salvo `.env.example`), `.git`, `.claude` y `docs/privado`. La clave llega en ejecución, nunca se hornea en la imagen.
5. **README honesto.** Cada cifra sale de un ticket ya medido, con su origen; lo no medido se dice como tal.

## Decisiones

- **Marcadores explícitos en vez de datos inventados.** `URL_DESPLEGADA_PENDIENTE` queda en el README hasta que la persona responsable despliegue. La sección «Mediciones» declara que Lighthouse no se ha medido.
- **Sin clave, la imagen funciona.** El tutor arranca en modo reducido; quien revise puede poner su clave en `.env` y volver a arrancar.
- **Clave sin facturación al desplegar,** para acotar el coste de un abuso del tutor (el límite por IP no escala).
- **Límites a la vista.** El README enumera lo que se recortó y por qué, para que nadie lo descubra por su cuenta.

## Mediciones citadas (de GRV-04)

JS inicial de `/`: 183 932 B gzip frente a 181 502 B de base (+2,4 KB). HTML de `/`: 135 KB; detalles: 34–44 KB. Build en frío ≈ 12 s. Chunk de three: 136 KB gzip, aparte. Telemetría ≈ 10 Hz. Tras 12 idas y vueltas, 1 contexto WebGL vivo.

## Cómo probarlo

```bash
docker compose up --build        # abrir http://localhost:3000
curl -s localhost:3000/api/tutor # sin clave: {"modo":"reducido"}
```

Con `GOOGLE_GENERATIVE_AI_API_KEY` en `.env` y de nuevo `docker compose up --build`, la ruta devuelve `{"modo":"modelo"}`.

## Qué NO hace / pendiente

- **Lighthouse sin medir.** Queda para un GRV-06 mínimo (Lighthouse y `robots.txt`); entonces se rellena el README.
- **URL desplegada sin poner.** La pone la persona responsable.
- **La imagen no se ha publicado** en ningún registro ni hay despliegue automático.
- **`URL_SITIO` cambia con la compilación:** otro valor exige `--build`.

## Qué se aprendió

- Una variable que se lee al compilar no puede ir solo en el entorno de ejecución: en Docker es un `ARG`.
- Describir un límite en el README cuesta poco y evita que parezca un fallo oculto.
