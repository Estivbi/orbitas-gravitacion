import { describe, expect, it } from 'vitest';
import { estadoEn, integrarPeriodo, muestrear } from '@/lib/fisica';
import { orbita, trayectoriaDe } from './ayudas';

const valida = orbita('lagrange');
const estadoValido = Array.from(valida.estadoInicial);

describe('GRV-02 · criterio 15: entradas inválidas', () => {
  it.each([1e-15, 0, -1, Number.NaN])('rechaza la tolerancia %s', (tolerancia) => {
    expect(() => integrarPeriodo(valida, { tolerancia })).toThrow(/tolerancia/i);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rechaza el periodo %s', (periodo) => {
    expect(() => integrarPeriodo({ periodo, estadoInicial: estadoValido })).toThrow(/periodo/i);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rechaza el paso máximo %s',
    (pasoMaximo) => {
      expect(() => integrarPeriodo(valida, { pasoMaximo })).toThrow(/paso/i);
    },
  );

  it('rechaza un estado inicial que no tiene 12 valores', () => {
    expect(() => integrarPeriodo({ periodo: 1, estadoInicial: estadoValido.slice(0, 11) })).toThrow(
      /12/,
    );
  });

  it('rechaza un estado inicial con NaN', () => {
    const conNaN = [...estadoValido];
    conNaN[3] = Number.NaN;
    expect(() => integrarPeriodo({ periodo: 1, estadoInicial: conNaN })).toThrow(/finit|NaN/i);
  });

  it('rechaza dos cuerpos en la misma posición', () => {
    const coincidentes = [0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0];
    expect(() => integrarPeriodo({ periodo: 1, estadoInicial: coincidentes })).toThrow(/posici/i);
  });

  it('avisa cuando se agota el tope de pasos', () => {
    expect(() => integrarPeriodo(orbita('goggles'), { pasosMaximos: 5 })).toThrow(
      'La integración no converge',
    );
  });

  it('no se cuelga con dos cuerpos casi coincidentes', () => {
    const casiChoque = [0, 0, 1e-9, 0, 5, 5, 0, 0, 0, 0, 0, 0];
    expect(() => integrarPeriodo({ periodo: 1, estadoInicial: casiChoque })).toThrow();
  });

  it.each([0, 1.5, -2, Number.NaN])('muestrear rechaza n = %s', (n) => {
    expect(() => muestrear(trayectoriaDe('lagrange'), n)).toThrow(/entero|1/i);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'estadoEn rechaza u = %s',
    (u) => {
      expect(() => estadoEn(trayectoriaDe('lagrange'), u)).toThrow(/finit/i);
    },
  );
});
