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
});
