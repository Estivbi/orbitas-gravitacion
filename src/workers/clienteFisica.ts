import type { Slug, Trayectoria } from '@/lib/fisica';
import type { Peticion, Respuesta } from './protocolo';

/** Lo mínimo que el cliente necesita de un Worker; el real lo cumple y las pruebas lo simulan. */
export interface TrabajadorLike {
  postMessage(mensaje: Peticion): void;
  addEventListener(tipo: 'message', escucha: (evento: { data: Respuesta }) => void): void;
  addEventListener(tipo: 'error', escucha: (evento: { message: string }) => void): void;
  terminate(): void;
}

interface Pendiente {
  resolver: (trayectoria: Trayectoria) => void;
  rechazar: (causa: Error) => void;
}

export function crearClienteFisica(fabrica: () => TrabajadorLike) {
  let trabajador: TrabajadorLike | undefined;
  let siguienteId = 1;
  const pendientes = new Map<number, Pendiente>();
  const cache = new Map<Slug, Promise<Trayectoria>>();

  function rechazarTodas(causa: Error): void {
    const afectadas = [...pendientes.values()];
    pendientes.clear();
    afectadas.forEach(({ rechazar }) => rechazar(causa));
  }

  function obtenerTrabajador(): TrabajadorLike {
    if (!trabajador) {
      const nuevo = fabrica();
      nuevo.addEventListener('message', ({ data }) => {
        if (!data) {
          return;
        }
        if (data.id === null) {
          // Sin id no se sabe a quién responder: se avisa a todos.
          rechazarTodas(new Error(data.tipo === 'error' ? data.mensaje : 'Respuesta sin id'));
          return;
        }
        const pendiente = pendientes.get(data.id);
        if (!pendiente) {
          return;
        }
        pendientes.delete(data.id);
        if (data.tipo === 'error') {
          pendiente.rechazar(new Error(data.mensaje));
        } else {
          pendiente.resolver(data.trayectoria);
        }
      });
      nuevo.addEventListener('error', ({ message }) => {
        // Un Worker que falla (por ejemplo, porque no carga su script) no volverá a responder:
        // se descarta para que la siguiente petición cree uno nuevo.
        nuevo.terminate();
        if (trabajador === nuevo) {
          trabajador = undefined;
        }
        rechazarTodas(new Error(message));
      });
      trabajador = nuevo;
    }
    return trabajador;
  }

  /** Todos los llamadores reciben el mismo objeto: no se debe modificar. */
  function calcularTrayectoria(slug: Slug): Promise<Trayectoria> {
    const guardada = cache.get(slug);
    if (guardada) {
      return guardada;
    }
    const promesa = new Promise<Trayectoria>((resolver, rechazar) => {
      const id = siguienteId++;
      pendientes.set(id, { resolver, rechazar });
      try {
        obtenerTrabajador().postMessage({ tipo: 'calcular', id, slug });
      } catch (causa) {
        // Si no se pudo crear el Worker, la petición no quedará pendiente para siempre.
        pendientes.delete(id);
        rechazar(causa instanceof Error ? causa : new Error(String(causa)));
      }
    });
    cache.set(slug, promesa);
    // Si falla, se olvida para poder reintentar; quien la pidió recibe el rechazo igualmente.
    promesa.catch(() => cache.delete(slug));
    return promesa;
  }

  return { calcularTrayectoria };
}

/** Cliente real: el Worker se crea en la primera petición, nunca al importar el módulo. */
const clienteReal = crearClienteFisica(
  () => new Worker(new URL('./fisica.worker.ts', import.meta.url), { type: 'module' }),
);

export const calcularTrayectoria = clienteReal.calcularTrayectoria;
