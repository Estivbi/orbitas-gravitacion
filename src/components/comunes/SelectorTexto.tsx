'use client';

import { useId } from 'react';

interface PropsSelectorTexto<T extends string | number> {
  /** Texto visible (ámbar, en mayúsculas) que nombra el grupo. */
  etiqueta: string;
  /** Atributo `name` de los radios; único en la página. */
  nombre: string;
  opciones: readonly { valor: T; texto: string }[];
  valor: T;
  alCambiar: (valor: T) => void;
}

/**
 * Grupo de radios con aspecto de texto: la opción activa lleva subrayado ámbar y el foco se dibuja
 * sobre su etiqueta. El `input` está oculto de forma accesible (una sola parada de tabulación y
 * flechas nativas); el subrayado, el contorno y el área de 44 px viven en la etiqueta.
 */
export function SelectorTexto<T extends string | number>({
  etiqueta,
  nombre,
  opciones,
  valor,
  alCambiar,
}: PropsSelectorTexto<T>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <span
        id={`${id}-etiqueta`}
        className="text-saffron-spark text-etiqueta font-semibold uppercase"
      >
        {etiqueta}
      </span>
      <div role="radiogroup" aria-labelledby={`${id}-etiqueta`} className="flex flex-wrap">
        {opciones.map((opcion, indice) => {
          const idOpcion = `${id}-${indice}`;
          const activa = opcion.valor === valor;
          return (
            <span key={String(opcion.valor)} className="relative inline-flex">
              <input
                type="radio"
                id={idOpcion}
                name={nombre}
                value={String(opcion.valor)}
                checked={activa}
                onChange={() => alCambiar(opcion.valor)}
                className="peer sr-only"
              />
              <label
                htmlFor={idOpcion}
                className={`text-cuerpo inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center px-2 font-normal underline-offset-8 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-bone-white ${
                  activa
                    ? 'text-bone-white decoration-saffron-spark underline decoration-2'
                    : 'text-ash-gray hover:text-bone-white'
                }`}
              >
                {opcion.texto}
              </label>
            </span>
          );
        })}
      </div>
    </div>
  );
}
