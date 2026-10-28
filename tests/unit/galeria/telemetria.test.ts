import { describe, expect, it } from 'vitest';
import { estadoEn, type Slug } from '@/lib/fisica';
import {
  INTERVALO_TELEMETRIA_MS,
  debeActualizar,
  formatearLectura,
  leerTelemetria,
} from '@/lib/galeria/telemetria';
import { energiaDe, momentoLinealDe, orbita, TODAS, trayectoriaDe } from '../fisica/ayudas';

const DURO = ' ';
const MENOS = '−';

/** Posiciones x1, y1, x2, y2, x3, y3 y velocidades vx1, vy1, vx2, vy2, vx3, vy3 (el orden de GRV-02). */
const A_MANO = Float64Array.from([0, 0, 3, 0, 0, 4, 1, 0, 0, 2, 0, 0]);

/** Energía inicial con tres decimales, la que muestran la galería y el detalle (criterio 16). */
const ENERGIA_EN_TEXTO: Record<Slug, string> = {
  lagrange: `${MENOS}0,866`,
  'figura-de-ocho': `${MENOS}1,287`,
  'butterfly-i': `${MENOS}2,170`,
  goggles: `${MENOS}2,430`,
  'moth-i': `${MENOS}1,382`,
  'yin-yang-i': `${MENOS}1,429`,
};

describe('GRV-04 · criterio 5: telemetría en vivo con un estado construido a mano', () => {
  // Cinética: 0,5·(1² + 2²) = 2,5. Distancias 3, 4 y 5: potencial −(1/3 + 1/4 + 1/5) = −47/60.
  const lectura = leerTelemetria(A_MANO, 0.25, 10);

  it('tiempo y fase salen de u y del periodo', () => {
    expect(lectura.tiempo).toBeCloseTo(2.5, 12);
    expect(lectura.fase).toBeCloseTo(0.25, 12);
  });

  it('la energía es cinética más potencial', () => {
    expect(Math.abs(lectura.energia - (2.5 - 47 / 60))).toBeLessThan(1e-6);
  });

  it('el momento lineal es el módulo del momento vectorial, no la suma de módulos', () => {
    // p = (1, 2): √5 ≈ 2,236. La suma de los módulos de las velocidades sería 3.
    expect(lectura.momentoLineal).toBeCloseTo(Math.sqrt(5), 12);
  });

  it('la distancia mínima y la velocidad máxima son instantáneas', () => {
    expect(lectura.distanciaMinima).toBeCloseTo(3, 12);
    expect(lectura.velocidadMaxima).toBeCloseTo(2, 12);
  });

  it('formatearLectura da los textos con las reglas de formato', () => {
    expect(formatearLectura(lectura)).toEqual({
      tiempo: '2,50',
      fase: `25,0${DURO}%`,
      energia: '1,717',
      momento: '2,236',
      distanciaMinima: '3,000',
      velocidadMaxima: '2,000',
    });
  });

  it('formatearLectura formatea la lectura recibida, no una fija', () => {
    const otra = formatearLectura({
      tiempo: 0.29,
      fase: 0.5,
      energia: -1.287142,
      momentoLineal: 1e-15,
      distanciaMinima: 0.0114,
      velocidadMaxima: 9.5496,
    });
    expect(otra).toEqual({
      tiempo: '0,29',
      fase: `50,0${DURO}%`,
      energia: `${MENOS}1,287`,
      momento: '0,000',
      distanciaMinima: '0,011',
      velocidadMaxima: '9,550',
    });
  });

  it('formatearLectura trunca el tiempo y la fase en lugar de redondearlos', () => {
    const casi = formatearLectura({
      tiempo: 6.32585,
      fase: 0.99999,
      energia: 0,
      momentoLineal: 0,
      distanciaMinima: 1,
      velocidadMaxima: 1,
    });
    // Redondeados serían «6,33» y «100,0 %».
    expect(casi.tiempo).toBe('6,32');
    expect(casi.fase).toBe(`99,9${DURO}%`);
  });

  it('la lectura no depende de que el estado sea el mismo objeto de un fotograma a otro', () => {
    const copia = Float64Array.from(A_MANO);
    expect(leerTelemetria(copia, 0.25, 10)).toEqual(lectura);
    const cuerpoRapido = Float64Array.from([0, 0, 3, 0, 0, 4, 1, 0, 0, 5, 0, 0]);
    expect(leerTelemetria(cuerpoRapido, 0.25, 10).velocidadMaxima).toBeCloseTo(5, 12);
  });
});

