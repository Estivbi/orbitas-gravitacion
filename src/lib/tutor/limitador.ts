export type Limitador = (
  ip: string,
  ahora: number,
) => { permitido: boolean; reintentarEnS: number };

const ENTRADAS_PARA_BARRER = 1000;

/**
 * Ventana deslizante en memoria de la instancia: no se comparte entre instancias.
 * Además del tope por IP aplica un tope global (`maxGlobal`) que no depende de ninguna cabecera.
 */
export function crearLimitador(
  max: number,
  ventanaMs: number,
  maxGlobal = Number.POSITIVE_INFINITY,
): Limitador {
  const marcas = new Map<string, number[]>();
  let globales: number[] = [];

  const vigentesDe = (lista: number[], ahora: number) => lista.filter((t) => ahora - t < ventanaMs);
  const espera = (lista: number[], ahora: number) =>
    Math.ceil(((lista[0] ?? ahora) + ventanaMs - ahora) / 1000);

  function barrer(ahora: number) {
    for (const [ip, lista] of marcas) {
      if (vigentesDe(lista, ahora).length === 0) marcas.delete(ip);
    }
  }

  return (ip, ahora) => {
    globales = vigentesDe(globales, ahora);
    if (globales.length >= maxGlobal) {
      return { permitido: false, reintentarEnS: espera(globales, ahora) };
    }
    const vigentes = vigentesDe(marcas.get(ip) ?? [], ahora);
    if (vigentes.length >= max) {
      marcas.set(ip, vigentes);
      return { permitido: false, reintentarEnS: espera(vigentes, ahora) };
    }
    if (marcas.size > ENTRADAS_PARA_BARRER) barrer(ahora);
    marcas.set(ip, [...vigentes, ahora]);
    globales.push(ahora);
    return { permitido: true, reintentarEnS: 0 };
  };
}
