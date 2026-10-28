import { describe, expect, it } from 'vitest';
import { estadoEn, type Trayectoria } from '@/lib/fisica';
import {
  MARCAS_POR_PERIODO,
  alfaDeEdad,
  construirEstelas,
  crearDatosEstelas,
  type DatosEstelas,
} from '@/lib/escena/estela';
import { TODAS, trayectoriaDe } from '../fisica/ayudas';

/** Tres cuerpos sobre una circunferencia de radio 1 con periodo 1 y los nodos que se pidan. */
function trayectoriaSintetica(tiempos: number[]): Trayectoria {
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

const UNIFORME = trayectoriaSintetica(Array.from({ length: 11 }, (_, i) => i / 10));
const IRREGULAR = trayectoriaSintetica([0, 0.01, 0.02, 0.03, 0.5, 0.9, 0.95, 1]);

function vertice(datos: DatosEstelas, cuerpo: number, indice: number): number[] {
  const linea = datos[cuerpo]!.linea;
  return [linea[3 * indice]!, linea[3 * indice + 1]!, linea[3 * indice + 2]!];
}

function posicionEsperada(t: Trayectoria, u: number, cuerpo: number): number[] {
  const estado = estadoEn(t, u);
  return [estado[2 * cuerpo]!, estado[2 * cuerpo + 1]!, 0];
}

function esperaCercano(obtenido: number[], esperado: number[]): void {
  esperado.forEach((valor, i) => expect(obtenido[i]).toBeCloseTo(valor, 5));
}

describe('GRV-03 · criterio 6: estelas', () => {
  it('alfaDeEdad es (1 − e)^1,6', () => {
    expect(alfaDeEdad(0)).toBe(1);
    expect(alfaDeEdad(1)).toBe(0);
    expect(alfaDeEdad(0.5)).toBeCloseTo(Math.pow(0.5, 1.6), 10);
  });

  it('la rejilla de marcas es de 240 puntos por periodo', () => {
    expect(MARCAS_POR_PERIODO).toBe(240);
  });

  describe('extremos', () => {
    const casos = [0.3, 0.7321, 0, 0.9999];
    const longitudes = [0.05, 0.5, 1];

    it.each(casos.flatMap((u) => longitudes.map((l) => [u, l] as const)))(
      'u = %d, longitud = %d: el último vértice es el estado en u y el primero el de u − longitud',
      (u, longitud) => {
        const t = trayectoriaDe('figura-de-ocho');
        const destino = crearDatosEstelas(t);
        const { vertices } = construirEstelas(t, u, longitud, destino);
        for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
          esperaCercano(vertice(destino, cuerpo, vertices - 1), posicionEsperada(t, u, cuerpo));
          esperaCercano(vertice(destino, cuerpo, 0), posicionEsperada(t, u - longitud, cuerpo));
        }
      },
    );
  });

  describe('número de vértices', () => {
    const t = trayectoriaDe('figura-de-ocho');
    const n = t.tiempos.length;

    it('la capacidad es n + 1 vértices por cuerpo', () => {
      const destino = crearDatosEstelas(t);
      expect(destino).toHaveLength(3);
      for (const cuerpo of destino) {
        expect(cuerpo.linea).toHaveLength(3 * (n + 1));
        expect(cuerpo.lineaAlfa).toHaveLength(n + 1);
      }
    });

    it.each([0.37, 0.7321, 1 - 1e-9, 1e-9])(
      'con longitud 1 y u = %d (fuera de un nodo) hay n + 1 vértices',
      (u) => {
        const { vertices } = construirEstelas(t, u, 1, crearDatosEstelas(t));
        expect(vertices).toBe(n + 1);
      },
    );

    it('con longitud 1 y u = 0 hay n vértices', () => {
      expect(construirEstelas(t, 0, 1, crearDatosEstelas(t)).vertices).toBe(n);
    });

    it('con longitud 1 y u en un nodo exacto hay n vértices', () => {
      const periodo = t.periodo;
      const k = Array.from(t.tiempos).findIndex(
        (tiempo, i) => i > 0 && i < n - 1 && (tiempo / periodo) * periodo === tiempo,
      );
      expect(k).toBeGreaterThan(0);
      const u = t.tiempos[k]! / periodo;
      expect(construirEstelas(t, u, 1, crearDatosEstelas(t)).vertices).toBe(n);
    });

    it('nunca supera la capacidad y no repite dos vértices seguidos', () => {
      for (const u of [0, 0.1, 0.37, 0.5, 0.9999]) {
        for (const longitud of [0.05, 0.25, 0.5, 1]) {
          const destino = crearDatosEstelas(t);
          const { vertices } = construirEstelas(t, u, longitud, destino);
          expect(vertices).toBeLessThanOrEqual(n + 1);
          expect(vertices).toBeGreaterThanOrEqual(2);
          for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
            for (let i = 1; i < vertices; i++) {
              const anterior = vertice(destino, cuerpo, i - 1);
              const actual = vertice(destino, cuerpo, i);
              expect(anterior.some((valor, j) => valor !== actual[j])).toBe(true);
            }
          }
        }
      }
    });
  });

  describe('alfa y envoltura con una trayectoria de nodos conocidos', () => {
    it('el alfa de cada vértice depende solo de su edad (nodos uniformes)', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { vertices } = construirEstelas(UNIFORME, 0.55, 0.5, destino);
      const tiempos = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55];
      expect(vertices).toBe(tiempos.length);
      tiempos.forEach((tiempo, i) => {
        expect(destino[0]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.55 - tiempo) / 0.5), 5);
        esperaCercano(vertice(destino, 0, i), posicionEsperada(UNIFORME, tiempo, 0));
      });
    });

    it('el alfa de cada vértice depende solo de su edad (nodos agrupados)', () => {
      const destino = crearDatosEstelas(IRREGULAR);
      const { vertices } = construirEstelas(IRREGULAR, 0.6, 0.5, destino);
      const tiempos = [0.1, 0.5, 0.6];
      expect(vertices).toBe(tiempos.length);
      tiempos.forEach((tiempo, i) => {
        expect(destino[1]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.6 - tiempo) / 0.5), 5);
      });
    });

    it('con envoltura recorre los nodos sin repetir el último', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { vertices } = construirEstelas(UNIFORME, 0.2, 0.5, destino);
      const tiempos = [-0.3, -0.2, -0.1, 0, 0.1, 0.2];
      expect(vertices).toBe(tiempos.length);
      tiempos.forEach((tiempo, i) => {
        esperaCercano(vertice(destino, 2, i), posicionEsperada(UNIFORME, tiempo, 2));
        expect(destino[2]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.2 - tiempo) / 0.5), 5);
      });
    });
  });

  describe('marcas', () => {
    function ventana(u: number, longitud: number): number[] {
      const ks: number[] = [];
      for (let k = Math.floor((u - longitud) * 240) - 1; k <= Math.ceil(u * 240) + 1; k++) {
        if (k > (u - longitud) * 240 && k <= u * 240) ks.push(k);
      }
      return ks;
    }

    function marca(datos: DatosEstelas, cuerpo: number, j: number): number[] {
      const marcas = datos[cuerpo]!.marcas;
      return [marcas[3 * j]!, marcas[3 * j + 1]!, marcas[3 * j + 2]!];
    }

    it.each([
      ['sintética', UNIFORME, 0.5521, 0.5],
      ['sintética con envoltura', UNIFORME, 0.1004, 0.5],
      ['figura de ocho', trayectoriaDe('figura-de-ocho'), 0.4317, 0.3],
      ['figura de ocho, estela completa', trayectoriaDe('figura-de-ocho'), 0.0004, 1],
    ])('%s: son los puntos de la rejilla dentro de la ventana', (_nombre, t, u, longitud) => {
      const destino = crearDatosEstelas(t);
      const { marcas } = construirEstelas(t, u, longitud, destino);
      const ks = ventana(u, longitud);
      expect(marcas).toBe(ks.length);
      ks.forEach((k, j) => {
        for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
          esperaCercano(marca(destino, cuerpo, j), posicionEsperada(t, k / 240, cuerpo));
        }
        const edad = (u - k / 240) / longitud;
        expect(destino[0]!.marcasAlfa[j]).toBeCloseTo(alfaDeEdad(edad), 5);
      });
    });

    it('con una estela de longitud 0,5 hay 120 marcas', () => {
      const { marcas } = construirEstelas(UNIFORME, 0.5521, 0.5, crearDatosEstelas(UNIFORME));
      expect(marcas).toBe(120);
    });

    it('la posición de cada marca no cambia entre fotogramas mientras no salga de la ventana', () => {
      const a = crearDatosEstelas(UNIFORME);
      const b = crearDatosEstelas(UNIFORME);
      const primera = construirEstelas(UNIFORME, 0.5521, 0.5, a);
      const segunda = construirEstelas(UNIFORME, 0.5522, 0.5, b);
      expect(segunda.marcas).toBe(primera.marcas);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        const usadas = 3 * primera.marcas;
        expect(Array.from(b[cuerpo]!.marcas.subarray(0, usadas))).toEqual(
          Array.from(a[cuerpo]!.marcas.subarray(0, usadas)),
        );
      }
    });

    it('al avanzar una celda de la rejilla la ventana se desplaza una marca', () => {
      const a = crearDatosEstelas(UNIFORME);
      const b = crearDatosEstelas(UNIFORME);
      construirEstelas(UNIFORME, 0.5521, 0.5, a);
      construirEstelas(UNIFORME, 0.5521 + 1 / 240, 0.5, b);
      for (let j = 0; j < 119; j++) {
        expect(marca(b, 0, j)).toEqual(marca(a, 0, j + 1));
      }
    });
  });

  describe('validación y reutilización', () => {
    const t = trayectoriaDe('lagrange');

    it.each([0.04, 0, -0.5, 1.01, 2, Number.NaN])('longitud %d lanza RangeError', (longitud) => {
      expect(() => construirEstelas(t, 0.3, longitud, crearDatosEstelas(t))).toThrow(RangeError);
    });

    it.each([Number.NaN, Infinity, -Infinity])('u = %d lanza RangeError', (u) => {
      expect(() => construirEstelas(t, u, 0.5, crearDatosEstelas(t))).toThrow(RangeError);
    });

    it.each([0.05, 1])('los límites de longitud (%d) son válidos', (longitud) => {
      expect(() => construirEstelas(t, 0.3, longitud, crearDatosEstelas(t))).not.toThrow();
    });

    it.each(TODAS)('%s: ningún valor usado es NaN ni infinito', (slug) => {
      const trayectoria = trayectoriaDe(slug);
      for (const longitud of [0.05, 0.5, 1]) {
        const destino = crearDatosEstelas(trayectoria);
        const { vertices, marcas } = construirEstelas(trayectoria, 0.123, longitud, destino);
        for (const cuerpo of destino) {
          expect(Array.from(cuerpo.linea.subarray(0, 3 * vertices)).every(Number.isFinite)).toBe(
            true,
          );
          expect(Array.from(cuerpo.lineaAlfa.subarray(0, vertices)).every(Number.isFinite)).toBe(
            true,
          );
          expect(Array.from(cuerpo.marcas.subarray(0, 3 * marcas)).every(Number.isFinite)).toBe(
            true,
          );
          expect(Array.from(cuerpo.marcasAlfa.subarray(0, marcas)).every(Number.isFinite)).toBe(
            true,
          );
        }
      }
    });

    it('reutilizar el destino no cambia el resultado', () => {
      const trayectoria = trayectoriaDe('figura-de-ocho');
      const reutilizado = crearDatosEstelas(trayectoria);
      construirEstelas(trayectoria, 0.8, 1, reutilizado);
      const segundo = construirEstelas(trayectoria, 0.3, 0.2, reutilizado);

      const limpio = crearDatosEstelas(trayectoria);
      const esperado = construirEstelas(trayectoria, 0.3, 0.2, limpio);

      expect(segundo).toEqual(esperado);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        const a = reutilizado[cuerpo]!;
        const b = limpio[cuerpo]!;
        expect(Array.from(a.linea.subarray(0, 3 * segundo.vertices))).toEqual(
          Array.from(b.linea.subarray(0, 3 * segundo.vertices)),
        );
        expect(Array.from(a.lineaAlfa.subarray(0, segundo.vertices))).toEqual(
          Array.from(b.lineaAlfa.subarray(0, segundo.vertices)),
        );
        expect(Array.from(a.marcas.subarray(0, 3 * segundo.marcas))).toEqual(
          Array.from(b.marcas.subarray(0, 3 * segundo.marcas)),
        );
      }
    });
  });
});
