import { describe, expect, it } from 'vitest';
import {
  LONGITUD_ESTELA,
  POSICION,
  VELOCIDADES,
  VELOCIDAD_INICIAL,
  esVelocidad,
  posicionDeDeslizador,
  valorDeDeslizador,
} from '@/lib/galeria/controles';

describe('GRV-04 · criterio 4: mapeo de controles', () => {
  it('las velocidades son cinco, ascendentes, y la inicial es 1', () => {
    expect([...VELOCIDADES]).toEqual([0.25, 0.5, 1, 2, 4]);
    expect(VELOCIDAD_INICIAL).toBe(1);
  });

  it('esVelocidad acepta solo los cinco valores numéricos', () => {
    expect(esVelocidad(2)).toBe(true);
    expect(esVelocidad(0.25)).toBe(true);
    expect(esVelocidad(4)).toBe(true);
    expect(esVelocidad(3)).toBe(false);
    expect(esVelocidad(0)).toBe(false);
    expect(esVelocidad(8)).toBe(false);
    expect(esVelocidad('2')).toBe(false);
    expect(esVelocidad(NaN)).toBe(false);
    expect(esVelocidad(undefined)).toBe(false);
  });

  it('los atributos de los deslizadores son los del contrato', () => {
    expect(LONGITUD_ESTELA).toEqual({ minima: 0.05, maxima: 1, paso: 0.05, inicial: 0.5 });
    expect(POSICION).toEqual({ minima: 0, maxima: 0.999, paso: 0.001 });
  });

  it('valorDeDeslizador redondea al paso y no pasa de 0,999', () => {
    expect(valorDeDeslizador(0.9996)).toBe(0.999);
    expect(valorDeDeslizador(0.5004)).toBe(0.5);
    expect(valorDeDeslizador(0.5006)).toBe(0.501);
    expect(valorDeDeslizador(0)).toBe(0);
    expect(valorDeDeslizador(0.5)).toBe(0.5);
    expect(valorDeDeslizador(0.999)).toBe(0.999);
  });

  it('valorDeDeslizador envuelve la posición antes de convertirla', () => {
    expect(valorDeDeslizador(1.25)).toBe(0.25);
    expect(valorDeDeslizador(-0.25)).toBe(0.75);
    expect(valorDeDeslizador(1)).toBe(0);
    expect(valorDeDeslizador(2.5)).toBe(0.5);
  });

  it('posicionDeDeslizador limita a [0, 0,999] y trata lo no finito como 0', () => {
    expect(posicionDeDeslizador(0.4)).toBe(0.4);
    expect(posicionDeDeslizador(1.5)).toBe(0.999);
    expect(posicionDeDeslizador(1)).toBe(0.999);
    expect(posicionDeDeslizador(-0.3)).toBe(0);
    expect(posicionDeDeslizador(0)).toBe(0);
    expect(posicionDeDeslizador(0.999)).toBe(0.999);
    expect(posicionDeDeslizador(NaN)).toBe(0);
    expect(posicionDeDeslizador(Infinity)).toBe(0);
    expect(posicionDeDeslizador(-Infinity)).toBe(0);
  });
});
