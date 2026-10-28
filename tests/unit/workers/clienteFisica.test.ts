import { describe, expect, it, vi } from 'vitest';
import type { Trayectoria } from '@/lib/fisica';
import { crearClienteFisica, type TrabajadorLike } from '@/workers/clienteFisica';
import type { Peticion, Respuesta } from '@/workers/protocolo';

type EscuchaMensaje = (evento: { data: Respuesta }) => void;
type EscuchaError = (evento: { message: string }) => void;

class TrabajadorFalso implements TrabajadorLike {
  enviados: Peticion[] = [];
  private escuchasMensaje: EscuchaMensaje[] = [];
  private escuchasError: EscuchaError[] = [];

  postMessage(mensaje: Peticion): void {
    this.enviados.push(mensaje);
  }

  addEventListener(tipo: 'message', escucha: EscuchaMensaje): void;
  addEventListener(tipo: 'error', escucha: EscuchaError): void;
  addEventListener(tipo: 'message' | 'error', escucha: EscuchaMensaje | EscuchaError): void {
    if (tipo === 'message') {
      this.escuchasMensaje.push(escucha as EscuchaMensaje);
    } else {
      this.escuchasError.push(escucha as EscuchaError);
    }
  }

  terminate(): void {}

  responder(respuesta: Respuesta): void {
    this.escuchasMensaje.forEach((escucha) => escucha({ data: respuesta }));
  }

  fallar(mensaje: string): void {
    this.escuchasError.forEach((escucha) => escucha({ message: mensaje }));
  }

  peticion(indice: number): Peticion {
    const enviada = this.enviados[indice];
    if (!enviada) {
      throw new Error(`No se envió la petición ${indice}`);
    }
    return enviada;
  }
}

const trayectoriaFalsa = (periodo: number): Trayectoria => ({
  periodo,
  tiempos: new Float64Array(2),
  estados: new Float64Array(24),
  radioMaximo: 1,
  distanciaMinima: 1,
  velocidadMaxima: 1,
});

function preparar() {
  const trabajador = new TrabajadorFalso();
  const fabrica = vi.fn(() => trabajador);
  return { trabajador, fabrica, cliente: crearClienteFisica(fabrica) };
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

  it('rechaza las pendientes cuando el Worker emite un error', async () => {
    const { trabajador, cliente } = preparar();
    const promesa = cliente.calcularTrayectoria('lagrange');

    trabajador.fallar('no se pudo cargar el script');

    await expect(promesa).rejects.toThrow('no se pudo cargar el script');
  });

  it('reutiliza la promesa de un slug ya pedido sin enviar otro mensaje', () => {
    const { trabajador, cliente } = preparar();

    const primera = cliente.calcularTrayectoria('lagrange');
    const segunda = cliente.calcularTrayectoria('lagrange');

    expect(segunda).toBe(primera);
    expect(trabajador.enviados).toHaveLength(1);
  });
});
