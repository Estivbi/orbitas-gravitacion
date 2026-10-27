# DESIGN.md — orbitas-gravitacion

Fuente de verdad visual. El agente `frontend` la lee antes de tocar interfaz. Nada de valores a mano fuera de estos tokens.

## Dirección

- **Una frase:** {{NORTE_VISUAL}}
- **Referencia principal:** {{REFERENCIA}} (Refero Styles u otra). Solo una; las demás aportan detalles concretos y se nombran aquí.
- **Intensidad de estilo:** {{BAJA|MEDIA|ALTA}} (baja: contenida; alta: expresiva).

## Tokens

### Color
| Rol | Token | Valor |
|---|---|---|
| Fondo | `--bg` | |
| Superficie | `--surface` | |
| Texto | `--text` | |
| Texto secundario | `--text-muted` | |
| Acento | `--accent` | |
| Error / éxito / aviso | `--danger` / `--ok` / `--warn` | |

### Tipografía
- Títulos: 
- Cuerpo: 
- Mono: 
- Escala: 

### Espaciado, radios y elevación
- Escala de espaciado: 
- Radios: 
- Sombras / bordes: 

### Movimiento
- Duraciones y curvas: 
- Respeta `prefers-reduced-motion`.

## Componentes base
Botón, input, tarjeta, navegación, modal: estados (normal, hover, foco, deshabilitado, error) y variantes.

## Hacer / No hacer
- Hacer: 
- No hacer: 

## Responsive y accesibilidad
- Puntos de corte: móvil, tablet, escritorio.
- Contraste mínimo AA, foco visible, objetivos táctiles de al menos 44 px.
