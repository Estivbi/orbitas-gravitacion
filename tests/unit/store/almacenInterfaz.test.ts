import { describe, expect, it, vi } from 'vitest';
import { VISTA_INICIAL, type VistaCamara } from '@/lib/escena/camara';
import * as modulo from '@/store/almacenInterfaz';
import {
  ESTADO_INICIAL,
  crearAlmacenInterfaz,
  selectores,
  type AlmacenInterfaz,
} from '@/store/almacenInterfaz';

/** Solo los datos del estado (sin las acciones), para compararlos con toEqual. */
function datosDe(almacen: AlmacenInterfaz): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(almacen.getState()).filter(([, valor]) => typeof valor !== 'function'),
  );
}

/** Un suscriptor que cuenta cuántas veces se le notifica un cambio. */
function vigilar(almacen: AlmacenInterfaz) {
  const escucha = vi.fn();
  almacen.subscribe(escucha);
  return escucha;
}

const DATOS_INICIALES = {
  ordenGaleria: 'catalogo',
  ultimaOrbita: null,
  velocidad: 1,
  longitudEstela: 0.5,
  reanudacion: {},
  entradaPorHistorial: false,
  ley: { m1: 4, m2: 2, r: 4 },
  tutor: { nivel: 1, racha: 0 },
};

const vista = (): VistaCamara => ({ acimut: 1.2, polar: 0.8, distancia: 0.7 });

describe('GRV-05 · ley y tutor en el almacén', () => {
  it('fijarLey recorta y fusiona, y no notifica si no cambia nada', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().fijarLey({ r: 99 });
    expect(almacen.getState().ley).toEqual({ m1: 4, m2: 2, r: 10 });
    almacen.getState().fijarLey({ r: 10 });
    expect(escucha).toHaveBeenCalledTimes(1);
  });

  it('registrarResultado sube de nivel con dos aciertos seguidos', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().registrarResultado(true);
    almacen.getState().registrarResultado(true);
    expect(almacen.getState().tutor).toEqual({ nivel: 2, racha: 0 });
  });
});

describe('GRV-04 · criterio 7: estado inicial', () => {
  it('es el del contrato, y solo esos ocho campos de datos', () => {
    expect(datosDe(crearAlmacenInterfaz())).toEqual(DATOS_INICIALES);
  });

  it('ESTADO_INICIAL es la misma constante y está congelada, también su reanudación', () => {
    expect(ESTADO_INICIAL).toEqual(DATOS_INICIALES);
    expect(Object.isFrozen(ESTADO_INICIAL)).toBe(true);
    expect(Object.isFrozen(ESTADO_INICIAL.reanudacion)).toBe(true);
  });

  it('crearAlmacenInterfaz acepta un estado inicial parcial', () => {
    const almacen = crearAlmacenInterfaz({ ordenGaleria: 'periodo', velocidad: 4 });
    expect(datosDe(almacen)).toEqual({ ...DATOS_INICIALES, ordenGaleria: 'periodo', velocidad: 4 });
  });

  it('crear un almacén no modifica ESTADO_INICIAL', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().elegirOrden('energia');
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.5, vista: vista() });
    expect(ESTADO_INICIAL).toEqual(DATOS_INICIALES);
    expect(ESTADO_INICIAL.reanudacion).toEqual({});
  });
});

describe('GRV-04 · criterio 7: elegirOrden', () => {
  it('fija el orden', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().elegirOrden('energia');
    expect(almacen.getState().ordenGaleria).toBe('energia');
    almacen.getState().elegirOrden('periodo');
    expect(almacen.getState().ordenGaleria).toBe('periodo');
  });

  it('repetirlo no cambia el estado ni notifica', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().elegirOrden('energia');
    const antes = almacen.getState();
    const escucha = vigilar(almacen);
    almacen.getState().elegirOrden('energia');
    expect(escucha).not.toHaveBeenCalled();
    expect(almacen.getState()).toBe(antes);
  });

  it('un valor desconocido no hace nada ni notifica', () => {
    const almacen = crearAlmacenInterfaz();
    const antes = almacen.getState();
    const escucha = vigilar(almacen);
    almacen.getState().elegirOrden('precio' as never);
    almacen.getState().elegirOrden(undefined as never);
    almacen.getState().elegirOrden(3 as never);
    expect(escucha).not.toHaveBeenCalled();
    expect(almacen.getState()).toBe(antes);
    expect(almacen.getState().ordenGaleria).toBe('catalogo');
  });

  it('un cambio real notifica una vez', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().elegirOrden('periodo');
    expect(escucha).toHaveBeenCalledTimes(1);
  });
});

