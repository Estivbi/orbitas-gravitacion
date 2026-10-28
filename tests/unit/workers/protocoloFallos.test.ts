import { describe, expect, it, vi } from 'vitest';
import { manejarPeticion } from '@/workers/protocolo';

vi.mock('@/lib/fisica', async (importarOriginal) => {
  const original = await importarOriginal<typeof import('@/lib/fisica')>();
  return {
    ...original,
    integrarPeriodo: () => {
      throw new Error('fallo simulado del integrador');
    },
  };
});

describe('GRV-02 · criterio 16: protocolo del Worker ante un fallo de cálculo', () => {
  it('responde con un error que conserva el id y el mensaje, sin lanzar', () => {
    const respuesta = manejarPeticion({ tipo: 'calcular', id: 9, slug: 'lagrange' });

    expect(respuesta).toEqual({
      tipo: 'error',
      id: 9,
      mensaje: 'fallo simulado del integrador',
    });
  });
});
