import { describe, expect, it } from 'vitest';
import {
  formatearCifra,
  formatearPorcentaje,
  formatearTiempo,
  textoEstela,
  textoPosicion,
  textoVelocidad,
} from '@/lib/galeria/formato';

const MENOS = '−';
const DURO = ' ';
const VEZ = '×';

describe('GRV-04 · criterio 3: formatearCifra', () => {
  it('usa el signo menos U+2212 y coma decimal', () => {
    const texto = formatearCifra(-1.287142, 3);
    expect(texto).toBe(`${MENOS}1,287`);
    expect(texto).not.toContain('-');
    expect(texto).not.toContain('.');
    expect(texto.codePointAt(0)).toBe(0x2212);
  });

  it('redondea al número de decimales pedido', () => {
    expect(formatearCifra(6.32591398, 2)).toBe('6,33');
    expect(formatearCifra(6.32585, 2)).toBe('6,33');
    expect(formatearCifra(12, 0)).toBe('12');
    expect(formatearCifra(1.2, 3)).toBe('1,200');
    expect(formatearCifra(0, 3)).toBe('0,000');
  });

  it('un valor que redondea a cero no lleva signo', () => {
    expect(formatearCifra(-0.0004, 3)).toBe('0,000');
    expect(formatearCifra(-0, 3)).toBe('0,000');
    expect(formatearCifra(-1e-15, 3)).toBe('0,000');
    expect(formatearCifra(-0.0006, 3)).toBe(`${MENOS}0,001`);
  });

  it('no usa separador de miles', () => {
    expect(formatearCifra(12345.6789, 2)).toBe('12345,68');
  });

  it('un valor no finito da una raya', () => {
    expect(formatearCifra(NaN, 3)).toBe('—');
    expect(formatearCifra(Infinity, 3)).toBe('—');
    expect(formatearCifra(-Infinity, 3)).toBe('—');
  });
});

describe('GRV-04 · criterio 3: formatearPorcentaje', () => {
  it('un decimal, coma y espacio duro U+00A0 antes de «%»', () => {
    const texto = formatearPorcentaje(0.3744);
    expect(texto).toBe(`37,4${DURO}%`);
    expect(texto).not.toBe('37,4 %');
    expect(texto.charCodeAt(4)).toBe(0xa0);
  });

  it('trunca y nunca llega a 100,0 %', () => {
    expect(formatearPorcentaje(0.99999)).toBe(`99,9${DURO}%`);
    expect(formatearPorcentaje(1 - 1e-12)).toBe(`99,9${DURO}%`);
    expect(formatearPorcentaje(0.999)).toBe(`99,9${DURO}%`);
    expect(formatearPorcentaje(0.9994)).toBe(`99,9${DURO}%`);
  });

  it('trunca en lugar de redondear', () => {
    expect(formatearPorcentaje(0.3749)).toBe(`37,4${DURO}%`);
    expect(formatearPorcentaje(0.3749999995)).toBe(`37,4${DURO}%`);
    expect(formatearPorcentaje(0.0009)).toBe(`0,0${DURO}%`);
  });

  it('tolera el error binario: 0,29 es 29,0 % y no 28,9 %', () => {
    expect(formatearPorcentaje(0.29)).toBe(`29,0${DURO}%`);
    expect(formatearPorcentaje(0.57)).toBe(`57,0${DURO}%`);
    expect(formatearPorcentaje(0.58)).toBe(`58,0${DURO}%`);
  });

  it('tolera el error binario también cuando u sale de una división o de una resta', () => {
    // 7 / 10 / 100 vale 0,006999999999999999 y 1 − 937 / 1000 vale 0,06299999999999994.
    expect(formatearPorcentaje(7 / 10 / 100)).toBe(`0,7${DURO}%`);
    expect(formatearPorcentaje(1 - 937 / 1000)).toBe(`6,3${DURO}%`);
    expect(formatearPorcentaje(21 / 100 / 10)).toBe(`2,1${DURO}%`);
  });

  it('los extremos y el medio', () => {
    expect(formatearPorcentaje(0)).toBe(`0,0${DURO}%`);
    expect(formatearPorcentaje(0.5)).toBe(`50,0${DURO}%`);
    expect(formatearPorcentaje(0.25)).toBe(`25,0${DURO}%`);
  });
});

