import { describe, expect, it } from 'vitest';
import { COOLDOWN_MS, MAX_MENSAJES, puedeEnviar } from '@/lib/tutor/cliente';

const libre = { enviando: false, ultimoEnvio: null, mensajes: 0 };

describe('puedeEnviar', () => {
  it('permite enviar sin envíos previos y pasado el cooldown', () => {
    expect(puedeEnviar(libre, 1000)).toEqual({ ok: true });
    expect(puedeEnviar({ ...libre, ultimoEnvio: 0 }, COOLDOWN_MS)).toEqual({ ok: true });
  });

  it('rechaza mientras hay un envío en curso', () => {
    expect(puedeEnviar({ ...libre, enviando: true }, 5000)).toEqual({
      ok: false,
      motivo: 'enviando',
    });
  });

  it('rechaza dentro del cooldown', () => {
    expect(puedeEnviar({ ...libre, ultimoEnvio: 1000 }, 1000 + COOLDOWN_MS - 1)).toEqual({
      ok: false,
      motivo: 'espera',
    });
  });

  it('rechaza con la conversación llena, con prioridad sobre el resto', () => {
    const estado = { enviando: true, ultimoEnvio: 1000, mensajes: MAX_MENSAJES };
    expect(puedeEnviar(estado, 1001)).toEqual({ ok: false, motivo: 'lleno' });
  });
});