describe('GRV-04 · criterio 7: última órbita', () => {
  it('recordarOrbita y olvidarOrbita fijan y limpian ultimaOrbita', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().recordarOrbita('goggles');
    expect(almacen.getState().ultimaOrbita).toBe('goggles');
    almacen.getState().recordarOrbita('moth-i');
    expect(almacen.getState().ultimaOrbita).toBe('moth-i');
    almacen.getState().olvidarOrbita();
    expect(almacen.getState().ultimaOrbita).toBeNull();
  });

  it('sin cambio de valor no se notifica (guarda de cada acción)', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().olvidarOrbita();
    expect(escucha).not.toHaveBeenCalled();
    almacen.getState().recordarOrbita('goggles');
    expect(escucha).toHaveBeenCalledTimes(1);
    almacen.getState().recordarOrbita('goggles');
    expect(escucha).toHaveBeenCalledTimes(1);
  });
});

describe('GRV-04 · criterio 7: velocidad y longitud de la estela', () => {
  it('fijarVelocidad acepta las del conjunto y se ignora fuera de él', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().fijarVelocidad(2);
    expect(almacen.getState().velocidad).toBe(2);
    const escucha = vigilar(almacen);
    almacen.getState().fijarVelocidad(3);
    almacen.getState().fijarVelocidad(NaN);
    almacen.getState().fijarVelocidad('4' as never);
    almacen.getState().fijarVelocidad(0);
    expect(almacen.getState().velocidad).toBe(2);
    expect(escucha).not.toHaveBeenCalled();
  });

  it('fijarVelocidad acepta cada valor del conjunto y no notifica si no cambia', () => {
    const almacen = crearAlmacenInterfaz();
    for (const v of [0.25, 0.5, 4, 1]) {
      almacen.getState().fijarVelocidad(v);
      expect(almacen.getState().velocidad).toBe(v);
    }
    const escucha = vigilar(almacen);
    almacen.getState().fijarVelocidad(1);
    expect(escucha).not.toHaveBeenCalled();
  });

  it('fijarLongitudEstela limita a [0,05, 1] e ignora lo no finito', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().fijarLongitudEstela(2);
    expect(almacen.getState().longitudEstela).toBe(1);
    almacen.getState().fijarLongitudEstela(0);
    expect(almacen.getState().longitudEstela).toBe(0.05);
    almacen.getState().fijarLongitudEstela(-3);
    expect(almacen.getState().longitudEstela).toBe(0.05);
    almacen.getState().fijarLongitudEstela(0.3);
    expect(almacen.getState().longitudEstela).toBe(0.3);

    const escucha = vigilar(almacen);
    almacen.getState().fijarLongitudEstela(NaN);
    almacen.getState().fijarLongitudEstela(Infinity);
    almacen.getState().fijarLongitudEstela(-Infinity);
    expect(almacen.getState().longitudEstela).toBe(0.3);
    expect(escucha).not.toHaveBeenCalled();
  });

  it('fijarLongitudEstela con el valor actual (ya limitado) no notifica', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().fijarLongitudEstela(0.5);
    expect(escucha).not.toHaveBeenCalled();
    almacen.getState().fijarLongitudEstela(1);
    almacen.getState().fijarLongitudEstela(7);
    expect(escucha).toHaveBeenCalledTimes(1);
  });
});

