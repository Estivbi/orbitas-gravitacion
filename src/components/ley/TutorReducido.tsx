'use client';

import { useEffect, useState } from 'react';
import { PREGUNTAS_FIJAS, siguientePregunta, type PreguntaFija } from '@/lib/tutor/reducido';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { selectores } from '@/store/almacenInterfaz';

export const CLASES_FANTASMA =
  'text-ash-gray hover:text-bone-white text-etiqueta min-h-8 cursor-pointer text-left font-semibold uppercase';

const DIFICULTADES = { 1: 'básica', 2: 'media', 3: 'alta' } as const;

/** «Pregunta 2 de 2 · Dificultad: media»; sin numeración si el nivel solo tiene una pregunta. */
function etiquetaDe(pregunta: PreguntaFija): string {
  const delNivel = PREGUNTAS_FIJAS.filter((p) => p.nivel === pregunta.nivel);
  const dificultad = DIFICULTADES[pregunta.nivel];
  if (delNivel.length < 2) return `Pregunta · Dificultad ${dificultad}`;
  const posicion = delNivel.findIndex((p) => p.id === pregunta.id) + 1;
  return `Pregunta ${posicion} de ${delNivel.length} · Dificultad: ${dificultad}`;
}

/** Preguntas y correcciones fijas, sin modelo: mismo almacén (ley y nivel) que el chat. */
export function TutorReducido() {
  const { fijarLey, registrarResultado } = useAlmacenApi().getState();
  const { nivel } = useAlmacen(selectores.tutor);
  const [vistas, setVistas] = useState<string[]>([]);
  const [pregunta, setPregunta] = useState<PreguntaFija>(() => siguientePregunta(nivel, []));
  const [elegida, setElegida] = useState<number | null>(null);

  // La pregunta propone una ley de partida: los deslizadores y el dibujo se ponen en ella.
  useEffect(() => {
    if (pregunta.ley) fijarLey(pregunta.ley);
  }, [pregunta, fijarLey]);

  function elegir(indice: number) {
    if (elegida !== null) return;
    setElegida(indice);
    registrarResultado(pregunta.opciones[indice]!.acierto);
  }

  function otra() {
    const nuevasVistas = [...vistas, pregunta.id];
    setVistas(nuevasVistas);
    setPregunta(siguientePregunta(nivel, nuevasVistas));
    setElegida(null);
  }

  const opcion = elegida === null ? null : pregunta.opciones[elegida]!;
  return (
    <div className="flex max-w-90 flex-col gap-3">
      <p className="text-saffron-spark text-etiqueta font-semibold uppercase">
        <span data-testid="etiqueta-pregunta">{etiquetaDe(pregunta)}</span>
      </p>
      <p data-testid="pregunta">{pregunta.pregunta}</p>
      <ul className="flex flex-col">
        {pregunta.opciones.map((o, i) => (
          <li key={o.texto}>
            <button
              type="button"
              disabled={elegida !== null}
              aria-pressed={elegida === i}
              onClick={() => elegir(i)}
              className={`${CLASES_FANTASMA} disabled:cursor-default ${elegida === i ? 'text-bone-white' : ''}`}
            >
              {o.texto}
            </button>
          </li>
        ))}
      </ul>
      <div aria-live="polite">{opcion && <p data-testid="correccion">{opcion.correccion}</p>}</div>
      {opcion && (
        <button type="button" onClick={otra} className={CLASES_FANTASMA}>
          Otra pregunta
        </button>
      )}
    </div>
  );
}
