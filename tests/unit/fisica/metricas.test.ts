import { describe, expect, it } from 'vitest';
import { energia, integrarPeriodo, metricas, momentoAngular } from '@/lib/fisica';
import { LAGRANGE, orbita, TODAS, trayectoriaDe } from './ayudas';

describe('GRV-02 · criterio 12: métricas', () => {
  // Cuerpos en (0, 0), (3, 0) y (0, 4): distancias 3, 4 y 5.
  const estado = Float64Array.from([0, 0, 3, 0, 0, 4, 1, 0, 0, 2, 0, -1]);

  it('calcula a mano un estado conocido', () => {
    const m = metricas(estado);
    expect(Math.abs(m.energia - 133 / 60)).toBeLessThanOrEqual(1e-12); // 3 − (1/3 + 1/4 + 1/5)
    expect(Math.abs(m.momentoLineal - Math.sqrt(2))).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(m.momentoAngular - 6)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(m.distanciaMinima - 3)).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(m.velocidadMaxima - 2)).toBeLessThanOrEqual(1e-12);
  });

  it('energia y momentoAngular coinciden con metricas', () => {
    expect(energia(estado)).toBe(metricas(estado).energia);
    expect(momentoAngular(estado)).toBe(metricas(estado).momentoAngular);
  });

  it('Lagrange: distancia mínima √3 y energía −√3/2', () => {
    const m = metricas(Float64Array.from(orbita('lagrange').estadoInicial));
    expect(Math.abs(m.distanciaMinima - Math.sqrt(3))).toBeLessThanOrEqual(1e-12);
    expect(Math.abs(m.energia - LAGRANGE.energia)).toBeLessThanOrEqual(1e-12);
    expect(m.momentoLineal).toBeLessThanOrEqual(1e-12);
  });
});

describe('GRV-02 · criterio 13: extremos de la trayectoria', () => {
  it('Lagrange: distancia mínima √3 y velocidad máxima 3^(−1/4)', () => {
    // Es un valor integrado (tolerancia 1e-10 por paso), no analítico: de ahí 1e-9.
    const t = trayectoriaDe('lagrange');
    expect(Math.abs(t.distanciaMinima - Math.sqrt(3))).toBeLessThanOrEqual(1e-9);
    expect(Math.abs(t.velocidadMaxima - LAGRANGE.omega)).toBeLessThanOrEqual(1e-9);
  });

  it.each(TODAS.filter((slug) => slug !== 'lagrange'))(
    '%s: los extremos difieren menos del 5 % de una referencia muy fina',
    (slug) => {
      const o = orbita(slug);
      const t = trayectoriaDe(slug);
      const referencia = integrarPeriodo(o, { tolerancia: 1e-12, pasoMaximo: o.periodo / 20_000 });

      expect(
        Math.abs(t.distanciaMinima - referencia.distanciaMinima) / referencia.distanciaMinima,
      ).toBeLessThan(0.05);
      expect(
        Math.abs(t.velocidadMaxima - referencia.velocidadMaxima) / referencia.velocidadMaxima,
      ).toBeLessThan(0.05);
    },
  );
});
