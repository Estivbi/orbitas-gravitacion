import { siguienteNivel, type EstadoNivel } from './nivel';
import type { AjusteLey, Concepto, Nivel } from './tipos';

export interface OpcionFija {
  texto: string;
  correccion: string;
  acierto: boolean;
}

export interface PreguntaFija {
  id: string;
  nivel: Nivel;
  concepto: Concepto;
  pregunta: string;
  ley?: AjusteLey;
  opciones: OpcionFija[];
}

const ok = (texto: string, correccion: string): OpcionFija => ({
  texto,
  correccion,
  acierto: true,
});
const mal = (texto: string, correccion: string): OpcionFija => ({
  texto,
  correccion,
  acierto: false,
});

export const PREGUNTAS_FIJAS: readonly PreguntaFija[] = [
  {
    id: 'n1-distancia',
    nivel: 1,
    concepto: 'distancia',
    pregunta: 'Si separas las dos masas al doble de distancia, ¿qué pasa con la fuerza?',
    ley: { m1: 4, m2: 2, r: 4 },
    opciones: [
      mal(
        'Se hace la mitad',
        'No. La distancia se eleva al cuadrado: el doble de distancia da la cuarta parte.',
      ),
      ok('Se hace la cuarta parte', 'Correcto. A doble distancia, la fuerza es la cuarta parte.'),
      mal('Se duplica', 'No. Al alejarse, la atracción se debilita.'),
    ],
  },
  {
    id: 'n1-masa',
    nivel: 1,
    concepto: 'masa',
    pregunta: 'Si duplicas una de las masas, ¿qué pasa con la fuerza?',
    ley: { m1: 4, m2: 2, r: 4 },
    opciones: [
      ok('Se duplica', 'Correcto. La fuerza es proporcional a cada masa.'),
      mal('Se queda igual', 'No. La masa cuenta: más masa, más fuerza.'),
      mal('Se hace la mitad', 'No. Más masa atrae más, no menos.'),
    ],
  },
  {
    id: 'n2-mutua',
    nivel: 2,
    concepto: 'atraccion-mutua',
    pregunta: '¿Atrae la Tierra a la Luna con más fuerza que la Luna a la Tierra?',
    opciones: [
      mal(
        'Sí, la Tierra atrae más',
        'No. Las dos fuerzas son iguales; lo que cambia es cuánto se mueve cada una.',
      ),
      ok('No, son iguales', 'Correcto. La atracción es mutua y de la misma intensidad.'),
      mal('No, la Luna atrae más', 'No. Son iguales y de sentido contrario.'),
    ],
  },
  {
    id: 'n2-triple',
    nivel: 2,
    concepto: 'inverso-cuadrado',
    pregunta: 'A triple distancia, ¿cómo cambia la fuerza?',
    ley: { m1: 4, m2: 2, r: 2 },
    opciones: [
      mal('Se hace la tercera parte', 'No. Se divide entre 3 al cuadrado, es decir, entre 9.'),
      ok('Se hace la novena parte', 'Correcto. 3 al cuadrado es 9.'),
      mal('Se multiplica por nueve', 'No. Al alejarse, la fuerza baja.'),
    ],
  },
  {
    id: 'n3-escala',
    nivel: 3,
    concepto: 'inverso-cuadrado',
    pregunta: 'Duplicas las dos masas y también la distancia. ¿Qué pasa con la fuerza?',
    ley: { m1: 2, m2: 2, r: 2 },
    opciones: [
      mal('Se duplica', 'No. Las masas la multiplican por 4 y la distancia la divide entre 4.'),
      ok('Queda igual', 'Correcto. Se multiplica por 4 y se divide entre 4.'),
      mal('Se hace la cuarta parte', 'No. La subida de las masas compensa la distancia.'),
    ],
  },
  {
    id: 'n3-tres-cuerpos',
    nivel: 3,
    concepto: 'tres-cuerpos',
    pregunta: '¿Por qué el problema de los tres cuerpos no tiene una fórmula general sencilla?',
    opciones: [
      mal(
        'Porque con tres cuerpos no hay gravedad',
        'No. La gravedad actúa igual; el problema es el movimiento conjunto.',
      ),
      mal('Porque los tres pesan siempre lo mismo', 'No. Las masas pueden ser distintas.'),
      ok(
        'Porque cada cuerpo tira de los otros dos a la vez',
        'Correcto. Las atracciones se enredan y solo hay soluciones periódicas especiales.',
      ),
    ],
  },
];

/** Una pregunta del nivel que no esté en `vistas`; si se agotan, vuelve a empezar. */
export function siguientePregunta(nivel: Nivel, vistas: readonly string[]): PreguntaFija {
  const delNivel = PREGUNTAS_FIJAS.filter((p) => p.nivel === nivel);
  return delNivel.find((p) => !vistas.includes(p.id)) ?? delNivel[0]!;
}

export interface TurnoReducido {
  acierto: boolean;
  correccion: string;
  estado: EstadoNivel;
  vistas: string[];
  siguiente: PreguntaFija;
}

/** Función pura del modo reducido: corrige la respuesta, actualiza el nivel y elige la siguiente pregunta. */
export function responderReducido(
  estado: EstadoNivel,
  vistas: readonly string[],
  pregunta: PreguntaFija,
  indiceOpcion: number,
): TurnoReducido {
  const opcion = pregunta.opciones[indiceOpcion];
  if (!opcion) throw new RangeError('Opción inexistente');
  const nuevoEstado = siguienteNivel(estado, opcion.acierto);
  const nuevasVistas = [...vistas.filter((id) => id !== pregunta.id), pregunta.id];
  return {
    acierto: opcion.acierto,
    correccion: opcion.correccion,
    estado: nuevoEstado,
    vistas: nuevasVistas,
    siguiente: siguientePregunta(nuevoEstado.nivel, nuevasVistas),
  };
}
