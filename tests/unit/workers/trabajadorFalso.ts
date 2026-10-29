import type { TrabajadorLike } from '@/workers/clienteFisica';
import type { Peticion, Respuesta } from '@/workers/protocolo';

type EscuchaMensaje = (evento: { data: Respuesta }) => void;
type EscuchaError = (evento: { message: string }) => void;

/** Un Worker simulado: guarda lo que recibe y deja que la prueba decida qué responde. */
export class TrabajadorFalso implements TrabajadorLike {
  enviados: Peticion[] = [];
  terminado = false;
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

  terminate(): void {
    this.terminado = true;
  }

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
