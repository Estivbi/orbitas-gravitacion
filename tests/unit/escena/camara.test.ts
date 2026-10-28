import { describe, expect, it } from 'vitest';
import {
  DISTANCIA_MAXIMA,
  DISTANCIA_MINIMA,
  POLAR_MAXIMO,
  POLAR_MINIMO,
  VELOCIDAD_GIRO_AUTOMATICO,
  VISTA_INICIAL,
  aplicarOrden,
  distanciaInicial,
  girarAutomaticamente,
  ordenDeArrastre,
  ordenDePellizco,
  ordenDeRueda,
  ordenDeTecla,
  posicionCamara,
  type OrdenCamara,
  type VistaCamara,
} from '@/lib/escena/camara';

const SIN_MODIFICADORES = { ctrl: false, meta: false, alt: false };

function girar(orden: OrdenCamara | 'alternar' | null) {
  if (orden === null || orden === 'alternar' || orden.tipo !== 'girar') {
    throw new Error(`se esperaba una orden de giro y llegó ${JSON.stringify(orden)}`);
  }
  return orden;
}

function acercar(orden: OrdenCamara | 'alternar' | null) {
  if (orden === null || orden === 'alternar' || orden.tipo !== 'acercar') {
    throw new Error(`se esperaba una orden de acercar y llegó ${JSON.stringify(orden)}`);
  }
  return orden;
}

