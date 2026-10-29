export type Limitador = (
  ip: string,
  ahora: number,
) => { permitido: boolean; reintentarEnS: number };

/** Ventana deslizante en memoria de la instancia: no se comparte entre instancias. */
export function crearLimitador(max: number, ventanaMs: number): Limitador {
  const marcas = new Map<string, number[]>();
  return (ip, ahora) => {
    const vigentes = (marcas.get(ip) ?? []).filter((t) => ahora - t < ventanaMs);
    if (vigentes.length >= max) {
      marcas.set(ip, vigentes);
      return {
        permitido: false,
        reintentarEnS: Math.ceil(((vigentes[0] ?? ahora) + ventanaMs - ahora) / 1000),
      };
    }
    marcas.set(ip, [...vigentes, ahora]);
    return { permitido: true, reintentarEnS: 0 };
  };
}
