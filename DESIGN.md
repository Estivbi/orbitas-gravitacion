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

> Los colores violeta y ámbar son una decisión del proyecto. Todo pasa por los tokens, así que cambiarlos no toca ningún componente.

### Tipografía

- Familia única: Inter, cargada con `next/font` (GRV-03), como sustituta de la tipografía de la referencia.
- Titulares (`h1` a `h6`): peso 400 en cualquier ancho, de 78 a 113 px en escritorio con `clamp` para móvil, interlineado 1,1 y tracking −0,04 em. La jerarquía sale de la escala, no del peso.
- Cuerpo: 18 px. Peso 300 con menos de 640 px de ancho de viewport y peso 200 con 640 px o más; por debajo de 18 px nunca peso 200 (300 o 400).
- Etiquetas: 14 px, peso 600, mayúsculas, tracking 0,025 em.
- Cifras con `font-variant-numeric: tabular-nums`.

### Espaciado, radios y elevación

- Unidad base de 6 px. Escala: 6, 12, 18, 24, 30, 36, 60, 96, 120.
- Separación entre secciones de 60 a 120 px. Ancho máximo del contenido 1280 px.
- Radio de 24 px en botones.
- Sin sombras, sin bordes, sin elevación: los elementos flotan y solo los separa el espacio.

### Movimiento

- Transiciones de 250 ms con curva suave, solo en opacidad y escala.
- Con `prefers-reduced-motion`: sin giro automático, simulación en pausa al cargar y campo ambiental estático.

## Componentes base

- **Botón principal:** relleno `electric-iris`, texto blanco en mayúsculas de 14 px, peso 600, radio 24 px. Uno solo por vista (en el detalle, «Reproducir/Pausar»).
- **Enlace fantasma:** sin contenedor, `ash-gray`, blanco al pasar el ratón o al enfocar.
- **Deslizador:** `accent-color` violeta, con etiqueta y valor encima.
- **Velocidades:** texto con subrayado ámbar en la activa, sin segmentos con borde.
- **Telemetría:** columnas de cifras grandes y ligeras con etiqueta ámbar en mayúsculas, sin recuadros.
- **Miniatura de órbita:** SVG suelto con su nombre debajo, sin tarjeta.
- **Escena:** estelas hechas de triángulos pequeños (contorno fino, opacidad por vértice) y un campo ambiental de unos 300 triángulos a baja opacidad.
- **Foco:** contorno blanco de 2 px con 3 px de separación, nunca violeta (regla global `:focus-visible`). En el lienzo de la escena el contorno se dibuja hacia dentro.

## Hacer / No hacer

- Hacer: titulares en peso 400 y a gran escala; fondo `#000000` en todas las secciones; el violeta solo en el botón principal y los deslizadores; dos columnas asimétricas, con el texto y la escena en zigzag.
- No hacer: tarjetas, paneles, bordes o sombras; degradados en componentes; varios botones rellenos juntos; cuerpo en peso 200 por debajo de 18 px; valores sueltos tipo `bg-[#8052ff]` fuera de los tokens.

## Responsive y accesibilidad

- Puntos de corte: móvil (menos de 640 px), tablet (de 640 px hasta 1024 px) y escritorio. La composición pasa a una columna por debajo de 900 px.
- Contraste mínimo AA (4,5:1), foco visible y objetivos táctiles de al menos 44 px.
- Un solo tema, oscuro.
