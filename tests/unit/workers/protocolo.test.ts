import { describe, expect, it } from 'vitest';
import { integrarPeriodo } from '@/lib/fisica';
import { manejarPeticion } from '@/workers/protocolo';
import { orbita } from '../fisica/ayudas';

describe('GRV-02 · criterio 16: protocolo del Worker', () => {
  it('responde a una petición válida con la trayectoria del catálogo', () => {
    const respuesta = manejarPeticion({ tipo: 'calcular', id: 7, slug: 'figura-de-ocho' });

    expect(respuesta.tipo).toBe('resultado');
    if (respuesta.tipo !== 'resultado') {
      return;
    }
    expect(respuesta.id).toBe(7);
    expect(respuesta.slug).toBe('figura-de-ocho');
    expect(respuesta.trayectoria).toEqual(integrarPeriodo(orbita('figura-de-ocho')));
  });

  it('devuelve buffers propios y de tamaño exacto, listos para transferir', () => {
    const respuesta = manejarPeticion({ tipo: 'calcular', id: 1, slug: 'lagrange' });
    if (respuesta.tipo !== 'resultado') {
      throw new Error('Se esperaba un resultado');
    }
    const { tiempos, estados } = respuesta.trayectoria;

    expect(tiempos.buffer).not.toBe(estados.buffer);
    for (const valores of [tiempos, estados]) {
      expect(valores.byteOffset).toBe(0);
      expect(valores.buffer.byteLength).toBe(valores.byteLength);
    }
  });

  it.each([
    ['undefined', undefined, null],
    ['null', null, null],
    ['un número', 42, null],
    ['una cadena', 'calcular', null],
    ['sin id', { tipo: 'calcular', slug: 'lagrange' }, null],
    ['un id que no es número', { tipo: 'calcular', id: '7', slug: 'lagrange' }, null],
    ['un tipo desconocido', { tipo: 'otro', id: 3, slug: 'lagrange' }, 3],
    ['un slug que no es una cadena', { tipo: 'calcular', id: 4, slug: 12 }, 4],
    ['un slug que no existe', { tipo: 'calcular', id: 5, slug: 'no-existe' }, 5],
  ])('responde con un error ante %s, sin lanzar', (_caso, peticion, idEsperado) => {
    expect(() => manejarPeticion(peticion)).not.toThrow();

    const respuesta = manejarPeticion(peticion);
    expect(respuesta.tipo).toBe('error');
    if (respuesta.tipo !== 'error') {
      return;
    }
    expect(respuesta.id).toBe(idEsperado);
    expect(respuesta.mensaje.trim().length).toBeGreaterThan(0);
  });
});
