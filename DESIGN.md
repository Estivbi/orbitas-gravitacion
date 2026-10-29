# DESIGN.md — orbitas-gravitacion

Fuente de verdad visual. El agente `frontend` la lee antes de tocar interfaz. Nada de valores a mano fuera de estos tokens.

## Dirección

- **Una frase:** un vacío negro donde solo flotan una tipografía enorme y ligera y las órbitas dibujadas con triángulos.
- **Referencia principal:** una referencia de estilo oscura, guardada íntegra en `docs/diseno/referencia/`. De ella se toma únicamente el lenguaje de diseño: no se copian su contenido, su logotipo ni su nombre. Las maquetas de `docs/diseno/referencia/` aportan la lógica técnica de la escena y la ley interactiva, no su estilo original.
- **Intensidad de estilo:** ALTA (expresiva).

## Tokens

Los colores viven en el bloque `@theme` de `src/app/globals.css`. Cambiar el acento es editar una línea ahí y su fila de esta tabla.

### Color

| Rol | Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|---|
| Fondo | `--color-void` | `bg-void` | `#000000` | Todas las secciones. Sin paneles, bordes, sombras ni tarjetas con fondo |
| Texto | `--color-bone-white` | `text-bone-white` | `#ffffff` | Titulares, cuerpo y foco visible |
| Texto secundario | `--color-ash-gray` | `text-ash-gray` | `#9a9a9a` | Enlaces fantasma, etiquetas de apoyo |
| Texto terciario | `--color-silver-mist` | `text-silver-mist` | `#bdbdbd` | Cuerpo de apoyo y pies de texto |
| Acento principal | `--color-electric-iris` | `bg-electric-iris` | `#8052ff` | Único botón relleno por vista, deslizadores y acentos pequeños. Nunca en bloques grandes ni en texto pequeño: sobre negro da ≈4,6:1 |
| Énfasis | `--color-saffron-spark` | `text-saffron-spark` | `#ffb829` | Etiquetas en mayúsculas y subrayado del control activo |
| Tercer tono | `--color-deep-verdant` | `text-deep-verdant` | `#15846e` | Campo ambiental de partículas |
| Tercer cuerpo | `--color-orbit-teal` | `text-orbit-teal` | `#2bbf9f` | Tercer cuerpo y su estela. Excepción deliberada: `#15846e` queda apagado sobre negro |

Colores de los tres cuerpos, por índice: cuerpo 0 `electric-iris`, cuerpo 1 `saffron-spark`, cuerpo 2 `orbit-teal`.

Sin degradados en componentes. Error, éxito y aviso se definen cuando haya formularios (el aviso del modo reducido usa `saffron-spark`).

Excepción de color: `src/app/icon.svg` no lee variables CSS, así que su `fill` es un literal igual a `--color-electric-iris`. Una prueba de repositorio ata ese valor al token de `globals.css`; si el acento cambia, cambian los dos.

> Los colores violeta y ámbar son una decisión del proyecto. Todo pasa por los tokens, así que cambiarlos no toca ningún componente.

### Tipografía

- Familia única: Inter variable (subconjunto latino, licencia OFL), autoalojada con `next/font/local` (GRV-03, ADR 0005), como sustituta de la tipografía de la referencia.
- Titulares (`h1` a `h6`): peso 400 en cualquier ancho, de 78 a 113 px en escritorio con `clamp` para móvil, interlineado 1,1 y tracking −0,04 em. La jerarquía sale de la escala, no del peso.
- Cuerpo: 18 px. Peso 300 con menos de 640 px de ancho de viewport y peso 200 con 640 px o más; por debajo de 18 px nunca peso 200 (300 o 400).
- Etiquetas: 14 px, peso 600, mayúsculas, tracking 0,025 em.
- Cifras con `font-variant-numeric: tabular-nums`.

| Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|
| `--font-sans` | `font-sans` | `var(--fuente-inter)`, después `ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` | Única familia. `--fuente-inter` la define `next/font/local` en el layout |

Escala de texto. Cada tamaño tiene tres tokens, que `globals.css` declara juntos; `titular-lg` y `display` usan `clamp` (46 px en móvil, 78 px y 113 px en escritorio) y por eso su tamaño se da como fórmula.

| Clase Tailwind | Tamaño | Interlineado | Espaciado entre letras | Uso |
|---|---|---|---|---|
| `text-etiqueta` | `--text-etiqueta`: 14 px | `--text-etiqueta--line-height`: 1.2 | `--text-etiqueta--letter-spacing`: 0.025em | Etiquetas, botones, enlace de salto y pie |
| `text-cuerpo` | `--text-cuerpo`: 18 px | `--text-cuerpo--line-height`: 1.5 | `--text-cuerpo--letter-spacing`: normal | Texto corrido |
| `text-titular-xs` | `--text-titular-xs`: 27 px | `--text-titular-xs--line-height`: 1 | `--text-titular-xs--letter-spacing`: -0.02em | Titulares menores |
| `text-subtitulo` | `--text-subtitulo`: 36 px | `--text-subtitulo--line-height`: 1.2 | `--text-subtitulo--letter-spacing`: -0.02em | Subtítulos |
| `text-titular-sm` | `--text-titular-sm`: 42 px | `--text-titular-sm--line-height`: 1.2 | `--text-titular-sm--letter-spacing`: -0.04em | Titulares de sección |
| `text-titular` | `--text-titular`: 48 px | `--text-titular--line-height`: 1.1 | `--text-titular--letter-spacing`: -0.04em | Titulares |
| `text-titular-lg` | `--text-titular-lg`: clamp(46px, 32.7px + 3.54vw, 78px) | `--text-titular-lg--line-height`: 1.1 | `--text-titular-lg--letter-spacing`: -0.04em | `h1` de la portada |
| `text-display` | `--text-display`: clamp(46px, 22.4px + 6.29vw, 113px) | `--text-display--line-height`: 1.1 | `--text-display--letter-spacing`: -0.04em | Titulares de escala máxima |

