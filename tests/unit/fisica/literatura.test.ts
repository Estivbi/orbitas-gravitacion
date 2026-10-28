import { describe, expect, it } from 'vitest';
import { integrarPeriodo } from '@/lib/fisica';
import { diferenciaMaxima, en, energiaDe, nodo, numeroDeNodos, orbita } from './ayudas';

// Chenciner y Montgomery (Ann. Math. 152, 2000), a partir de los cálculos de Simó.
// Masas 1, G = 1. Cuerpos 1 y 2 simétricos respecto al origen, cuerpo 3 en el origen.
const PERIODO = 6.32591398;
const x1 = [0.97000436, -0.24308753] as const;
const v3 = [-0.93240737, -0.86473146] as const;
const v1 = [-v3[0] / 2, -v3[1] / 2] as const;

const publicado = Float64Array.from([x1[0], x1[1], -x1[0], -x1[1], 0, 0, ...v1, ...v1, ...v3]);

/** El mismo estado girado a nuestra convención: cuerpos en (−1, 0) y (1, 0). */
function girado(): number[] {
  const angulo = -Math.atan2(x1[1], x1[0]);
  const vx = v1[0] * Math.cos(angulo) - v1[1] * Math.sin(angulo);
  const vy = v1[0] * Math.sin(angulo) + v1[1] * Math.cos(angulo);
  return [-1, 0, 1, 0, 0, 0, vx, vy, vx, vy, -2 * vx, -2 * vy];
}

describe('GRV-02 · criterio 14: contraste de la figura de ocho con la literatura', () => {
  it('el estado del catálogo coincide con el publicado, girado a nuestra convención', () => {
    expect(diferenciaMaxima(orbita('figura-de-ocho').estadoInicial, girado())).toBeLessThanOrEqual(
      5e-8,
    );
  });

  it('la energía coincide con la del estado publicado', () => {
    const delCatalogo = energiaDe(orbita('figura-de-ocho').estadoInicial);
    expect(Math.abs(delCatalogo - energiaDe(publicado))).toBeLessThanOrEqual(1e-6);
  });

  it('el estado publicado vuelve al inicio tras un periodo', () => {
    const t = integrarPeriodo({ periodo: PERIODO, estadoInicial: Array.from(publicado) });
    const final = nodo(t, numeroDeNodos(t) - 1);
    expect(diferenciaMaxima(final, publicado)).toBeLessThanOrEqual(1e-6);
    expect(en(t.tiempos, numeroDeNodos(t) - 1)).toBe(PERIODO);
  });
});
