import { describe, expect, it } from 'vitest';
import { integrarPeriodo, type Trayectoria } from '@/lib/fisica';
import { diferenciaMaxima, numeroDeNodos, orbita, trayectoriaDe } from './ayudas';

const CON_ENCUENTROS = ['butterfly-i', 'goggles', 'moth-i', 'yin-yang-i'] as const;

const estadoFinal = (t: Trayectoria) => t.estados.subarray(t.estados.length - 12);

describe('GRV-02 · criterio 19: la tolerancia gobierna el error', () => {
  it.each(CON_ENCUENTROS)(
    '%s: el estado final difiere poco de una referencia fina y mejora al bajar la tolerancia',
    (slug) => {
      const o = orbita(slug);
      const referencia = integrarPeriodo(o, { tolerancia: 1e-13, pasoMaximo: o.periodo / 7200 });
      const porDefecto = trayectoriaDe(slug);
      const fina = integrarPeriodo(o, { tolerancia: 1e-12 });

      const errorPorDefecto = diferenciaMaxima(estadoFinal(porDefecto), estadoFinal(referencia));
      const errorFino = diferenciaMaxima(estadoFinal(fina), estadoFinal(referencia));

      // Medido: entre 9e-9 y 5e-8 con la tolerancia por defecto, y de 1e-10 a 6e-10 con 1e-12.
      expect(errorPorDefecto).toBeLessThan(1e-7);
      expect(errorFino).toBeLessThan(errorPorDefecto / 10);
      expect(numeroDeNodos(fina)).toBeGreaterThan(1.5 * numeroDeNodos(porDefecto));
    },
  );
});
