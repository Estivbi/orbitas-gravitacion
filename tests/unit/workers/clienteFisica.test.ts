import { describe, expect, it, vi } from 'vitest';
import type { Trayectoria } from '@/lib/fisica';
import { crearClienteFisica } from '@/workers/clienteFisica';
import { TrabajadorFalso } from './trabajadorFalso';

const trayectoriaFalsa = (periodo: number): Trayectoria => ({
  periodo,
  tiempos: new Float64Array(2),
  estados: new Float64Array(24),
  radioMaximo: 1,
  distanciaMinima: 1,
  velocidadMaxima: 1,
});

/** La fábrica entrega los trabajadores falsos en orden y crea otros nuevos si hacen falta. */
function preparar() {
  const trabajadores = [new TrabajadorFalso()];
  let creados = 0;
  const fabrica = vi.fn(() => {
    const siguiente = trabajadores[creados] ?? new TrabajadorFalso();
    if (!trabajadores[creados]) {
      trabajadores.push(siguiente);
    }
    creados++;
    return siguiente;
  });
  const [trabajador] = trabajadores as [TrabajadorFalso];
  return { trabajador, trabajadores, fabrica, cliente: crearClienteFisica(fabrica) };
}

describe('GRV-02 · criterio 17: cliente del Worker', () => {
  it('no crea el Worker hasta la primera llamada y lo reutiliza', () => {
    const { fabrica, cliente } = preparar();
    expect(fabrica).not.toHaveBeenCalled();

    void cliente.calcularTrayectoria('lagrange');
    void cliente.calcularTrayectoria('goggles');
    expect(fabrica).toHaveBeenCalledTimes(1);
  });

  it('resuelve cada promesa con su trayectoria aunque las respuestas lleguen en otro orden', async () => {
    const { trabajador, cliente } = preparar();
    const lagrange = cliente.calcularTrayectoria('lagrange');
    const goggles = cliente.calcularTrayectoria('goggles');
    const [primera, segunda] = [trabajador.peticion(0), trabajador.peticion(1)];

    trabajador.responder({
      tipo: 'resultado',
      id: segunda.id,
      slug: 'goggles',
      trayectoria: trayectoriaFalsa(2),
    });
    trabajador.responder({
      tipo: 'resultado',
      id: primera.id,
      slug: 'lagrange',
      trayectoria: trayectoriaFalsa(1),
    });

    expect((await lagrange).periodo).toBe(1);
    expect((await goggles).periodo).toBe(2);
  });

  it('rechaza la promesa cuando llega una respuesta de error', async () => {
    const { trabajador, cliente } = preparar();
    const promesa = cliente.calcularTrayectoria('lagrange');

    trabajador.responder({
      tipo: 'error',
      id: trabajador.peticion(0).id,
      mensaje: 'fallo de cálculo',
    });

    await expect(promesa).rejects.toThrow('fallo de cálculo');
  });

  it('rechaza todas las pendientes ante una respuesta de error sin id', async () => {
    const { trabajador, cliente } = preparar();
    const lagrange = cliente.calcularTrayectoria('lagrange');
    const goggles = cliente.calcularTrayectoria('goggles');

    trabajador.responder({ tipo: 'error', id: null, mensaje: 'petición ilegible' });

    await expect(lagrange).rejects.toThrow('petición ilegible');
    await expect(goggles).rejects.toThrow('petición ilegible');
  });

  it('reutiliza la promesa de un slug ya pedido sin enviar otro mensaje', () => {
    const { trabajador, cliente } = preparar();

    const primera = cliente.calcularTrayectoria('lagrange');
    const segunda = cliente.calcularTrayectoria('lagrange');

    expect(segunda).toBe(primera);
    expect(trabajador.enviados).toHaveLength(1);
  });

  it('permite reintentar un slug cuya petición falló', async () => {
    const { trabajador, cliente } = preparar();
    const fallida = cliente.calcularTrayectoria('lagrange');
    trabajador.responder({ tipo: 'error', id: trabajador.peticion(0).id, mensaje: 'fallo' });
    await expect(fallida).rejects.toThrow('fallo');

    const reintento = cliente.calcularTrayectoria('lagrange');
    expect(reintento).not.toBe(fallida);
    expect(trabajador.enviados).toHaveLength(2);

    trabajador.responder({
      tipo: 'resultado',
      id: trabajador.peticion(1).id,
      slug: 'lagrange',
      trayectoria: trayectoriaFalsa(5),
    });
    expect((await reintento).periodo).toBe(5);
  });

  it('rechaza las pendientes, descarta el Worker que falla y crea otro en la siguiente petición', async () => {
    const { trabajador, trabajadores, fabrica, cliente } = preparar();
    const promesa = cliente.calcularTrayectoria('lagrange');

    trabajador.fallar('no se pudo cargar el script');

    await expect(promesa).rejects.toThrow('no se pudo cargar el script');
    expect(trabajador.terminado).toBe(true);

    void cliente.calcularTrayectoria('lagrange');
    expect(fabrica).toHaveBeenCalledTimes(2);
    expect(trabajadores[1]?.enviados).toHaveLength(1);
  });

  it('rechaza y permite reintentar si no se puede crear el Worker', async () => {
    const trabajador = new TrabajadorFalso();
    let intentos = 0;
    const cliente = crearClienteFisica(() => {
      if (++intentos === 1) {
        throw new Error('Worker no disponible');
      }
      return trabajador;
    });

    await expect(cliente.calcularTrayectoria('lagrange')).rejects.toThrow('Worker no disponible');

    void cliente.calcularTrayectoria('lagrange');
    expect(trabajador.enviados).toHaveLength(1);
  });
});
