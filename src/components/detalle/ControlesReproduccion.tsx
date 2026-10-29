'use client';

import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type ChangeEvent,
  type Ref,
} from 'react';
import {
  LONGITUD_ESTELA,
  POSICION,
  VELOCIDADES,
  posicionDeDeslizador,
  valorDeDeslizador,
  type Velocidad,
} from '@/lib/galeria/controles';
import { textoEstela, textoPosicion, textoVelocidad } from '@/lib/galeria/formato';
import { CLASES_PANEL } from '../comunes/clases';
import { BotonAnimacion } from '../comunes/BotonAnimacion';
import { SelectorTexto } from '../comunes/SelectorTexto';
import type { EstadoEscena } from '../escena/VisorOrbita';

export interface ApiControles {
  /** Refleja la posición de la escena: texto visible siempre; `value` y `aria-valuetext` salvo con el foco puesto y en marcha. */
  mostrarPosicion(u: number): void;
}

interface PropsControlesReproduccion {
  ref?: Ref<ApiControles>;
  /** Valor y `aria-valuetext` con los que nace el deslizador de posición. */
  posicionInicial: number;
  periodo: number;
  reproduciendo: boolean;
  /** Estado de la escena: los controles no se ven ni se enfocan hasta `lista`. */
  estadoEscena: EstadoEscena;
  alAlternar(): void;
  alPausar(): void;
  velocidad: Velocidad;
  alCambiarVelocidad(velocidad: Velocidad): void;
  longitudEstela: number;
  alCambiarLongitudEstela(longitud: number): void;
  alFijarPosicion(u: number): void;
  alRestablecerVista(): void;
}

const OPCIONES_VELOCIDAD = VELOCIDADES.map((valor) => ({ valor, texto: textoVelocidad(valor) }));

const CLASES_ETIQUETA = 'text-saffron-spark text-etiqueta font-semibold uppercase';
const CLASES_VALOR = 'text-bone-white text-etiqueta font-light tabular-nums';
const CLASES_DESLIZADOR = 'accent-electric-iris min-h-8 w-full cursor-pointer';

function clasesDeRegion(estado: EstadoEscena): string {
  const base = `${CLASES_PANEL} flex flex-wrap items-end gap-x-6 gap-y-4 p-4 columnas:p-6`;
  if (estado === 'sin-webgl' || estado === 'error') return `${base} hidden`;
  return estado === 'lista' ? base : `${base} invisible`;
}

/**
 * Reproducir/Pausar, velocidad, posición, estela y restablecer vista. El deslizador de posición no
 * lo controla React: su `value` y su `aria-valuetext` solo se escriben de forma imperativa.
 */
export function ControlesReproduccion({
  ref,
  posicionInicial,
  periodo,
  reproduciendo,
  estadoEscena,
  alAlternar,
  alPausar,
  velocidad,
  alCambiarVelocidad,
  longitudEstela,
  alCambiarLongitudEstela,
  alFijarPosicion,
  alRestablecerVista,
}: PropsControlesReproduccion) {
  const idPosicion = useId();
  const idEstela = useId();
  const deslizador = useRef<HTMLInputElement>(null);
  const valorVisible = useRef<HTMLSpanElement>(null);
  const reproduciendoActual = useRef(reproduciendo);
  useEffect(() => {
    reproduciendoActual.current = reproduciendo;
  });

  // El deslizador nace con estos valores y React no vuelve a tocarlos (las props no cambian).
  const [inicial] = useState(() => ({
    valor: valorDeDeslizador(posicionInicial),
    texto: textoPosicion(posicionInicial, periodo),
  }));

  useImperativeHandle(ref, () => ({
    mostrarPosicion(u: number) {
      const texto = textoPosicion(u, periodo);
      if (valorVisible.current) valorVisible.current.textContent = texto;
      const elemento = deslizador.current;
      if (!elemento) return;
      const enfocadoYEnMarcha = document.activeElement === elemento && reproduciendoActual.current;
      if (enfocadoYEnMarcha) return;
      const valor = String(valorDeDeslizador(u));
      if (elemento.value !== valor) elemento.value = valor;
      if (elemento.getAttribute('aria-valuetext') !== texto) {
        elemento.setAttribute('aria-valuetext', texto);
      }
    },
  }));

  function alMoverPosicion(evento: ChangeEvent<HTMLInputElement>) {
    const u = posicionDeDeslizador(Number(evento.currentTarget.value));
    const texto = textoPosicion(u, periodo);
    if (valorVisible.current) valorVisible.current.textContent = texto;
    evento.currentTarget.setAttribute('aria-valuetext', texto);
    alPausar();
    alFijarPosicion(u);
  }

  return (
    <div
      data-region="controles"
      role="group"
      aria-label="Controles de reproducción"
      inert={estadoEscena !== 'lista'}
      className={clasesDeRegion(estadoEscena)}
    >
      <BotonAnimacion reproduciendo={reproduciendo} alAlternar={alAlternar} />
      <SelectorTexto
        etiqueta="Velocidad de reproducción"
        nombre="velocidad"
        opciones={OPCIONES_VELOCIDAD}
        valor={velocidad}
        alCambiar={alCambiarVelocidad}
      />
      <div className="flex min-w-0 basis-48 grow flex-col">
        <div className="flex flex-col">
          <label htmlFor={idPosicion} className={CLASES_ETIQUETA}>
            Posición en el periodo
          </label>
          <span ref={valorVisible} aria-hidden="true" className={CLASES_VALOR}>
            {inicial.texto}
          </span>
        </div>
        <input
          ref={deslizador}
          id={idPosicion}
          type="range"
          min={POSICION.minima}
          max={POSICION.maxima}
          step={POSICION.paso}
          defaultValue={inicial.valor}
          aria-valuetext={inicial.texto}
          onChange={alMoverPosicion}
          className={CLASES_DESLIZADOR}
        />
      </div>
      <div className="flex min-w-0 basis-48 grow flex-col">
        <div className="flex flex-col">
          <label htmlFor={idEstela} className={CLASES_ETIQUETA}>
            Longitud de la estela
          </label>
          <span aria-hidden="true" className={CLASES_VALOR}>
            {textoEstela(longitudEstela)}
          </span>
        </div>
        <input
          id={idEstela}
          type="range"
          min={LONGITUD_ESTELA.minima}
          max={LONGITUD_ESTELA.maxima}
          step={LONGITUD_ESTELA.paso}
          value={longitudEstela}
          aria-valuetext={textoEstela(longitudEstela)}
          onChange={(evento) => alCambiarLongitudEstela(Number(evento.currentTarget.value))}
          className={CLASES_DESLIZADOR}
        />
      </div>
      <button
        type="button"
        onClick={alRestablecerVista}
        className="text-ash-gray hover:text-bone-white focus-visible:text-bone-white text-etiqueta min-h-8 min-w-8 cursor-pointer px-2 font-semibold uppercase"
      >
        Restablecer vista
      </button>
    </div>
  );
}