describe('GRV-04 · criterio 7: reanudación', () => {
  it('envuelve la posición y guarda una copia de la vista', () => {
    const almacen = crearAlmacenInterfaz();
    const v = vista();
    almacen.getState().guardarReanudacion('goggles', { posicion: 1.25, vista: v });

    const guardado = almacen.getState().reanudacion.goggles;
    expect(guardado).toBeDefined();
    expect(guardado!.posicion).toBeCloseTo(0.25, 12);
    expect(guardado!.vista).toEqual(vista());
    expect(guardado!.vista).not.toBe(v);

    v.acimut = 99;
    v.polar = 99;
    v.distancia = 99;
    expect(almacen.getState().reanudacion.goggles!.vista).toEqual(vista());
  });

  it('envuelve también las posiciones negativas y la unidad', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().guardarReanudacion('lagrange', { posicion: -0.25, vista: vista() });
    almacen.getState().guardarReanudacion('moth-i', { posicion: 1, vista: vista() });
    expect(almacen.getState().reanudacion['lagrange']!.posicion).toBeCloseTo(0.75, 12);
    expect(almacen.getState().reanudacion['moth-i']!.posicion).toBe(0);
  });

  it('no toca los otros slugs y sustituye el valor anterior', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().guardarReanudacion('moth-i', { posicion: 0.1, vista: VISTA_INICIAL });
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.2, vista: vista() });
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.6, vista: VISTA_INICIAL });

    const { reanudacion } = almacen.getState();
    expect(Object.keys(reanudacion).sort()).toEqual(['goggles', 'moth-i']);
    expect(reanudacion['moth-i']).toEqual({ posicion: 0.1, vista: VISTA_INICIAL });
    expect(reanudacion.goggles).toEqual({ posicion: 0.6, vista: VISTA_INICIAL });
    expect(reanudacion['figura-de-ocho']).toBeUndefined();
  });

  it('crea un objeto reanudacion nuevo (la referencia cambia) y no muta el anterior', () => {
    const almacen = crearAlmacenInterfaz();
    const vacia = almacen.getState().reanudacion;
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.2, vista: vista() });
    const primera = almacen.getState().reanudacion;
    expect(primera).not.toBe(vacia);
    expect(vacia).toEqual({});
    expect(ESTADO_INICIAL.reanudacion).toEqual({});

    almacen.getState().guardarReanudacion('moth-i', { posicion: 0.4, vista: vista() });
    const segunda = almacen.getState().reanudacion;
    expect(segunda).not.toBe(primera);
    expect(Object.keys(primera)).toEqual(['goggles']);

    expect(Object.keys(segunda).sort()).toEqual(['goggles', 'moth-i']);
  });

  it('una posición no finita se ignora: ni cambia la reanudación ni notifica', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.2, vista: vista() });
    const antes = almacen.getState().reanudacion;
    const escucha = vigilar(almacen);
    almacen.getState().guardarReanudacion('goggles', { posicion: NaN, vista: vista() });
    almacen.getState().guardarReanudacion('moth-i', { posicion: Infinity, vista: vista() });
    expect(almacen.getState().reanudacion).toBe(antes);
    expect(escucha).not.toHaveBeenCalled();
  });
});

describe('GRV-04 · criterio 7: reanudación sin cambio ni valores no finitos', () => {
  it('guardar dos veces el mismo punto notifica una sola vez y conserva la referencia', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.5, vista: vista() });
    expect(escucha).toHaveBeenCalledTimes(1);
    const guardada = almacen.getState().reanudacion;
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.5, vista: vista() });
    expect(escucha).toHaveBeenCalledTimes(1);
    expect(almacen.getState().reanudacion).toBe(guardada);
    // Una posición que se envuelve al mismo valor tampoco cuenta como cambio.
    almacen.getState().guardarReanudacion('goggles', { posicion: 1.5, vista: vista() });
    expect(almacen.getState().reanudacion).toBe(guardada);
  });

  it('cambiar solo la posición o solo un campo de la vista sí notifica', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.4, vista: vista() });
    const escucha = vigilar(almacen);
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.5, vista: vista() });
    almacen.getState().guardarReanudacion('goggles', {
      posicion: 0.5,
      vista: { ...vista(), acimut: 2 },
    });
    almacen.getState().guardarReanudacion('goggles', {
      posicion: 0.5,
      vista: { ...vista(), acimut: 2, polar: 0.1 },
    });
    almacen.getState().guardarReanudacion('goggles', {
      posicion: 0.5,
      vista: { ...vista(), acimut: 2, polar: 0.1, distancia: 1.5 },
    });
    expect(escucha).toHaveBeenCalledTimes(4);
  });

  it('una vista con acimut, polar o distancia no finitos se ignora sin notificar', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().guardarReanudacion('goggles', { posicion: 0.2, vista: vista() });
    const antes = almacen.getState().reanudacion;
    const escucha = vigilar(almacen);
    const casos: VistaCamara[] = [
      { ...vista(), acimut: NaN },
      { ...vista(), polar: Infinity },
      { ...vista(), distancia: NaN },
      { ...vista(), acimut: -Infinity },
    ];
    for (const caso of casos) {
      almacen.getState().guardarReanudacion('goggles', { posicion: 0.6, vista: caso });
      almacen.getState().guardarReanudacion('moth-i', { posicion: 0.6, vista: caso });
    }
    expect(almacen.getState().reanudacion).toBe(antes);
    expect(escucha).not.toHaveBeenCalled();
  });
});

