import {
  ordenDeArrastre,
  ordenDePellizco,
  ordenDeRueda,
  ordenDeTecla,
  type OrdenCamara,
} from '@/lib/escena/camara';

export interface Manejadores {
  alOrden(orden: OrdenCamara): void;
  alAlternar(): void;
  ruedaActiva: boolean;
}

interface Puntero {
  x: number;
  y: number;
}

function separacionEntre(punteros: Map<number, Puntero>): number {
  const [a, b] = [...punteros.values()];
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
}

/** Ratón, tacto (un dedo gira el acimut; dos dedos acercan), rueda opcional y teclado. */
function conectarPunteros(lienzo: HTMLCanvasElement, { alOrden }: Manejadores): () => void {
  const punteros = new Map<number, Puntero>();
  let separacion = 0;

  function alBajar(evento: PointerEvent): void {
    if (evento.pointerType === 'mouse' && evento.button !== 0) return;
    lienzo.setPointerCapture(evento.pointerId);
    punteros.set(evento.pointerId, { x: evento.clientX, y: evento.clientY });
    separacion = punteros.size === 2 ? separacionEntre(punteros) : 0;
  }

  function alMover(evento: PointerEvent): void {
    const puntero = punteros.get(evento.pointerId);
    if (!puntero) return;
    const dx = evento.clientX - puntero.x;
    const dy = evento.clientY - puntero.y;
    puntero.x = evento.clientX;
    puntero.y = evento.clientY;
    if (punteros.size === 1) {
      // Con un dedo el desplazamiento vertical es de la página (touch-action: pan-y).
      alOrden(ordenDeArrastre(dx, evento.pointerType === 'mouse' ? dy : 0));
    } else if (punteros.size === 2) {
      const actual = separacionEntre(punteros);
      const orden = ordenDePellizco(separacion, actual);
      separacion = actual;
      if (orden) alOrden(orden);
    }
  }

  function alSoltar(evento: PointerEvent): void {
    punteros.delete(evento.pointerId);
    separacion = 0;
  }

  lienzo.addEventListener('pointerdown', alBajar);
  lienzo.addEventListener('pointermove', alMover);
  lienzo.addEventListener('pointerup', alSoltar);
  lienzo.addEventListener('pointercancel', alSoltar);
  return () => {
    lienzo.removeEventListener('pointerdown', alBajar);
    lienzo.removeEventListener('pointermove', alMover);
    lienzo.removeEventListener('pointerup', alSoltar);
    lienzo.removeEventListener('pointercancel', alSoltar);
  };
}

function conectarRueda(lienzo: HTMLCanvasElement, { alOrden, ruedaActiva }: Manejadores) {
  if (!ruedaActiva) return () => {};
  function alRodar(evento: WheelEvent): void {
    evento.preventDefault();
    alOrden(ordenDeRueda(evento.deltaY));
  }
  lienzo.addEventListener('wheel', alRodar, { passive: false });
  return () => lienzo.removeEventListener('wheel', alRodar);
}

function conectarTeclado(lienzo: HTMLCanvasElement, { alOrden, alAlternar }: Manejadores) {
  function alPulsar(evento: KeyboardEvent): void {
    const orden = ordenDeTecla(evento.key, {
      ctrl: evento.ctrlKey,
      meta: evento.metaKey,
      alt: evento.altKey,
    });
    if (orden === null) return;
    evento.preventDefault();
    if (orden === 'alternar') alAlternar();
    else alOrden(orden);
  }
  lienzo.addEventListener('keydown', alPulsar);
  return () => lienzo.removeEventListener('keydown', alPulsar);
}

/** Devuelve la función que desconecta todos los manejadores. */
export function conectarInteraccion(lienzo: HTMLCanvasElement, manejadores: Manejadores) {
  const desconectores = [
    conectarPunteros(lienzo, manejadores),
    conectarRueda(lienzo, manejadores),
    conectarTeclado(lienzo, manejadores),
  ];
  return () => desconectores.forEach((desconectar) => desconectar());
}
