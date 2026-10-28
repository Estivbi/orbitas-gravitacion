import { Color, ColorManagement } from 'three';

// Los colores de pantalla deben ser exactamente los de los tokens: sin conversión de espacio de color.
// Es un ajuste global de three y se toca una sola vez, al cargar el módulo.
ColorManagement.enabled = false;

/** Colores de los cuerpos, por índice (DESIGN.md). */
const CUERPOS = ['electric-iris', 'saffron-spark', 'orbit-teal'];
/** Violeta, azafrán, verde azulado y blanco: el orden de `TAMANO_PALETA`. */
const AMBIENTE = ['electric-iris', 'saffron-spark', 'deep-verdant', 'bone-white'];

export interface PaletaEscena {
  fondo: Color;
  cuerpos: Color[];
  ambiente: Color[];
}

function colorDeToken(leerToken: (propiedad: string) => string, nombre: string): Color {
  const valor = leerToken(`--color-${nombre}`).trim();
  if (valor === '') {
    throw new Error(`Falta el token --color-${nombre} en el documento`);
  }
  return new Color(valor);
}

/** Construye la paleta a partir de una función que devuelve el valor de un token CSS (parte pura, sin DOM). */
export function construirPaleta(leerToken: (propiedad: string) => string): PaletaEscena {
  return {
    fondo: colorDeToken(leerToken, 'void'),
    cuerpos: CUERPOS.map((nombre) => colorDeToken(leerToken, nombre)),
    ambiente: AMBIENTE.map((nombre) => colorDeToken(leerToken, nombre)),
  };
}

/** Lee los `--color-*` de `globals.css`, la única fuente de los colores. */
export function leerPaleta(): PaletaEscena {
  const estilo = getComputedStyle(document.documentElement);
  return construirPaleta((propiedad) => estilo.getPropertyValue(propiedad));
}