### Espaciado, radios y elevación

| Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|
| `--spacing` | `p-*`, `gap-*`, `m-*`, `size-*`… | 6 px | Unidad base: cada clase numérica es un múltiplo de 6 px |
| `--radius-boton` | `rounded-boton` | 24 px | Radio de los botones |
| `--container-pagina` | `max-w-pagina` | 1280 px | Ancho máximo del contenido |

- Escala: 6, 12, 18, 24, 30, 36, 60, 96, 120 px (`*-1`, `*-2`, `*-3`, `*-4`, `*-5`, `*-6`, `*-10`, `*-16`, `*-20`).
- Separación entre secciones de 60 a 120 px.
- Sin sombras, sin bordes, sin elevación: los elementos flotan y solo los separa el espacio.

### Movimiento

- Transiciones de 250 ms con curva suave, solo en opacidad y escala.
- Con `prefers-reduced-motion`: sin giro automático, simulación en pausa al cargar y campo ambiental estático.

## Componentes base

- **Botón principal:** relleno `electric-iris`, texto blanco en mayúsculas de 14 px, peso 600, radio 24 px. Uno solo por vista (en el detalle, «Reproducir/Pausar»).
- **Enlace fantasma:** sin contenedor, `ash-gray`, blanco al pasar el ratón o al enfocar.
- **Deslizador:** `accent-color` violeta (`--color-electric-iris`), con etiqueta ámbar y valor encima. Área táctil de al menos 44 px de alto y de ancho; el foco es el contorno blanco global.
- **Selector de texto:** grupo de radios (`role="radiogroup"`) con aspecto de texto, sin segmentos con borde, y subrayado ámbar en la opción activa. Una sola parada de tabulación y flechas nativas. El nombre accesible del grupo es su etiqueta visible (ámbar, mayúsculas) y el foco se dibuja sobre la etiqueta de la opción. Lo usan «Velocidad de reproducción» (`0,25×` a `4×`) y «Ordenar por» (Catálogo, Periodo, Energía).
- **Telemetría:** columnas de cifras tabulares, grandes y ligeras (27 px en móvil y 42 px desde 900 px), con etiqueta ámbar en mayúsculas y sin recuadros, bordes ni fondos. Las cifras en vivo llevan `aria-hidden="true"` y cada columna añade un texto estático legible (valor inicial o extremo del periodo) para los lectores de pantalla; sin regiones `aria-live` ni `<output>`. Por debajo de 900 px va justo bajo el visor.
- **Navegación entre órbitas:** enlaces fantasma «Volver a la galería», «Anterior: X» y «Siguiente: Y», sin contenedor.
- **Tarjetas:** se admite un contenedor con borde fino (1 px, color gris oscuro del tema: `ash-gray` al 30 %, sin token nuevo) y radio 24 px solo donde ayuden a orientar (galería y paneles de controles); sin sombras ni fondos de color.
- **Miniatura de órbita:** SVG suelto con su nombre debajo, sin tarjeta.
- **Escena:** estelas hechas de triángulos pequeños (contorno fino, opacidad por vértice) y un campo ambiental de unos 300 triángulos a baja opacidad.
- **Foco:** contorno blanco de 2 px con 3 px de separación, nunca violeta (regla global `:focus-visible`). En el lienzo de la escena el contorno se dibuja hacia dentro.

## Hacer / No hacer

- Hacer: titulares en peso 400 y a gran escala; fondo `#000000` en todas las secciones; el violeta solo en el botón principal y los deslizadores; dos columnas asimétricas, con el texto y la escena en zigzag.
- No hacer: tarjetas, paneles, bordes o sombras; degradados en componentes; varios botones rellenos juntos; cuerpo en peso 200 por debajo de 18 px; valores sueltos tipo `bg-[#8052ff]` fuera de los tokens.

## Responsive y accesibilidad

- Puntos de corte: móvil (menos de 640 px), tablet (de 640 px hasta 1024 px) y escritorio. La composición pasa a una columna por debajo de 900 px.

| Token | Clase Tailwind | Valor | Uso |
|---|---|---|---|
| `--breakpoint-columnas` | `columnas:*`, `max-columnas:*` | 900 px | Corte de una a dos columnas (texto y escena) |

- Contraste mínimo AA (4,5:1), foco visible y objetivos táctiles de al menos 44 px (botones, deslizadores y etiquetas de los radios, en alto y en ancho).
- Un solo tema, oscuro.