describe('GRV-04 · criterio 7: entrada por historial', () => {
  it('marcarEntradaPorHistorial fija el valor y repetirlo no notifica', () => {
    const almacen = crearAlmacenInterfaz();
    const escucha = vigilar(almacen);
    almacen.getState().marcarEntradaPorHistorial(false);
    expect(escucha).not.toHaveBeenCalled();
    almacen.getState().marcarEntradaPorHistorial(true);
    expect(almacen.getState().entradaPorHistorial).toBe(true);
    expect(escucha).toHaveBeenCalledTimes(1);
    almacen.getState().marcarEntradaPorHistorial(true);
    expect(escucha).toHaveBeenCalledTimes(1);
    almacen.getState().marcarEntradaPorHistorial(false);
    expect(almacen.getState().entradaPorHistorial).toBe(false);
    expect(escucha).toHaveBeenCalledTimes(2);
  });
});

describe('GRV-04 · criterio 7: un almacén por proveedor', () => {
  it('dos almacenes no comparten estado', () => {
    const uno = crearAlmacenInterfaz();
    const otro = crearAlmacenInterfaz();
    expect(uno).not.toBe(otro);
    uno.getState().elegirOrden('energia');
    uno.getState().recordarOrbita('goggles');
    uno.getState().fijarVelocidad(4);
    uno.getState().guardarReanudacion('goggles', { posicion: 0.5, vista: vista() });
    expect(datosDe(otro)).toEqual(DATOS_INICIALES);
    expect(datosDe(crearAlmacenInterfaz())).toEqual(DATOS_INICIALES);
  });

  it('getInitialState no refleja los cambios', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().elegirOrden('energia');
    almacen.getState().marcarEntradaPorHistorial(true);
    const inicial = almacen.getInitialState();
    expect(inicial.ordenGaleria).toBe('catalogo');
    expect(inicial.entradaPorHistorial).toBe(false);
    expect(inicial.ultimaOrbita).toBeNull();
  });

  it('el módulo no exporta ninguna instancia de almacén (ningún export tiene getState)', () => {
    const exportados = Object.entries(modulo);
    expect(exportados.length).toBeGreaterThan(0);
    for (const [nombre, valor] of exportados) {
      const tieneGetState =
        valor !== null &&
        (typeof valor === 'object' || typeof valor === 'function') &&
        typeof (valor as { getState?: unknown }).getState === 'function';
      expect(tieneGetState, `${nombre} parece un almacén`).toBe(false);
    }
  });
});

describe('GRV-04 · criterio 7: selectores', () => {
  it('devuelven el valor del estado, y primitivos o la misma referencia en dos lecturas seguidas', () => {
    const almacen = crearAlmacenInterfaz();
    almacen.getState().elegirOrden('periodo');
    almacen.getState().recordarOrbita('moth-i');
    almacen.getState().fijarVelocidad(0.5);
    almacen.getState().fijarLongitudEstela(0.25);
    almacen.getState().guardarReanudacion('moth-i', { posicion: 0.3, vista: vista() });
    almacen.getState().marcarEntradaPorHistorial(true);
    const estado = almacen.getState();

    expect(selectores.ordenGaleria(estado)).toBe('periodo');
    expect(selectores.ultimaOrbita(estado)).toBe('moth-i');
    expect(selectores.velocidad(estado)).toBe(0.5);
    expect(selectores.longitudEstela(estado)).toBe(0.25);
    expect(selectores.entradaPorHistorial(estado)).toBe(true);
    expect(selectores.reanudacion(estado)).toBe(estado.reanudacion);

    for (const selector of Object.values(selectores)) {
      const a: unknown = selector(estado);
      const b: unknown = selector(almacen.getState());
      expect(Object.is(a, b)).toBe(true);
    }
  });
});
