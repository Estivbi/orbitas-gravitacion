# GRV-08 · Recorrido guiado

**Estado:** pendiente de aprobación · **Tamaño:** M · **Rama:** `feature/recorrido-guiado` → `develop`

## Contexto

La portada se entiende sola, pero quien llega por primera vez no sabe qué tocar ni en qué orden. Se añade una visita guiada, tipo diapositivas, que recorre la portada, cuenta la historia y explica cómo usar cada parte. Funciona sin IA y sin clave.

## Alcance

- Componente `RecorridoGuiado`, montado una sola vez en el layout, con una tarjeta de paso y un resalte de la sección explicada.
- Seis pasos sobre la portada: bienvenida, historia, ley, galería, tutor y cierre. Cada uno lleva título, un texto breve y una línea «Qué hacer».
- Los pasos son datos puros en `src/lib/recorrido/` y las secciones se marcan con `data-recorrido="<id>"`.
- Estado (`abierto`, `paso`) en el almacén de Zustand, con acciones `abrirRecorrido`, `cerrarRecorrido`, `siguientePaso` y `pasoAnterior`, para que GRV-09 pueda lanzarlo desde el asistente.
- Botón «Guía» en la cabecera (también en el menú móvil) y una invitación discreta en el hero.

## Fuera de alcance

El asistente global (GRV-09), una guía propia de la página de cada órbita, imágenes o vídeo en los pasos, librerías externas de tours y cualquier medición de uso.

## Decisiones

- **No se abre sola.** El estado no persiste tras recargar (regla del proyecto), así que no se puede recordar que ya se vio. Se ofrece, no se impone.
- **Sin dependencias nuevas.** Son seis pasos: el código propio respeta los tokens y la accesibilidad mejor que una librería.
- **Ventana no modal.** No bloquea la página ni atrapa el foco: se puede seguir usando la web.

## Criterios

1. **Pasos.** Dados los datos del recorrido, entonces hay seis pasos con `id` único, título, texto y «Qué hacer» no vacíos, y cada `id` corresponde a un elemento `data-recorrido` de la portada. _(Vitest sobre `src/lib/recorrido/` y E2E para los elementos)_
2. **Apertura.** Dada la portada, cuando se pulsa «Guía» (cabecera, menú móvil o invitación del hero), entonces se abre la tarjeta en el paso 1 y la sección correspondiente queda a la vista y resaltada. Al cargar la página no está abierta. _(E2E)_
3. **Navegación.** Dada la visita abierta, cuando se pulsa «Siguiente» o «Anterior», entonces cambia el paso, se muestra «Paso n de 6», la sección nueva se resalta y la anterior deja de estarlo; en el primer paso «Anterior» está deshabilitado y en el último «Siguiente» pasa a «Terminar». _(E2E)_
4. **Cierre.** Dada la visita abierta, cuando se pulsa «Saltar», «Terminar» o la tecla Escape, entonces se cierra, desaparece el resalte y el foco vuelve al botón que la abrió. _(E2E)_
5. **Accesibilidad.** Dada la visita abierta, entonces la tarjeta es un `dialog` con nombre accesible, recibe el foco al abrirse, se maneja entera con teclado y no usa colores fuera de los tokens; con `prefers-reduced-motion` el desplazamiento no es animado. _(E2E y revisión de `diseno.spec`)_
6. **Móvil.** Dados 375, 768 y 1440 px de ancho, cuando la visita está abierta, entonces la página no desborda y la tarjeta no tapa por completo la sección resaltada (en móvil va anclada abajo). _(E2E)_
7. **Estado compartido.** Dado el almacén, cuando se llama a `abrirRecorrido`, `siguientePaso`, `pasoAnterior` y `cerrarRecorrido`, entonces el paso se mantiene entre 0 y 5 y `abierto` refleja la última acción; nada se guarda al recargar. _(Vitest)_

## Relación con GRV-09

El asistente podrá lanzar la visita con `abrirRecorrido`. Además, GRV-09 debe montarse en el layout (no dentro de una página) y guardar la conversación en el almacén: así sobrevive a navegar entre portada y órbitas sin recargar, que hoy se pierde porque el tutor vive dentro de la portada.

## Riesgos

Resaltar una sección con el 3D en pantalla no debe provocar saltos de diseño: el resalte es un contorno que no ocupa espacio.
