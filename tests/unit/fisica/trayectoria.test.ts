import { describe, expect, it } from 'vitest';
import { estadoEn, integrarPeriodo, muestrear, ORBITAS } from '@/lib/fisica';
import { diferenciaMaxima, en, nodo, numeroDeNodos, orbita, TODAS, trayectoriaDe } from './ayudas';

describe('GRV-02 · criterio 9: estructura de la trayectoria', () => {
  it.each(TODAS)('%s empieza en 0, termina exactamente en T y avanza siempre', (slug) => {
    const t = trayectoriaDe(slug);
    const n = numeroDeNodos(t);
    expect(en(t.tiempos, 0)).toBe(0);
    expect(en(t.tiempos, n - 1)).toBe(orbita(slug).periodo);
    expect(t.periodo).toBe(orbita(slug).periodo);
    for (let i = 1; i < n; i++) {
      expect(en(t.tiempos, i)).toBeGreaterThan(en(t.tiempos, i - 1));
    }
  });

  it.each(TODAS)('%s respeta el paso máximo por defecto y tiene al menos 721 nodos', (slug) => {
    const t = trayectoriaDe(slug);
    const limite = (orbita(slug).periodo / 720) * (1 + 1e-12);
    let maximo = 0;
    for (let i = 1; i < numeroDeNodos(t); i++) {
      maximo = Math.max(maximo, en(t.tiempos, i) - en(t.tiempos, i - 1));
    }
    expect(maximo).toBeLessThanOrEqual(limite);
    expect(numeroDeNodos(t)).toBeGreaterThanOrEqual(721);
  });

  it('respeta un paso máximo propio', () => {
    const o = orbita('lagrange');
    const paso = o.periodo / 2000;
    const t = integrarPeriodo(o, { pasoMaximo: paso });
    let maximo = 0;
    for (let i = 1; i < numeroDeNodos(t); i++) {
      maximo = Math.max(maximo, en(t.tiempos, i) - en(t.tiempos, i - 1));
    }
    expect(maximo).toBeLessThanOrEqual(paso * (1 + 1e-12));
    expect(numeroDeNodos(t)).toBeGreaterThanOrEqual(2001);
  });

  it.each(TODAS)('%s guarda 12 valores por nodo y empieza en el estado inicial', (slug) => {
    const t = trayectoriaDe(slug);
    expect(t.estados.length).toBe(12 * numeroDeNodos(t));
    expect(diferenciaMaxima(nodo(t, 0), orbita(slug).estadoInicial)).toBe(0);
  });

  it.each(TODAS)('%s usa buffers propios y de tamaño exacto', (slug) => {
    const { tiempos, estados } = trayectoriaDe(slug);
    expect(tiempos.buffer).not.toBe(estados.buffer);
    for (const valores of [tiempos, estados]) {
      expect(valores.byteOffset).toBe(0);
      expect(valores.buffer.byteLength).toBe(valores.byteLength);
    }
  });

  it.each(TODAS)('%s tiene un radio máximo coherente con sus nodos', (slug) => {
    const t = trayectoriaDe(slug);
    let esperado = 1;
    for (let i = 0; i < numeroDeNodos(t); i++) {
      const e = nodo(t, i);
      for (let cuerpo = 0; cuerpo < 3; cuerpo++) {
        esperado = Math.max(esperado, Math.hypot(en(e, 2 * cuerpo), en(e, 2 * cuerpo + 1)));
      }
    }
    expect(t.radioMaximo).toBeGreaterThanOrEqual(1);
    expect(Math.abs(t.radioMaximo - esperado)).toBeLessThanOrEqual(1e-12);
  });

  it('no modifica el catálogo al integrar, interpolar ni muestrear', () => {
    const antes = JSON.stringify(ORBITAS);
    const t = integrarPeriodo(orbita('butterfly-i'));
    estadoEn(t, 0.37);
    muestrear(t, 100);
    expect(JSON.stringify(ORBITAS)).toBe(antes);
  });
});

describe('GRV-02 · criterio 19: coste razonable', () => {
  it('integra las seis órbitas con menos de 20 000 nodos cada una y en menos de 3 s', () => {
    const inicio = performance.now();
    const trayectorias = TODAS.map((slug) => integrarPeriodo(orbita(slug)));
    const milisegundos = performance.now() - inicio;

    for (const t of trayectorias) {
      expect(numeroDeNodos(t)).toBeLessThan(20_000);
    }
    expect(milisegundos).toBeLessThan(3000);
  });
});
