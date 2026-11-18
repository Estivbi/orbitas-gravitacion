'use client';

import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import {
  LIMITES,
  formatearNumero,
  fuerza,
  longitudFlecha,
  radioAX,
  xARadio,
  type Geometria,
  type Ley,
} from '@/lib/ley/ley';

const ANCHO = 560;
const ALTO = 270;
const CENTRO_Y = 120;
const EJE_Y = 214;
const FLECHA_Y = 40;
/** x de la masa izquierda es x0 + 0: la distancia r se mide hasta la masa derecha. */
const GEOMETRIA: Geometria = { x0: 50, pxPorUnidad: 44 };
/** Radio mínimo del área sensible: a 375 px de ancho el dibujo se reduce a la mitad y sigue midiendo 44 px. */
const RADIO_SENSIBLE = 60;

const radioDeMasa = (masa: number): number => 6 + 4 * Math.sqrt(masa);

interface Props {
  ley: Ley;
  alCambiarDistancia: (r: number) => void;
}

/** Dos masas en SVG; la derecha se arrastra con el puntero o se mueve con las flechas. */
export function EsquemaLey({ ley, alCambiarDistancia }: Props) {
  const arrastrando = useRef(false);
  const xDerecha = radioAX(ley.r, GEOMETRIA);
  const textoR = `r = ${formatearNumero(ley.r, 1)}`;
  const marcador = `punta-${useId().replace(/:/g, '')}`;
  const f = fuerza(ley.m1, ley.m2, ley.r);
  // Cada flecha cabe en su mitad del hueco entre las masas: así nunca se cruzan.
  const flecha = longitudFlecha(f, Math.max(0, (xDerecha - GEOMETRIA.x0) / 2 - 8));
  const centroR = (GEOMETRIA.x0 + xDerecha) / 2;

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
      role="group"
      aria-label={`Dos masas, m1 = ${formatearNumero(ley.m1, 1)} y m2 = ${formatearNumero(ley.m2, 1)}, separadas una distancia ${textoR}`}
      className="mx-auto h-auto w-full max-w-3xl"
    >
      <defs>
        <marker
          id={marcador}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M0 0 L10 5 L0 10 z" className="fill-electric-iris" />
        </marker>
      </defs>
      <line
        x1={GEOMETRIA.x0}
        x2={xDerecha}
        y1={CENTRO_Y}
        y2={CENTRO_Y}
        className="stroke-ash-gray"
        strokeDasharray="4 6"
        strokeWidth={1}
      />
      <circle cx={GEOMETRIA.x0} cy={CENTRO_Y} r={radioDeMasa(ley.m1)} className="fill-bone-white" />
      <circle cx={xDerecha} cy={CENTRO_Y} r={radioDeMasa(ley.m2)} className="fill-saffron-spark" />
      <g className="stroke-electric-iris" strokeWidth={4} strokeLinecap="round" fill="none">
        <line
          x1={GEOMETRIA.x0}
          x2={GEOMETRIA.x0 + flecha}
          y1={FLECHA_Y}
          y2={FLECHA_Y}
          markerEnd={`url(#${marcador})`}
        />
        <line
          x1={xDerecha}
          x2={xDerecha - flecha}
          y1={FLECHA_Y}
          y2={FLECHA_Y}
          markerEnd={`url(#${marcador})`}
        />
      </g>
      <text
        x={ANCHO / 2}
        y={FLECHA_Y - 14}
        textAnchor="middle"
        className="fill-silver-mist text-cuerpo"
      >
        La fuerza atrae cada masa hacia la otra
      </text>
      <text
        x={GEOMETRIA.x0}
        y={CENTRO_Y - 32}
        textAnchor="middle"
        className="fill-bone-white text-cuerpo"
      >
        {`m₁ = ${formatearNumero(ley.m1, 1)}`}
      </text>
      <text
        x={xDerecha}
        y={CENTRO_Y + 56}
        textAnchor="middle"
        className="fill-saffron-spark text-cuerpo"
      >
        {`m₂ = ${formatearNumero(ley.m2, 1)}`}
      </text>
      <line
        x1={GEOMETRIA.x0}
        x2={GEOMETRIA.x0 + LIMITES.distancia.max * GEOMETRIA.pxPorUnidad}
        y1={EJE_Y}
        y2={EJE_Y}
        className="stroke-ash-gray"
        strokeWidth={1}
      />
      {Array.from({ length: LIMITES.distancia.max + 1 }, (_, k) => (
        <g key={k}>
          <line
            x1={GEOMETRIA.x0 + k * GEOMETRIA.pxPorUnidad}
            x2={GEOMETRIA.x0 + k * GEOMETRIA.pxPorUnidad}
            y1={EJE_Y - 5}
            y2={EJE_Y + 5}
            className="stroke-ash-gray"
            strokeWidth={1}
          />
          {k % 2 === 0 && (
            <text
              x={GEOMETRIA.x0 + k * GEOMETRIA.pxPorUnidad}
              y={EJE_Y + 24}
              textAnchor="middle"
              className="fill-ash-gray text-cuerpo"
            >
              {k}
            </text>
          )}
        </g>
      ))}
      <line
        x1={GEOMETRIA.x0}
        x2={xDerecha}
        y1={EJE_Y}
        y2={EJE_Y}
        className="stroke-saffron-spark"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <text
        x={centroR}
        y={EJE_Y - 12}
        textAnchor="middle"
        className="fill-bone-white text-cuerpo font-semibold"
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
