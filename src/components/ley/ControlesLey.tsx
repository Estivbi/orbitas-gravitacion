'use client';

import { useId } from 'react';
import { LIMITES, formatearNumero, fraseDuplicar, fuerza, type Ley } from '@/lib/ley/ley';

const CLASES_ETIQUETA = 'text-saffron-spark text-etiqueta font-semibold uppercase';
const CLASES_VALOR = 'text-bone-white text-etiqueta font-light tabular-nums';
const CLASES_DESLIZADOR = 'accent-electric-iris min-h-8 w-full cursor-pointer';

interface PropsDeslizador {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  alCambiar: (valor: number) => void;
}

function Deslizador({ etiqueta, valor, min, max, alCambiar }: PropsDeslizador) {
  const id = useId();
  const texto = formatearNumero(valor, 1);
  return (
    <div className="col-span-3 grid min-w-0 grid-cols-subgrid items-center">
      <label htmlFor={id} className={CLASES_ETIQUETA}>
        {etiqueta}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={LIMITES.paso}
        value={valor}
        aria-valuetext={texto}
        onChange={(evento) => alCambiar(Number(evento.currentTarget.value))}
        className={CLASES_DESLIZADOR}
      />
      <span aria-hidden="true" className={`${CLASES_VALOR} text-right`}>
        {texto}
      </span>
    </div>
  );
}

interface Props {
  ley: Ley;
  alCambiar: (parcial: Partial<Ley>) => void;
}

/** Deslizadores de m₁, m₂ y r, y la fuerza con su frase, siempre calculadas con la fórmula. */
export function ControlesLey({ ley, alCambiar }: Props) {
  const { masa, distancia } = LIMITES;
  const f = fuerza(ley.m1, ley.m2, ley.r);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-[auto_1fr_auto] gap-x-4 gap-y-1">
        <Deslizador
          etiqueta="Masa 1"
          valor={ley.m1}
          min={masa.min}
          max={masa.max}
          alCambiar={(m1) => alCambiar({ m1 })}
        />
        <Deslizador
          etiqueta="Masa 2"
          valor={ley.m2}
          min={masa.min}
          max={masa.max}
          alCambiar={(m2) => alCambiar({ m2 })}
        />
        <Deslizador
          etiqueta="Distancia"
          valor={ley.r}
          min={distancia.min}
          max={distancia.max}
          alCambiar={(r) => alCambiar({ r })}
        />
      </div>
      <div
        className="flex flex-col border-t border-ash-gray/30 pt-4"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className={CLASES_ETIQUETA}>Fuerza entre las dos masas</span>
        <div className="flex items-baseline gap-3">
          <p className="text-subtitulo font-light tabular-nums" data-testid="fuerza">
            {formatearNumero(f, 2)}
          </p>
          <span className="text-ash-gray text-etiqueta font-light">unidades arbitrarias</span>
        </div>
        <p className="text-silver-mist" data-testid="frase">
          {fraseDuplicar(ley)}
        </p>
      </div>
    </div>
  );
}