describe('GRV-04 · criterio 3: formatearTiempo', () => {
  it('dos decimales con coma, truncados', () => {
    expect(formatearTiempo(3.16295699)).toBe('3,16');
    expect(formatearTiempo(6.32585)).toBe('6,32');
    expect(formatearTiempo(0)).toBe('0,00');
    expect(formatearTiempo(10.5)).toBe('10,50');
  });

  it('truncar no es lo mismo que redondear', () => {
    expect(formatearTiempo(6.32585)).not.toBe(formatearCifra(6.32585, 2));
    expect(formatearCifra(6.32585, 2)).toBe('6,33');
  });

  it('tolera el error binario: 0,29 es 0,29 y no 0,28', () => {
    expect(formatearTiempo(0.29)).toBe('0,29');
    expect(formatearTiempo(0.57)).toBe('0,57');
    expect(formatearTiempo(1.13)).toBe('1,13');
    expect(formatearTiempo(2.01)).toBe('2,01');
  });
});

describe('GRV-04 · criterio 3: textos de los deslizadores', () => {
  // `textoPosicion` compone `formatearPorcentaje`: lleva U+00A0 antes de «%» y el resto son espacios normales.
  it('textoPosicion da el porcentaje y el tiempo con su periodo', () => {
    const texto = textoPosicion(0.5, 6.32591398);
    expect(texto).toBe(`50,0${DURO}% del periodo (t = 3,16 de 6,33)`);
    expect(texto.charCodeAt(4)).toBe(0xa0);
  });

  it('textoPosicion empieza por el porcentaje de formatearPorcentaje', () => {
    expect(textoPosicion(0.3744, 10)).toBe(`37,4${DURO}% del periodo (t = 3,74 de 10,00)`);
    expect(textoPosicion(0, 6.32591398)).toBe(`0,0${DURO}% del periodo (t = 0,00 de 6,33)`);
    expect(textoPosicion(0.999, 10)).toBe(`99,9${DURO}% del periodo (t = 9,99 de 10,00)`);
    expect(textoPosicion(0.3744, 10).startsWith(formatearPorcentaje(0.3744))).toBe(true);
  });

  it('textoPosicion trunca el porcentaje y el tiempo, no los redondea', () => {
    // 63,26 % y 6,326 s: redondeados serían «63,3 %» y «6,33».
    expect(textoPosicion(0.6326, 10)).toBe(`63,2${DURO}% del periodo (t = 6,32 de 10,00)`);
  });

  it('textoPosicion nunca muestra 100,0 % aunque u sea casi 1', () => {
    const texto = textoPosicion(1 - 1e-12, 10);
    expect(texto.startsWith(`99,9${DURO}% del periodo (t = `)).toBe(true);
    expect(texto.endsWith(' de 10,00)')).toBe(true);
    expect(texto).not.toContain('100');
  });

  // `textoEstela` no compone `formatearPorcentaje`: espacio normal antes de «%».
  it('textoEstela redondea el porcentaje a un entero, con espacio normal antes de «%»', () => {
    expect(textoEstela(0.05)).toBe('5 % del periodo');
    expect(textoEstela(0.15)).toBe('15 % del periodo');
    expect(textoEstela(1)).toBe('100 % del periodo');
    expect(textoEstela(0.5)).toBe('50 % del periodo');
    expect(textoEstela(0.5)).not.toContain(DURO);
  });

  it('textoVelocidad usa el signo de multiplicar U+00D7 y coma decimal', () => {
    expect(textoVelocidad(0.25)).toBe(`0,25${VEZ}`);
    expect(textoVelocidad(0.5)).toBe(`0,5${VEZ}`);
    expect(textoVelocidad(1)).toBe(`1${VEZ}`);
    expect(textoVelocidad(2)).toBe(`2${VEZ}`);
    expect(textoVelocidad(4)).toBe(`4${VEZ}`);
    expect(textoVelocidad(2)).not.toContain('x');
  });
});
