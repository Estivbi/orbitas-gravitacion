import { manejarPeticion } from './protocolo';

// Los dos buffers de la trayectoria se transfieren al hilo principal en lugar de copiarse.
// No se guarda nada en caché aquí: tras transferir, los arrays quedan vacíos en este hilo.
self.addEventListener('message', (evento: MessageEvent<unknown>) => {
  const respuesta = manejarPeticion(evento.data);
  const transfer =
    respuesta.tipo === 'resultado'
      ? [respuesta.trayectoria.tiempos.buffer, respuesta.trayectoria.estados.buffer]
      : [];
  self.postMessage(respuesta, { transfer });
});
