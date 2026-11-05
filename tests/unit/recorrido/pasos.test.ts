import { describe, expect, it } from 'vitest';
import { PASOS_RECORRIDO, TOTAL_PASOS, limitarPaso } from '@/lib/recorrido/pasos';

describe('GRV-08 · criterio 1: pasos del recorrido', () => {
  it('hay seis pasos con id único y textos no vacíos', () => {
    expect(TOTAL_PASOS).toBe(6);
    expect(PASOS_RECORRIDO).toHaveLength(6);
    expect(new Set(PASOS_RECORRIDO.map((p) => p.id)).size).toBe(6);
    for (const paso of PASOS_RECORRIDO) {
      expect(paso.id).toMatch(/^[a-z]+$/);
      expect(paso.titulo.trim()).not.toBe('');
      expect(paso.texto.trim()).not.toBe('');
      expect(paso.hacer.trim()).not.toBe('');
    }
  });

  it('recorre la portada en orden: bienvenida, historia, ley, galería, tutor y cierre', () => {
    expect(PASOS_RECORRIDO.map((p) => p.id)).toEqual([
      'bienvenida',
      'historia',
      'ley',
      'galeria',
      'tutor',
      'cierre',
    ]);
  });

  it('limitarPaso devuelve un entero entre 0 y el último paso', () => {
    expect(limitarPaso(-3)).toBe(0);
    expect(limitarPaso(2)).toBe(2);
    expect(limitarPaso(99)).toBe(5);
    expect(limitarPaso(2.7)).toBe(2);
    expect(limitarPaso(Number.NaN)).toBe(0);
  });
});