describe('GRV-03 · criterio 5: cámara', () => {
  it('la vista inicial es la de la spec', () => {
    expect(VISTA_INICIAL).toEqual({ acimut: 0.6, polar: 1.0, distancia: 1 });
  });

  describe('teclado', () => {
    it('las flechas horizontales giran el acimut 0,14 en sentidos opuestos', () => {
      const izquierda = girar(ordenDeTecla('ArrowLeft'));
      const derecha = girar(ordenDeTecla('ArrowRight'));
      expect(Math.abs(izquierda.dAcimut)).toBeCloseTo(0.14, 10);
      expect(izquierda.dPolar).toBe(0);
      expect(derecha.dAcimut).toBeCloseTo(-izquierda.dAcimut, 10);
      expect(derecha.dPolar).toBe(0);
    });

    it('las flechas verticales giran el ángulo polar 0,1 en sentidos opuestos', () => {
      const arriba = girar(ordenDeTecla('ArrowUp'));
      const abajo = girar(ordenDeTecla('ArrowDown'));
      expect(Math.abs(arriba.dPolar)).toBeCloseTo(0.1, 10);
      expect(arriba.dAcimut).toBe(0);
      expect(abajo.dPolar).toBeCloseTo(-arriba.dPolar, 10);
      expect(abajo.dAcimut).toBe(0);
    });

    it.each(['+', '='])('%s acerca con factor 0,88', (tecla) => {
      expect(acercar(ordenDeTecla(tecla)).factor).toBeCloseTo(0.88, 10);
    });

    it('- aleja con factor 1,14', () => {
      expect(acercar(ordenDeTecla('-')).factor).toBeCloseTo(1.14, 10);
    });

    it('Home restablece y el espacio alterna', () => {
      expect(ordenDeTecla('Home')).toEqual({ tipo: 'restablecer' });
      expect(ordenDeTecla(' ')).toBe('alternar');
    });

    it.each(['a', 'Enter', 'Tab', 'Escape', '0'])('%s no es una orden', (tecla) => {
      expect(ordenDeTecla(tecla)).toBeNull();
    });

    it.each([
      ['ctrl', { ...SIN_MODIFICADORES, ctrl: true }],
      ['meta', { ...SIN_MODIFICADORES, meta: true }],
      ['alt', { ...SIN_MODIFICADORES, alt: true }],
    ])('con %s pulsado ninguna tecla es una orden', (_nombre, modificadores) => {
      for (const tecla of ['ArrowLeft', 'ArrowUp', '+', '=', '-', 'Home', ' ']) {
        expect(ordenDeTecla(tecla, modificadores)).toBeNull();
      }
    });

    it('sin modificadores explícitos se comporta como sin ninguno pulsado', () => {
      expect(ordenDeTecla('Home', SIN_MODIFICADORES)).toEqual({ tipo: 'restablecer' });
    });
  });

  describe('ratón, rueda y tacto', () => {
    it('arrastrar gira 0,008 rad por píxel y el sentido se invierte con el desplazamiento', () => {
      const adelante = girar(ordenDeArrastre(100, 0));
      const atras = girar(ordenDeArrastre(-100, 0));
      expect(Math.abs(adelante.dAcimut)).toBeCloseTo(0.8, 10);
      expect(adelante.dPolar).toBe(0);
      expect(atras.dAcimut).toBeCloseTo(-adelante.dAcimut, 10);

      const vertical = girar(ordenDeArrastre(0, 50));
      expect(Math.abs(vertical.dPolar)).toBeCloseTo(0.4, 10);
      expect(vertical.dAcimut).toBe(0);
    });

    it('la rueda acerca con exp(deltaY · 0,0012)', () => {
      expect(acercar(ordenDeRueda(100)).factor).toBeCloseTo(Math.exp(0.12), 10);
      expect(acercar(ordenDeRueda(-100)).factor).toBeCloseTo(Math.exp(-0.12), 10);
      expect(acercar(ordenDeRueda(0)).factor).toBe(1);
    });

    it('el pellizco acerca cuando los dedos se separan y aleja cuando se juntan', () => {
      expect(acercar(ordenDePellizco(100, 200)).factor).toBeCloseTo(0.5, 10);
      expect(acercar(ordenDePellizco(200, 100)).factor).toBeCloseTo(2, 10);
      expect(acercar(ordenDePellizco(120, 120)).factor).toBe(1);
    });

    it.each([
      [0, 100],
      [100, 0],
      [-5, 100],
      [100, -5],
    ])('el pellizco con separaciones %d y %d no es una orden', (anterior, actual) => {
      expect(ordenDePellizco(anterior, actual)).toBeNull();
    });
  });

  describe('giro automático', () => {
    const vista: VistaCamara = { acimut: 1, polar: 0.9, distancia: 1.3 };

    it('solo cambia el acimut, en proporción a dt', () => {
      const girada = girarAutomaticamente(vista, 0.1);
      expect(girada.acimut - vista.acimut).toBeCloseTo(VELOCIDAD_GIRO_AUTOMATICO * 0.1, 10);
      expect(girada.polar).toBe(vista.polar);
      expect(girada.distancia).toBe(vista.distancia);
    });

    it('recorta dt a [0, 0,25]', () => {
      expect(girarAutomaticamente(vista, 10).acimut - vista.acimut).toBeCloseTo(
        VELOCIDAD_GIRO_AUTOMATICO * 0.25,
        10,
      );
      expect(girarAutomaticamente(vista, -3).acimut).toBe(vista.acimut);
    });
  });

  describe('aplicar órdenes', () => {
    it('girar suma los incrementos', () => {
      const vista = aplicarOrden(VISTA_INICIAL, { tipo: 'girar', dAcimut: 0.2, dPolar: -0.1 });
      expect(vista.acimut).toBeCloseTo(0.8, 10);
      expect(vista.polar).toBeCloseTo(0.9, 10);
      expect(vista.distancia).toBe(VISTA_INICIAL.distancia);
    });

    it('acercar multiplica la distancia', () => {
      const vista = aplicarOrden(VISTA_INICIAL, { tipo: 'acercar', factor: 1.2 });
      expect(vista.distancia).toBeCloseTo(1.2, 10);
    });

    it('el ángulo polar nunca sale de sus límites aunque se repita la orden', () => {
      let abajo: VistaCamara = VISTA_INICIAL;
      let arriba: VistaCamara = VISTA_INICIAL;
      for (let i = 0; i < 200; i++) {
        abajo = aplicarOrden(abajo, { tipo: 'girar', dAcimut: 0, dPolar: -0.3 });
        arriba = aplicarOrden(arriba, { tipo: 'girar', dAcimut: 0, dPolar: 0.3 });
      }
      expect(abajo.polar).toBeCloseTo(POLAR_MINIMO, 10);
      expect(arriba.polar).toBeCloseTo(POLAR_MAXIMO, 10);
      expect(POLAR_MINIMO).toBeCloseTo(0.12, 10);
      expect(POLAR_MAXIMO).toBeCloseTo(Math.PI - 0.12, 10);
    });

    it('la distancia nunca sale de sus límites aunque se repita la orden', () => {
      let cerca: VistaCamara = VISTA_INICIAL;
      let lejos: VistaCamara = VISTA_INICIAL;
      for (let i = 0; i < 200; i++) {
        cerca = aplicarOrden(cerca, { tipo: 'acercar', factor: 0.5 });
        lejos = aplicarOrden(lejos, { tipo: 'acercar', factor: 2 });
      }
      expect(cerca.distancia).toBeCloseTo(DISTANCIA_MINIMA, 10);
      expect(lejos.distancia).toBeCloseTo(DISTANCIA_MAXIMA, 10);
      expect(DISTANCIA_MINIMA).toBeCloseTo(1.6 / 3.3, 10);
      expect(DISTANCIA_MAXIMA).toBeCloseTo(10 / 3.3, 10);
    });

    it('el acimut se normaliza a [0, 2π)', () => {
      let vista: VistaCamara = { ...VISTA_INICIAL, acimut: 0.05 };
      vista = aplicarOrden(vista, { tipo: 'girar', dAcimut: -0.1, dPolar: 0 });
      expect(vista.acimut).toBeGreaterThanOrEqual(0);
      expect(vista.acimut).toBeLessThan(2 * Math.PI);
      expect(vista.acimut).toBeCloseTo(2 * Math.PI - 0.05, 10);

      for (let i = 0; i < 500; i++) {
        vista = aplicarOrden(vista, { tipo: 'girar', dAcimut: 0.7, dPolar: 0 });
        expect(vista.acimut).toBeGreaterThanOrEqual(0);
        expect(vista.acimut).toBeLessThan(2 * Math.PI);
      }
    });

    it('restablecer devuelve la vista inicial', () => {
      const lejos: VistaCamara = { acimut: 4, polar: 2, distancia: 2.5 };
      expect(aplicarOrden(lejos, { tipo: 'restablecer' })).toEqual(VISTA_INICIAL);
    });

    it('no modifica la vista de entrada', () => {
      const entrada: VistaCamara = { ...VISTA_INICIAL };
      aplicarOrden(entrada, { tipo: 'girar', dAcimut: 1, dPolar: 1 });
      expect(entrada).toEqual(VISTA_INICIAL);
    });
  });

  describe('distancia inicial y posición', () => {
    it('crece con el radio', () => {
      expect(distanciaInicial(2, 16 / 9)).toBeGreaterThan(distanciaInicial(1, 16 / 9));
      expect(distanciaInicial(1, 16 / 9)).toBeCloseTo(3.3, 10);
    });

    it('es mayor en pantallas verticales', () => {
      expect(distanciaInicial(1, 0.5)).toBeGreaterThan(distanciaInicial(1, 16 / 9));
    });

    it('la posición de la cámara está a distancia · distanciaBase del origen', () => {
      const vistas: VistaCamara[] = [
        VISTA_INICIAL,
        { acimut: 3.5, polar: 2.2, distancia: 1.7 },
        { acimut: 0, polar: POLAR_MINIMO, distancia: DISTANCIA_MINIMA },
      ];
      for (const vista of vistas) {
        const [x, y, z] = posicionCamara(vista, 8);
        expect(Math.hypot(x, y, z)).toBeCloseTo(vista.distancia * 8, 9);
      }
    });

    it('z apunta hacia arriba: con polar pequeño la cámara está sobre el plano', () => {
      const [, , z] = posicionCamara({ acimut: 1, polar: 0.2, distancia: 1 }, 10);
      expect(z).toBeCloseTo(10 * Math.cos(0.2), 9);
      const [, , zAbajo] = posicionCamara({ acimut: 1, polar: Math.PI - 0.2, distancia: 1 }, 10);
      expect(zAbajo).toBeLessThan(0);
    });
  });
});
