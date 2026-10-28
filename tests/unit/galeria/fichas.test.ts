import { describe, expect, it } from 'vitest';
import { trazarMiniatura } from '@/lib/escena/miniatura';
import { SLUGS, integrarPeriodo, obtenerOrbita } from '@/lib/fisica';
import { fichaDeOrbita, resumirCatalogo } from '@/lib/galeria/fichas';
import { TODAS, energiaDe, momentoLinealDe, orbita, trayectoriaDe } from '../fisica/ayudas';

describe('GRV-04 · criterio 9: datos de servidor', () => {
  // Va primero a propósito: la ficha se memoiza por proceso, y este es el único test que mide el
  // coste de prepararlas en frío (cada archivo de pruebas tiene sus propios módulos).
  it('preparar las seis fichas tarda menos de 3 s', () => {
    const inicio = performance.now();
    for (const slug of SLUGS) fichaDeOrbita(slug);
    expect(performance.now() - inicio).toBeLessThan(3000);
  });

  it.each(TODAS)('%s: la miniatura es la de trazarMiniatura(integrarPeriodo(orbita))', (slug) => {
    const ficha = fichaDeOrbita(slug);
    expect(ficha.miniatura).toEqual(trazarMiniatura(integrarPeriodo(obtenerOrbita(slug)!)));
    expect(ficha.miniatura.trazos).toHaveLength(3);
    expect(ficha.orbita).toBe(obtenerOrbita(slug));
  });

  it('las seis miniaturas son distintas entre sí', () => {
    const trazos = SLUGS.map((slug) => fichaDeOrbita(slug).miniatura.trazos.join('|'));
    expect(new Set(trazos).size).toBe(6);
  });

  it('la energía inicial: −√3/2 en Lagrange y −1,287142 en la figura de ocho', () => {
    expect(Math.abs(fichaDeOrbita('lagrange').energiaInicial + Math.sqrt(3) / 2)).toBeLessThan(
      1e-12,
    );
    expect(Math.abs(fichaDeOrbita('figura-de-ocho').energiaInicial + 1.287142)).toBeLessThan(1e-5);
  });

  it.each(TODAS)('%s: la energía inicial es la del estado inicial calculada aparte', (slug) => {
    const esperada = energiaDe(Float64Array.from(orbita(slug).estadoInicial));
    expect(Math.abs(fichaDeOrbita(slug).energiaInicial - esperada)).toBeLessThan(1e-12);
  });

  it.each(TODAS)('%s: distanciaMinima y velocidadMaxima son los de la Trayectoria', (slug) => {
    const ficha = fichaDeOrbita(slug);
    const trayectoria = trayectoriaDe(slug);
    expect(ficha.distanciaMinima).toBe(trayectoria.distanciaMinima);
    expect(ficha.velocidadMaxima).toBe(trayectoria.velocidadMaxima);
  });

  it('la distancia mínima del periodo no es la lectura instantánea de u = 0 (figura de ocho)', () => {
    // En u = 0 la distancia mínima es 1; a lo largo del periodo baja hasta ≈ 0,69.
    const ficha = fichaDeOrbita('figura-de-ocho');
    expect(ficha.distanciaMinima).toBeLessThan(ficha.lecturaInicial.distanciaMinima - 0.1);
  });

  it.each(TODAS)('%s: la lectura inicial es la de u = 0', (slug) => {
    const ficha = fichaDeOrbita(slug);
    const lectura = ficha.lecturaInicial;
    expect(lectura.tiempo).toBe(0);
    expect(lectura.fase).toBe(0);
    expect(Math.abs(lectura.energia - ficha.energiaInicial)).toBeLessThan(1e-12);
    expect(lectura.momentoLineal).toBeLessThan(1e-12);
    expect(lectura.momentoLineal).toBeCloseTo(
      momentoLinealDe(Float64Array.from(orbita(slug).estadoInicial)),
      12,
    );
  });

  it('la lectura inicial instantánea de la figura de ocho y de Lagrange', () => {
    const ocho = fichaDeOrbita('figura-de-ocho').lecturaInicial;
    // Cuerpos en (−1, 0), (1, 0) y (0, 0), con v3 = −2·v1.
    expect(ocho.distanciaMinima).toBeCloseTo(1, 9);
    expect(ocho.velocidadMaxima).toBeCloseTo(2 * Math.hypot(0.34711689, 0.53272494), 9);
    const lagrange = fichaDeOrbita('lagrange').lecturaInicial;
    expect(lagrange.distanciaMinima).toBeCloseTo(Math.sqrt(3), 9);
    expect(lagrange.velocidadMaxima).toBeCloseTo(Math.pow(3, -0.25), 9);
  });

  it.each(TODAS)('%s: dos llamadas devuelven la misma referencia', (slug) => {
    expect(fichaDeOrbita(slug)).toBe(fichaDeOrbita(slug));
  });

  it('resumirCatalogo da seis resúmenes en orden de SLUGS con la energía de cada estado inicial', () => {
    const resumen = resumirCatalogo();
    expect(resumen.map((r) => r.slug)).toEqual([...SLUGS]);
    for (const r of resumen) {
      const o = orbita(r.slug);
      expect(r.nombre).toBe(o.nombre);
      expect(r.periodo).toBe(o.periodo);
      expect(Math.abs(r.energia - energiaDe(Float64Array.from(o.estadoInicial)))).toBeLessThan(
        1e-12,
      );
    }
  });
});
