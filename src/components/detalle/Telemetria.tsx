'use client';

import { useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import type { Estado } from '@/lib/fisica/tipos';
import { formatearCifra } from '@/lib/galeria/formato';
import {
  formatearLectura,
  leerTelemetria,
  valorDeFase,
  type LecturaTelemetria,
} from '@/lib/galeria/telemetria';

export interface ApiTelemetria {
  /** Escribe la lectura en el DOM sin limitar el ritmo: de eso se ocupa quien llama. */
  escribir(u: number, estado: Readonly<Estado>): void;
}

interface PropsTelemetria {
  ref?: Ref<ApiTelemetria>;
  periodo: number;
  energiaInicial: number;
  /** Extremo del periodo, de la `Trayectoria`. */
  distanciaMinima: number;
  /** Extremo del periodo, de la `Trayectoria`. */
  velocidadMaxima: number;
  /** Pinta el HTML del servidor; el fallo de WebGL deja estos valores. */
  lecturaInicial: LecturaTelemetria;
}

type Cifra = 'tiempo' | 'energia' | 'momento' | 'distancia-minima' | 'velocidad-maxima';

// Por debajo de 900 px las etiquetas largas ocupan dos líneas: se alinean abajo para que las cifras queden a una altura.
const CLASES_ETIQUETA =
  'text-saffron-spark text-etiqueta font-semibold uppercase max-columnas:flex max-columnas:min-h-6 max-columnas:items-end';
const CLASES_CIFRA = 'text-titular-xs columnas:text-titular-sm tabular-nums';
const CLASES_RESUMEN = 'text-ash-gray text-etiqueta font-light';

interface PropsColumna {
  columna: Cifra;
  etiqueta: string;
  cifra: string;
  resumen: ReactNode;
  extra?: ReactNode;
}

function Columna({ columna, etiqueta, cifra, resumen, extra }: PropsColumna) {
  return (
    <div data-columna={columna} className="flex min-w-0 flex-col gap-1">
      <dt className={CLASES_ETIQUETA}>{etiqueta}</dt>
      <dd className="flex flex-col gap-1">
        <span data-cifra={columna} aria-hidden="true" className={CLASES_CIFRA}>
          {cifra}
        </span>
        {extra}
        <span className={CLASES_RESUMEN}>{resumen}</span>
      </dd>
    </div>
  );
}

/**
 * Cinco columnas de cifras. Las cifras en vivo llevan `aria-hidden` y se escriben de forma
 * imperativa (sin re-render); cada columna añade un texto estático legible para lectores de pantalla.
 */
export function Telemetria({
  ref,
  periodo,
  energiaInicial,
  distanciaMinima,
  velocidadMaxima,
  lecturaInicial,
}: PropsTelemetria) {
  const raiz = useRef<HTMLElement>(null);
  const elementos = useRef<Map<string, HTMLElement> | null>(null);
  const actualizaciones = useRef(0);

  useImperativeHandle(ref, () => ({
    escribir(u, estado) {
      const region = raiz.current;
      if (!region) return;
      if (!elementos.current) {
        elementos.current = new Map(
          Array.from(region.querySelectorAll<HTMLElement>('[data-cifra], [data-texto-fase]')).map(
            (el) => [el.dataset.cifra ?? 'texto-fase', el],
          ),
        );
      }
      const lectura = leerTelemetria(estado, u, periodo);
      const textos = formatearLectura(lectura);
      const escribir = (clave: string, texto: string) => {
        const elemento = elementos.current?.get(clave);
        if (elemento && elemento.textContent !== texto) elemento.textContent = texto;
      };
      escribir('tiempo', textos.tiempo);
      escribir('energia', textos.energia);
      escribir('momento', textos.momento);
      escribir('distancia-minima', textos.distanciaMinima);
      escribir('velocidad-maxima', textos.velocidadMaxima);
      escribir('texto-fase', textos.fase);
      const barra = elementos.current.get('fase');
      if (barra) {
        const valor = valorDeFase(lectura.fase);
        barra.dataset.valor = valor;
        barra.style.transform = `scaleX(${valor})`;
      }
      actualizaciones.current += 1;
      region.dataset.actualizaciones = String(actualizaciones.current);
    },
  }));

  const inicial = formatearLectura(lecturaInicial);
  const valorInicialDeFase = valorDeFase(lecturaInicial.fase);

  return (
    <section ref={raiz} data-region="telemetria" aria-label="Telemetría" data-actualizaciones="0">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-6 columnas:grid-cols-5">
        <Columna
          columna="tiempo"
          etiqueta="Tiempo"
          cifra={inicial.tiempo}
          extra={
            <>
              <span
                data-texto-fase
                aria-hidden="true"
                className="text-bone-white text-etiqueta font-normal tabular-nums"
              >
                {inicial.fase}
              </span>
              <span className="bg-ash-gray/30 block h-0.5 w-full" aria-hidden="true">
                <span
                  data-cifra="fase"
                  data-valor={valorInicialDeFase}
                  aria-hidden="true"
                  className="bg-electric-iris block h-full origin-left"
                  style={{ transform: `scaleX(${valorInicialDeFase})` }}
                />
              </span>
            </>
          }
          resumen={
            <>
              Periodo <span data-resumen="periodo">{formatearCifra(periodo, 2)}</span>
            </>
          }
        />
        <Columna
          columna="energia"
          etiqueta="Energía E"
          cifra={inicial.energia}
          resumen={
            <>
              Se conserva: <span data-resumen="energia">{formatearCifra(energiaInicial, 3)}</span>
            </>
          }
        />
        <Columna
          columna="momento"
          etiqueta="Momento lineal |P|"
          cifra={inicial.momento}
          resumen={
            <>
              Se conserva:{' '}
              <span data-resumen="momento">{formatearCifra(lecturaInicial.momentoLineal, 3)}</span>
            </>
          }
        />
        <Columna
          columna="distancia-minima"
          etiqueta="Distancia mínima"
          cifra={inicial.distanciaMinima}
          resumen={
            <>
              Mínima del periodo:{' '}
              <span data-resumen="distancia-minima">{formatearCifra(distanciaMinima, 3)}</span>
            </>
          }
        />
        <Columna
          columna="velocidad-maxima"
          etiqueta="Velocidad máxima"
          cifra={inicial.velocidadMaxima}
          resumen={
            <>
              Máxima del periodo:{' '}
              <span data-resumen="velocidad-maxima">{formatearCifra(velocidadMaxima, 3)}</span>
            </>
          }
        />
      </dl>
    </section>
  );
}
