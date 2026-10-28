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

/** Nodos en múltiplos de 1/8: todos los tiempos de las pruebas de frontera son exactos en binario. */
const OCTAVOS = trayectoriaSintetica(Array.from({ length: 9 }, (_, i) => i / 8));
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

function marca(datos: DatosEstelas, cuerpo: number, j: number): number[] {
  const marcas = datos[cuerpo]!.marcas;
  return [marcas[3 * j]!, marcas[3 * j + 1]!, marcas[3 * j + 2]!];
}

/** Los trozos usados de dos destinos coinciden (a la precisión de un Float32). */
function esperaIguales(
  a: DatosEstelas,
  b: DatosEstelas,
  usados: { vertices: number; marcas: number },
): void {
  for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
    const x = a[cuerpo]!;
    const y = b[cuerpo]!;
    const pares: [Float32Array, Float32Array][] = [
      [x.linea.subarray(0, 3 * usados.vertices), y.linea.subarray(0, 3 * usados.vertices)],
      [x.lineaAlfa.subarray(0, usados.vertices), y.lineaAlfa.subarray(0, usados.vertices)],
      [x.marcas.subarray(0, 3 * usados.marcas), y.marcas.subarray(0, 3 * usados.marcas)],
      [x.marcasAlfa.subarray(0, usados.marcas), y.marcasAlfa.subarray(0, usados.marcas)],
    ];
    for (const [p, q] of pares) {
      expect(p.length).toBe(q.length);
      p.forEach((valor, i) => expect(q[i]).toBeCloseTo(valor, 5));
    }
  }
}

