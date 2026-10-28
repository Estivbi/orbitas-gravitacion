import { describe, expect, it } from 'vitest';
import { construirPaleta } from '@/components/escena/colores';

// Un valor distinto por token: si dos índices se intercambian, el color cambia.
const TOKENS: Record<string, string> = {
  '--color-void': '#010203',
  '--color-bone-white': '#f1f2f3',
  '--color-electric-iris': '#8052ff',
  '--color-saffron-spark': '#ffb829',
  '--color-deep-verdant': '#15846e',
  '--color-orbit-teal': '#2bbf9f',
};

const leer = (propiedad: string) => TOKENS[propiedad] ?? '';

describe('GRV-03 · criterio 12: paleta de la escena', () => {
  it('los cuerpos 0, 1 y 2 son electric-iris, saffron-spark y orbit-teal (DESIGN.md)', () => {
    const { cuerpos } = construirPaleta(leer);
    expect(cuerpos.map((color) => color.getHexString())).toEqual(['8052ff', 'ffb829', '2bbf9f']);
  });

  it('el campo ambiental usa violeta, azafrán, verde azulado y blanco, en ese orden', () => {
    const { ambiente } = construirPaleta(leer);
    expect(ambiente.map((color) => color.getHexString())).toEqual([
      '8052ff',
      'ffb829',
      '15846e',
      'f1f2f3',
    ]);
  });

  it('el fondo es el token void', () => {
    expect(construirPaleta(leer).fondo.getHexString()).toBe('010203');
  });

  it('los canales son los del hexadecimal, sin conversión de espacio de color', () => {
    const [iris] = construirPaleta(leer).cuerpos;
    expect(iris!.r).toBeCloseTo(0x80 / 255, 6);
    expect(iris!.g).toBeCloseTo(0x52 / 255, 6);
    expect(iris!.b).toBeCloseTo(0xff / 255, 6);
  });

  it('falla con un mensaje claro si falta un token', () => {
    expect(() => construirPaleta(() => '')).toThrow(/--color-void/);
  });
});
