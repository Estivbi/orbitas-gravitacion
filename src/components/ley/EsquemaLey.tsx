'use client';

import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { LIMITES, formatearNumero, radioAX, xARadio, type Geometria, type Ley } from '@/lib/ley/ley';

const ANCHO = 660;
const ALTO = 240;
const CENTRO_Y = 110;
/** x de la masa izquierda es x0 + 0: la distancia r se mide hasta la masa derecha. */
const GEOMETRIA: Geometria = { x0: 60, pxPorUnidad: 54 };
/** Radio mínimo del área sensible: a 375 px de ancho el dibujo se reduce a la mitad y sigue midiendo 44 px. */
const RADIO_SENSIBLE = 60;

const radioDeMasa = (masa: number): number => 8 + 5 * Math.sqrt(masa);

interface Props {
  ley: Ley;
  alCambiarDistancia: (r: number) => void;
}

/** Dos masas en SVG; la derecha se arrastra con el puntero o se mueve con las flechas. */
export function EsquemaLey({ ley, alCambiarDistancia }: Props) {
  const arrastrando = useRef(false);
  const xDerecha = radioAX(ley.r, GEOMETRIA);
  const textoR = `r = ${formatearNumero(ley.r, 1)}`;

  function alMover(evento: PointerEvent<SVGCircleElement>) {
    const svg = evento.currentTarget.ownerSVGElement;
    const matriz = svg?.getScreenCTM();
    if (!arrastrando.current || !svg || !matriz) return;
    const punto = new DOMPoint(evento.clientX, evento.clientY).matrixTransform(matriz.inverse());
    alCambiarDistancia(xARadio(punto.x, GEOMETRIA));
  }

  function alPulsarTecla(evento: KeyboardEvent<SVGCircleElement>) {
    const { min, max } = LIMITES.distancia;
    const destino: Record<string, number> = {
      ArrowRight: ley.r + LIMITES.paso,
      ArrowUp: ley.r + LIMITES.paso,
      ArrowLeft: ley.r - LIMITES.paso,
      ArrowDown: ley.r - LIMITES.paso,
      Home: min,
      End: max,
    };
    const nuevo = destino[evento.key];
    if (nuevo === undefined) return;
    evento.preventDefault();
    alCambiarDistancia(nuevo);
  }

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      role="img"
      aria-label={`Dos masas, m1 = ${formatearNumero(ley.m1, 1)} y m2 = ${formatearNumero(ley.m2, 1)}, separadas una distancia ${textoR}`}
      className="h-auto w-full"
    >
      <line
        x1={GEOMETRIA.x0}
        x2={xDerecha}
        y1={CENTRO_Y}
        y2={CENTRO_Y}
        className="stroke-ash-gray"
        strokeWidth={1}
      />
      <circle cx={GEOMETRIA.x0} cy={CENTRO_Y} r={radioDeMasa(ley.m1)} className="fill-bone-white" />
      <circle cx={xDerecha} cy={CENTRO_Y} r={radioDeMasa(ley.m2)} className="fill-saffron-spark" />
      <text x={GEOMETRIA.x0} y={CENTRO_Y + 56} textAnchor="middle" className="fill-ash-gray text-etiqueta">
        m₁
      </text>
      <text x={xDerecha} y={CENTRO_Y + 56} textAnchor="middle" className="fill-ash-gray text-etiqueta">
        m₂
      </text>
      <text
        x={(GEOMETRIA.x0 + xDerecha) / 2}
        y={CENTRO_Y - 20}
        textAnchor="middle"
        className="fill-silver-mist text-etiqueta"
      >
        {textoR}
      </text>
      <circle
        cx={xDerecha}
        cy={CENTRO_Y}
        r={Math.max(RADIO_SENSIBLE, radioDeMasa(ley.m2))}
        fill="transparent"
        role="slider"
        tabIndex={0}
        aria-label="Masa derecha: distancia"
        aria-orientation="horizontal"
        aria-valuemin={LIMITES.distancia.min}
        aria-valuemax={LIMITES.distancia.max}
        aria-valuenow={ley.r}
        aria-valuetext={textoR}
        className="cursor-grab touch-none"
        onPointerDown={(evento) => {
          arrastrando.current = true;
          evento.currentTarget.setPointerCapture(evento.pointerId);
        }}
        onPointerMove={alMover}
        onPointerUp={() => {
          arrastrando.current = false;
        }}
        onPointerCancel={() => {
          arrastrando.current = false;
        }}
        onKeyDown={alPulsarTecla}
      />
    </svg>
  );
}