describe('GRV-03 · criterio 6: estelas', () => {
  it('alfaDeEdad es (1 − e)^1,6', () => {
    expect(alfaDeEdad(0)).toBe(1);
    expect(alfaDeEdad(1)).toBeCloseTo(0, 12);
    expect(alfaDeEdad(0.5)).toBeCloseTo(Math.pow(0.5, 1.6), 10);
    expect(alfaDeEdad(0.25)).toBeCloseTo(Math.pow(0.75, 1.6), 10);
  });

  it('alfaDeEdad recorta la edad a [0, 1] y nunca da NaN', () => {
    expect(alfaDeEdad(1 + 1e-12)).toBeCloseTo(0, 12);
    expect(alfaDeEdad(1.5)).toBeCloseTo(0, 12);
    expect(alfaDeEdad(-1e-12)).toBe(1);
    expect(alfaDeEdad(-0.3)).toBe(1);
    for (const e of [-2, -1e-9, 1 + 1e-9, 2]) {
      expect(Number.isNaN(alfaDeEdad(e))).toBe(false);
    }
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
          expect(destino[cuerpo]!.lineaAlfa[0]).toBeCloseTo(0, 6);
          expect(destino[cuerpo]!.lineaAlfa[vertices - 1]).toBeCloseTo(1, 6);
        }
      },
    );
  });

  describe('fracción fuera de [0, 1)', () => {
    const t = trayectoriaDe('figura-de-ocho');
    const base = crearDatosEstelas(t);
    const esperado = construirEstelas(t, 0.3017, 0.5, base);

    it.each([1.3017, -0.6983, 2.3017, -3.6983])('u = %d equivale a 0,3017', (u) => {
      const destino = crearDatosEstelas(t);
      const obtenido = construirEstelas(t, u, 0.5, destino);
      expect(obtenido).toEqual(esperado);
      esperaIguales(destino, base, esperado);
    });

    it.each([1, -1, 2])('u = %d equivale a 0', (u) => {
      const referencia = crearDatosEstelas(t);
      const cero = construirEstelas(t, 0, 0.5, referencia);
      const destino = crearDatosEstelas(t);
      expect(construirEstelas(t, u, 0.5, destino)).toEqual(cero);
      esperaIguales(destino, referencia, cero);
    });
  });

  describe('número de vértices', () => {
    const t = trayectoriaDe('figura-de-ocho');
    const n = t.tiempos.length;

    it('la capacidad es n + 1 vértices por cuerpo, con 3 valores por vértice y un alfa', () => {
      const destino = crearDatosEstelas(t);
      expect(destino).toHaveLength(3);
      for (const cuerpo of destino) {
        expect(cuerpo.linea).toHaveLength(3 * (n + 1));
        expect(cuerpo.lineaAlfa).toHaveLength(n + 1);
      }
    });

    it('las marcas caben con 3 valores cada una y al menos MARCAS_POR_PERIODO + 1 por cuerpo', () => {
      for (const cuerpo of crearDatosEstelas(t)) {
        expect(cuerpo.marcas.length).toBeGreaterThanOrEqual(3 * (MARCAS_POR_PERIODO + 1));
        expect(cuerpo.marcasAlfa.length).toBeGreaterThanOrEqual(MARCAS_POR_PERIODO + 1);
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

    it('con nodos en octavos exactos: n vértices si u cae en un nodo y n + 1 si no', () => {
      const nOctavos = OCTAVOS.tiempos.length;
      for (const u of [0, 0.125, 0.5, 0.875]) {
        expect(construirEstelas(OCTAVOS, u, 1, crearDatosEstelas(OCTAVOS)).vertices).toBe(nOctavos);
      }
      for (const u of [0.0625, 0.4375, 1 - 1e-9]) {
        expect(construirEstelas(OCTAVOS, u, 1, crearDatosEstelas(OCTAVOS)).vertices).toBe(
          nOctavos + 1,
        );
      }
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

    it('la coordenada z de la línea y de las marcas es siempre 0', () => {
      const destino = crearDatosEstelas(t);
      const { vertices, marcas } = construirEstelas(t, 0.41, 0.6, destino);
      expect(marcas).toBeGreaterThan(0);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        for (let i = 0; i < vertices; i++) {
          expect(vertice(destino, cuerpo, i)[2]).toBeCloseTo(0, 12);
        }
        for (let j = 0; j < marcas; j++) {
          expect(marca(destino, cuerpo, j)[2]).toBeCloseTo(0, 12);
        }
      }
    });
  });

  describe('alfa y envoltura con una trayectoria de nodos conocidos', () => {
    it('el alfa de cada vértice depende solo de su edad (nodos uniformes, los tres cuerpos)', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { vertices } = construirEstelas(UNIFORME, 0.55, 0.5, destino);
      const tiempos = [0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.55];
      expect(vertices).toBe(tiempos.length);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        tiempos.forEach((tiempo, i) => {
          expect(destino[cuerpo]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.55 - tiempo) / 0.5), 5);
          esperaCercano(vertice(destino, cuerpo, i), posicionEsperada(UNIFORME, tiempo, cuerpo));
        });
      }
    });

    it('el alfa de cada vértice depende solo de su edad (nodos agrupados, los tres cuerpos)', () => {
      const destino = crearDatosEstelas(IRREGULAR);
      const { vertices } = construirEstelas(IRREGULAR, 0.6, 0.5, destino);
      const tiempos = [0.1, 0.5, 0.6];
      expect(vertices).toBe(tiempos.length);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        tiempos.forEach((tiempo, i) => {
          expect(destino[cuerpo]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.6 - tiempo) / 0.5), 5);
        });
      }
    });

    it('con envoltura recorre los nodos sin repetir el último', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { vertices } = construirEstelas(UNIFORME, 0.2, 0.5, destino);
      const tiempos = [-0.3, -0.2, -0.1, 0, 0.1, 0.2];
      expect(vertices).toBe(tiempos.length);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        tiempos.forEach((tiempo, i) => {
          esperaCercano(vertice(destino, cuerpo, i), posicionEsperada(UNIFORME, tiempo, cuerpo));
          expect(destino[cuerpo]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.2 - tiempo) / 0.5), 5);
        });
      }
    });

    it('los nodos que coinciden con el inicio o con el fin no se repiten', () => {
      const destino = crearDatosEstelas(OCTAVOS);
      const { vertices } = construirEstelas(OCTAVOS, 0.75, 0.5, destino);
      const tiempos = [0.25, 0.375, 0.5, 0.625, 0.75];
      expect(vertices).toBe(tiempos.length);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        tiempos.forEach((tiempo, i) => {
          esperaCercano(vertice(destino, cuerpo, i), posicionEsperada(OCTAVOS, tiempo, cuerpo));
          expect(destino[cuerpo]!.lineaAlfa[i]).toBeCloseTo(alfaDeEdad((0.75 - tiempo) / 0.5), 5);
        });
      }
    });

    it('con envoltura, el nodo del inicio y el último nodo (el mismo que el 0) no se repiten', () => {
      const destino = crearDatosEstelas(OCTAVOS);
      const { vertices } = construirEstelas(OCTAVOS, 0.125, 0.5, destino);
      const tiempos = [-0.375, -0.25, -0.125, 0, 0.125];
      expect(vertices).toBe(tiempos.length);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        tiempos.forEach((tiempo, i) => {
          esperaCercano(vertice(destino, cuerpo, i), posicionEsperada(OCTAVOS, tiempo, cuerpo));
        });
      }
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
        const edad = (u - k / 240) / longitud;
        for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
          esperaCercano(marca(destino, cuerpo, j), posicionEsperada(t, k / 240, cuerpo));
          expect(destino[cuerpo]!.marcasAlfa[j]).toBeCloseTo(alfaDeEdad(edad), 5);
        }
      });
    });

    it('con una estela de longitud 0,5 hay 120 marcas', () => {
      const { marcas } = construirEstelas(UNIFORME, 0.5521, 0.5, crearDatosEstelas(UNIFORME));
      expect(marcas).toBe(120);
    });

    it('la ventana es (inicio, fin]: con u = 0,5 y longitud 0,5 hay 120 marcas y la marca 0 no entra', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { marcas } = construirEstelas(UNIFORME, 0.5, 0.5, destino);
      expect(marcas).toBe(120);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        esperaCercano(marca(destino, cuerpo, 0), posicionEsperada(UNIFORME, 1 / 240, cuerpo));
        esperaCercano(marca(destino, cuerpo, 119), posicionEsperada(UNIFORME, 0.5, cuerpo));
        expect(destino[cuerpo]!.marcasAlfa[0]).toBeCloseTo(alfaDeEdad(119 / 120), 5);
        expect(destino[cuerpo]!.marcasAlfa[119]).toBeCloseTo(1, 6);
      }
    });

    it('con u = 0 y longitud 1 hay 240 marcas y la última es el estado en 0', () => {
      const destino = crearDatosEstelas(UNIFORME);
      const { marcas } = construirEstelas(UNIFORME, 0, 1, destino);
      expect(marcas).toBe(240);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        esperaCercano(marca(destino, cuerpo, 239), posicionEsperada(UNIFORME, 0, cuerpo));
        esperaCercano(marca(destino, cuerpo, 0), posicionEsperada(UNIFORME, -239 / 240, cuerpo));
        expect(destino[cuerpo]!.marcasAlfa[239]).toBeCloseTo(1, 6);
      }
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
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        for (let j = 0; j < 119; j++) {
          expect(marca(b, cuerpo, j)).toEqual(marca(a, cuerpo, j + 1));
        }
      }
    });
  });

  describe('validación y reutilización', () => {
    const t = trayectoriaDe('lagrange');

    it.each([0.04, 0.0499, 0, -0.5, 1.0001, 1.01, 2, Number.NaN, Infinity])(
      'longitud %d lanza RangeError',
      (longitud) => {
        expect(() => construirEstelas(t, 0.3, longitud, crearDatosEstelas(t))).toThrow(RangeError);
      },
    );

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

    it('reutilizar el destino no cambia el resultado (línea, marcas y sus alfas)', () => {
      const trayectoria = trayectoriaDe('figura-de-ocho');
      const reutilizado = crearDatosEstelas(trayectoria);
      construirEstelas(trayectoria, 0.8, 1, reutilizado);
      const segundo = construirEstelas(trayectoria, 0.3, 0.2, reutilizado);

      const limpio = crearDatosEstelas(trayectoria);
      const esperado = construirEstelas(trayectoria, 0.3, 0.2, limpio);

      expect(segundo).toEqual(esperado);
      expect(segundo.marcas).toBeGreaterThan(0);
      esperaIguales(reutilizado, limpio, segundo);
    });

    it('reutilizar el destino con una ventana mayor tras una menor tampoco lo cambia', () => {
      const trayectoria = trayectoriaDe('figura-de-ocho');
      const reutilizado = crearDatosEstelas(trayectoria);
      construirEstelas(trayectoria, 0.3, 0.05, reutilizado);
      const segundo = construirEstelas(trayectoria, 0.9, 1, reutilizado);
      const limpio = crearDatosEstelas(trayectoria);
      expect(segundo).toEqual(construirEstelas(trayectoria, 0.9, 1, limpio));
      esperaIguales(reutilizado, limpio, segundo);
    });
  });
});
