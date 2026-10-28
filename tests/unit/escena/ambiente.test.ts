import { describe, expect, it } from 'vitest';
import { TAMANO_PALETA, generarCampoAmbiental } from '@/lib/escena/ambiente';

describe('GRV-03 · criterio 8: campo ambiental', () => {
  it('es determinista: misma semilla, mismos valores', () => {
    const a = generarCampoAmbiental(300, 7);
    const b = generarCampoAmbiental(300, 7);
    expect(Array.from(b.posiciones)).toEqual(Array.from(a.posiciones));
    expect(Array.from(b.paleta)).toEqual(Array.from(a.paleta));
    expect(Array.from(b.alfas)).toEqual(Array.from(a.alfas));
  });

  it('otra semilla da otro campo', () => {
    const a = generarCampoAmbiental(300, 7);
    const b = generarCampoAmbiental(300, 8);
    expect(Array.from(b.posiciones)).not.toEqual(Array.from(a.posiciones));
    expect(Array.from(b.alfas)).not.toEqual(Array.from(a.alfas));
    expect(Array.from(b.paleta)).not.toEqual(Array.from(a.paleta));
  });

  it('tiene exactamente la cantidad pedida de partículas', () => {
    for (const cantidad of [0, 1, 300, 1000]) {
      const campo = generarCampoAmbiental(cantidad, 3);
      expect(campo.posiciones).toHaveLength(cantidad * 3);
      expect(campo.paleta).toHaveLength(cantidad);
      expect(campo.alfas).toHaveLength(cantidad);
    }
  });

  it('cada partícula está entre 4,5 y 15,5 del origen, con alfa en [0,18, 0,58]', () => {
    const campo = generarCampoAmbiental(500, 11);
    for (let i = 0; i < 500; i++) {
      const distancia = Math.hypot(
        campo.posiciones[3 * i]!,
        campo.posiciones[3 * i + 1]!,
        campo.posiciones[3 * i + 2]!,
      );
      expect(distancia).toBeGreaterThanOrEqual(4.5 - 1e-6);
      expect(distancia).toBeLessThanOrEqual(15.5 + 1e-6);
      expect(campo.alfas[i]).toBeGreaterThanOrEqual(0.18 - 1e-6);
      expect(campo.alfas[i]).toBeLessThanOrEqual(0.58 + 1e-6);
    }
  });

  it('el índice de paleta es un entero válido y se usan varios colores', () => {
    const campo = generarCampoAmbiental(500, 5);
    expect(TAMANO_PALETA).toBe(4);
    const usados = new Set<number>();
    for (const indice of campo.paleta) {
      expect(Number.isInteger(indice)).toBe(true);
      expect(indice).toBeGreaterThanOrEqual(0);
      expect(indice).toBeLessThanOrEqual(TAMANO_PALETA - 1);
      usados.add(indice);
    }
    expect(usados.size).toBeGreaterThan(1);
  });

  describe('dispersión', () => {
    const cantidad = 2000;
    const campo = generarCampoAmbiental(cantidad, 11);
    const radios = Array.from({ length: cantidad }, (_, i) =>
      Math.hypot(
        campo.posiciones[3 * i]!,
        campo.posiciones[3 * i + 1]!,
        campo.posiciones[3 * i + 2]!,
      ),
    );
    const ordenados = [...radios].sort((a, b) => a - b);
    const percentil = (p: number) => ordenados[Math.floor(p * (cantidad - 1))]!;

    it('los radios se reparten por toda la cáscara y no se concentran', () => {
      expect(percentil(0.05)).toBeLessThan(9);
      expect(percentil(0.95)).toBeGreaterThan(13);
      expect(percentil(1) - percentil(0)).toBeGreaterThan(7);
      expect(percentil(0.5)).toBeGreaterThan(7);
      expect(percentil(0.5)).toBeLessThan(13);
    });

    it('hay partículas a ambos lados de cada eje', () => {
      for (const eje of [0, 1, 2]) {
        let positivas = 0;
        let negativas = 0;
        for (let i = 0; i < cantidad; i++) {
          const valor = campo.posiciones[3 * i + eje]!;
          if (valor > 0) positivas++;
          if (valor < 0) negativas++;
        }
        expect(positivas, `eje ${eje} positivo`).toBeGreaterThan(0.2 * cantidad);
        expect(negativas, `eje ${eje} negativo`).toBeGreaterThan(0.2 * cantidad);
      }
    });

    it('al menos el 90 % de las posiciones son distintas', () => {
      const distintas = new Set<string>();
      for (let i = 0; i < cantidad; i++) {
        distintas.add(
          `${campo.posiciones[3 * i]},${campo.posiciones[3 * i + 1]},${campo.posiciones[3 * i + 2]}`,
        );
      }
      expect(distintas.size).toBeGreaterThanOrEqual(0.9 * cantidad);
    });

    it('el alfa recorre buena parte de su rango y no es constante', () => {
      const alfas = Array.from(campo.alfas);
      expect(Math.max(...alfas) - Math.min(...alfas)).toBeGreaterThan(0.3);
    });

    it('se usan las cuatro entradas de la paleta', () => {
      const usados = new Set(campo.paleta);
      expect(usados.size).toBe(TAMANO_PALETA);
    });
  });
});
