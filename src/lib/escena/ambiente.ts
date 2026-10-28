/** Violeta, azafrán, verde azulado y blanco: los colores los resuelve quien dibuja. */
export const TAMANO_PALETA = 4;

/** `posiciones` tiene 3 valores por partícula. */
export interface CampoAmbiental {
  posiciones: Float32Array;
  paleta: Uint8Array;
  alfas: Float32Array;
}

const RADIO_MINIMO = 4.5;
const RADIO_MAXIMO = 15.5;
const ALFA_MINIMO = 0.18;
const ALFA_MAXIMO = 0.58;

/** mulberry32: generador determinista de números en [0, 1). */
function crearAzar(semilla: number): () => number {
  let estado = semilla >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let mezcla = Math.imul(estado ^ (estado >>> 15), estado | 1);
    mezcla ^= mezcla + Math.imul(mezcla ^ (mezcla >>> 7), mezcla | 61);
    return ((mezcla ^ (mezcla >>> 14)) >>> 0) / 4294967296;
  };
}

/** Partículas repartidas en una cáscara esférica alrededor de la órbita; misma semilla, mismo campo. */
export function generarCampoAmbiental(cantidad: number, semilla: number): CampoAmbiental {
  const azar = crearAzar(semilla);
  const posiciones = new Float32Array(cantidad * 3);
  const paleta = new Uint8Array(cantidad);
  const alfas = new Float32Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    const radio = RADIO_MINIMO + azar() * (RADIO_MAXIMO - RADIO_MINIMO);
    const azimut = azar() * 2 * Math.PI;
    const cosPolar = 2 * azar() - 1;
    const senPolar = Math.sqrt(1 - cosPolar * cosPolar);
    posiciones[3 * i] = radio * senPolar * Math.cos(azimut);
    posiciones[3 * i + 1] = radio * senPolar * Math.sin(azimut);
    posiciones[3 * i + 2] = radio * cosPolar;
    paleta[i] = Math.floor(azar() * TAMANO_PALETA);
    alfas[i] = ALFA_MINIMO + azar() * (ALFA_MAXIMO - ALFA_MINIMO);
  }
  return { posiciones, paleta, alfas };
}
