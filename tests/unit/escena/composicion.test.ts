import { describe, expect, it } from 'vitest';
import { construirPaleta } from '@/components/escena/colores';
import { crearComposicion } from '@/components/escena/composicion';
import type { Trayectoria } from '@/lib/fisica';

/** Tres cuerpos sobre una circunferencia de radio 1 con periodo 1. */
function trayectoria(): Trayectoria {
  const tiempos = Array.from({ length: 9 }, (_, i) => i / 8);
  const estados = new Float64Array(tiempos.length * 12);
  tiempos.forEach((tiempo, i) => {
    for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
      const angulo = 2 * Math.PI * (tiempo + cuerpo / 3);
      estados[i * 12 + 2 * cuerpo] = Math.cos(angulo);
      estados[i * 12 + 2 * cuerpo + 1] = Math.sin(angulo);
      estados[i * 12 + 6 + 2 * cuerpo] = -2 * Math.PI * Math.sin(angulo);
      estados[i * 12 + 7 + 2 * cuerpo] = 2 * Math.PI * Math.cos(angulo);
    }
  });
  return {
    periodo: 1,
    tiempos: Float64Array.from(tiempos),
    estados,
    radioMaximo: 1,
    distanciaMinima: 1,
    velocidadMaxima: 2 * Math.PI,
  };
}

// `three` solo se importa desde src/components/escena/: aquí se tocan sus objetos por estructura.
interface Atributo {
  count: number;
  version: number;
  getX(i: number): number;
  getY(i: number): number;
  getZ(i: number): number;
}
interface Geometria {
  getAttribute(nombre: string): Atributo;
  drawRange: { start: number; count: number };
}
interface Objeto {
  type: string;
  geometry: Geometria;
}

const TOKENS: Record<string, string> = {
  '--color-void': '#000000',
  '--color-bone-white': '#ffffff',
  '--color-electric-iris': '#ff0000',
  '--color-saffron-spark': '#00ff00',
  '--color-orbit-teal': '#0000ff',
  '--color-deep-verdant': '#ffffff',
};
const PALETA = construirPaleta((propiedad) => TOKENS[propiedad] ?? '');

function crear() {
  const composicion = crearComposicion(trayectoria(), PALETA, 1, 10);
  const objetos = composicion.escena.children as unknown as Objeto[];
  const lineas = objetos.filter((o) => o.type === 'Line');
  const puntos = objetos.filter((o) => o.type === 'Points');
  // Orden de la escena: ambiente, (línea, marcas) × 3 cuerpos, cuerpos.
  return { composicion, lineas, marcas: puntos.slice(1, 4), cuerpos: puntos[4]! };
}

function colores(geometria: Geometria): number[][] {
  const atributo = geometria.getAttribute('aColor');
  return Array.from({ length: atributo.count }, (_, i) => [
    atributo.getX(i),
    atributo.getY(i),
    atributo.getZ(i),
  ]);
}

const ROJO = [1, 0, 0];
const VERDE = [0, 1, 0];
const AZUL = [0, 0, 1];

describe('GRV-03 · criterio 12: colores de los cuerpos en la composición', () => {
  it('el cuerpo i y su estela llevan el color i de la paleta', () => {
    const { lineas, marcas, cuerpos } = crear();
    expect(colores(cuerpos.geometry)).toEqual([ROJO, VERDE, AZUL]);
    [ROJO, VERDE, AZUL].forEach((color, i) => {
      expect(new Set(colores(lineas[i]!.geometry).map(String))).toEqual(new Set([String(color)]));
      expect(new Set(colores(marcas[i]!.geometry).map(String))).toEqual(new Set([String(color)]));
    });
  });
});

describe('GRV-03 · rendimiento: las estelas solo se reconstruyen si cambian u o la longitud', () => {
  const versiones = (lineas: Objeto[], marcas: Objeto[]) =>
    [...lineas, ...marcas].map((o) => o.geometry.getAttribute('position').version);

  it('con los mismos u y longitud no vuelve a subir los buffers', () => {
    const { composicion, lineas, marcas } = crear();
    composicion.actualizar(0.3, 0.5);
    const antes = versiones(lineas, marcas);
    composicion.actualizar(0.3, 0.5);
    composicion.actualizar(0.3, 0.5);
    expect(versiones(lineas, marcas)).toEqual(antes);
  });

  it('si cambia u, se suben los buffers', () => {
    const { composicion, lineas, marcas } = crear();
    composicion.actualizar(0.3, 0.5);
    const antes = versiones(lineas, marcas);
    composicion.actualizar(0.31, 0.5);
    versiones(lineas, marcas).forEach((version, i) => expect(version).toBeGreaterThan(antes[i]!));
  });

  it('si cambia la longitud, se suben los buffers y cambia el trazo dibujado', () => {
    const { composicion, lineas, marcas } = crear();
    composicion.actualizar(0.3, 0.5);
    const antes = versiones(lineas, marcas);
    const dibujadas = lineas[0]!.geometry.drawRange.count;
    composicion.actualizar(0.3, 0.9);
    versiones(lineas, marcas).forEach((version, i) => expect(version).toBeGreaterThan(antes[i]!));
    expect(lineas[0]!.geometry.drawRange.count).toBeGreaterThan(dibujadas);
  });

  it('los cuerpos siguen a u aunque la estela no se reconstruya', () => {
    const { composicion } = crear();
    const a = Array.from(composicion.actualizar(0.3, 0.5).slice(0, 2));
    const b = Array.from(composicion.actualizar(0.3, 0.5).slice(0, 2));
    expect(b).toEqual(a);
    const c = Array.from(composicion.actualizar(0.4, 0.5).slice(0, 2));
    expect(c).not.toEqual(a);
  });
});
