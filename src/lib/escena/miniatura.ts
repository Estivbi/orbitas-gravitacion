import { VALORES_POR_ESTADO, type Trayectoria } from '@/lib/fisica';

export interface TrazadoMiniatura {
  viewBox: string;
  trazos: [string, string, string];
}

type Punto = readonly [number, number];

/** Un punto se conserva solo si dista más de `radioMaximo / DIVISOR_DIEZMADO` del último conservado. */
const DIVISOR_DIEZMADO = 25;
/** Margen del viewBox, como fracción del lado mayor de la caja de los puntos. */
const MARGEN_RELATIVO = 0.08;

function nodo(t: Trayectoria, indice: number, cuerpo: number): Punto {
  const base = indice * VALORES_POR_ESTADO + 2 * cuerpo;
  return [t.estados[base]!, -t.estados[base + 1]!];
}

function diezmar(t: Trayectoria, cuerpo: number): Punto[] {
  const umbral = t.radioMaximo / DIVISOR_DIEZMADO;
  const ultimo = t.tiempos.length - 1;
  const conservados: Punto[] = [nodo(t, 0, cuerpo)];
  for (let i = 1; i <= ultimo; i++) {
    const punto = nodo(t, i, cuerpo);
    const [ax, ay] = conservados[conservados.length - 1]!;
    if (i === ultimo || Math.hypot(punto[0] - ax, punto[1] - ay) > umbral) {
      conservados.push(punto);
    }
  }
  return conservados;
}

/** Como mucho 3 decimales y sin ceros sobrantes; el −0 se escribe como 0. */
function numero(valor: number): string {
  return String(Number(valor.toFixed(3)));
}

function trazo(puntos: readonly Punto[]): string {
  return puntos.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${numero(x)} ${numero(y)}`).join(' ');
}

function cajaDe(puntos: readonly Punto[]): string {
  const xs = puntos.map(([x]) => x);
  const ys = puntos.map(([, y]) => y);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const margen = MARGEN_RELATIVO * Math.max(maxX - minX, maxY - minY);
  return [minX - margen, minY - margen, maxX - minX + 2 * margen, maxY - minY + 2 * margen]
    .map(numero)
    .join(' ');
}

/** Tres trazos SVG (uno por cuerpo) con la y invertida y un viewBox que los rodea con margen. */
export function trazarMiniatura(t: Trayectoria): TrazadoMiniatura {
  const [a, b, c] = [diezmar(t, 0), diezmar(t, 1), diezmar(t, 2)] as const;
  return { viewBox: cajaDe([...a, ...b, ...c]), trazos: [trazo(a), trazo(b), trazo(c)] };
}