describe('GRV-04 · criterio 5: Lagrange en u = 0', () => {
  const lagrange = orbita('lagrange');
  const lectura = leerTelemetria(Float64Array.from(lagrange.estadoInicial), 0, lagrange.periodo);

  it('energía −√3/2, momento nulo, distancia √3 y velocidad 3^(−1/4)', () => {
    expect(Math.abs(lectura.energia + Math.sqrt(3) / 2)).toBeLessThan(1e-9);
    expect(lectura.momentoLineal).toBeLessThan(1e-12);
    expect(Math.abs(lectura.distanciaMinima - Math.sqrt(3))).toBeLessThan(1e-9);
    expect(Math.abs(lectura.velocidadMaxima - Math.pow(3, -0.25))).toBeLessThan(1e-9);
    expect(lectura.tiempo).toBe(0);
    expect(lectura.fase).toBe(0);
  });
});

describe('GRV-04 · criterio 5: las seis trayectorias conservan energía y momento', () => {
  const MUESTRAS = 720;

  it.each(TODAS)(
    '%s: |E(u) − E(0)| < 1e-6, momento < 1e-12 y el texto de la energía no cambia',
    (slug) => {
      const trayectoria = trayectoriaDe(slug);
      const energiaInicial = energiaDe(Float64Array.from(orbita(slug).estadoInicial));
      const textoInicial = formatearLectura(
        leerTelemetria(estadoEn(trayectoria, 0), 0, trayectoria.periodo),
      ).energia;
      // El texto «de verdad» sale de la tabla de la spec, no de la propia lectura.
      expect(textoInicial).toBe(ENERGIA_EN_TEXTO[slug]);

      let peorEnergia = 0;
      let peorMomento = 0;
      const distintos = new Set<string>();
      for (let k = 0; k < MUESTRAS; k++) {
        const u = k / MUESTRAS;
        const estado = estadoEn(trayectoria, u);
        const l = leerTelemetria(estado, u, trayectoria.periodo);
        peorEnergia = Math.max(peorEnergia, Math.abs(l.energia - energiaInicial));
        peorMomento = Math.max(peorMomento, l.momentoLineal);
        // Independiente de la implementación: la misma energía por la fórmula de las pruebas de GRV-02.
        expect(Math.abs(l.energia - energiaDe(estado))).toBeLessThan(1e-9);
        expect(Math.abs(l.momentoLineal - momentoLinealDe(estado))).toBeLessThan(1e-12);
        expect(l.tiempo).toBeCloseTo(u * trayectoria.periodo, 9);
        expect(l.fase).toBeCloseTo(u, 12);
        distintos.add(formatearLectura(l).energia);
      }
      expect(peorEnergia).toBeLessThan(1e-6);
      expect(peorMomento).toBeLessThan(1e-12);
      expect([...distintos]).toEqual([textoInicial]);
    },
  );
});

describe('GRV-04 · criterio 6: ritmo de la telemetría', () => {
  it('el intervalo es de 100 ms', () => {
    expect(INTERVALO_TELEMETRIA_MS).toBe(100);
  });

  it('reproduciendo: false a 99 ms, true a 100 ms (límite inclusivo) y a 250 ms', () => {
    expect(debeActualizar(99, 0, true)).toBe(false);
    expect(debeActualizar(100, 0, true)).toBe(true);
    expect(debeActualizar(250, 0, true)).toBe(true);
    expect(debeActualizar(0, 0, true)).toBe(false);
  });

  it('se mide respecto a la última escritura, no respecto a cero', () => {
    expect(debeActualizar(1099, 1000, true)).toBe(false);
    expect(debeActualizar(1100, 1000, true)).toBe(true);
    expect(debeActualizar(5000, 4950, true)).toBe(false);
  });

  it('en pausa siempre es verdadero, también sin tiempo transcurrido', () => {
    expect(debeActualizar(0, 0, false)).toBe(true);
    expect(debeActualizar(1, 0, false)).toBe(true);
    expect(debeActualizar(1001, 1000, false)).toBe(true);
    expect(debeActualizar(5, 5, false)).toBe(true);
  });

  it('un intervalo pasado como argumento se respeta', () => {
    expect(debeActualizar(49, 0, true, 50)).toBe(false);
    expect(debeActualizar(50, 0, true, 50)).toBe(true);
    expect(debeActualizar(99, 0, true, 200)).toBe(false);
    expect(debeActualizar(200, 0, true, 200)).toBe(true);
    expect(debeActualizar(1, 0, false, 50)).toBe(true);
  });
});
