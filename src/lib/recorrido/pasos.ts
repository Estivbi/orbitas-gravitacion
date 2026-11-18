/** Pasos de la visita guiada por la portada. TypeScript puro, sin React. */

export interface PasoRecorrido {
  /** Coincide con el atributo `data-recorrido` del elemento que se resalta. */
  id: string;
  titulo: string;
  texto: string;
  hacer: string;
}

export const PASOS_RECORRIDO: readonly PasoRecorrido[] = [
  {
    id: 'bienvenida',
    titulo: 'Bienvenida',
    texto:
      'Esta web enseña cómo se atraen los cuerpos y reúne seis órbitas donde tres cuerpos se persiguen para siempre. La figura es una de ellas, en 3D.',
    hacer: 'Arrástrala para girarla y usa el botón para pausar o reanudar la animación.',
  },
  {
    id: 'historia',
    titulo: 'Un poco de historia',
    texto:
      'En 1687 Newton explicó con una sola ley por qué cae una manzana y por qué la Luna gira alrededor de la Tierra. La línea del tiempo cuenta cómo se llegó hasta aquí.',
    hacer: 'Abre cada hito: al abrir uno, se cierra el anterior.',
  },
  {
    id: 'ley',
    titulo: 'La ley en acción',
    texto: 'Cuanto más pesados son dos cuerpos, más se atraen; cuanto más lejos, menos.',
    hacer: 'Mueve los deslizadores o arrastra la masa de la derecha y mira cómo cambia la fuerza.',
  },
  {
    id: 'galeria',
    titulo: 'Seis órbitas',
    texto:
      'Son seis soluciones del problema de los tres cuerpos: tres cuerpos que se mueven para siempre atrayéndose entre sí.',
    hacer:
      'Ordénalas como quieras y entra en una para verla en 3D, girarla y cambiar la velocidad.',
  },
  {
    id: 'tutor',
    titulo: 'El tutor',
    texto:
      'Un tutor te propone preguntas sobre la ley y se adapta a tu nivel. Sin clave de IA usa preguntas de práctica.',
    hacer: 'Responde a una pregunta o escribe la tuya: el tutor puede mover los deslizadores.',
  },
  {
    id: 'cierre',
    titulo: 'Listo para explorar',
    texto:
      'Ya conoces lo esencial. Puedes repetir esta guía cuando quieras con el botón «Guía» de la cabecera.',
    hacer: 'Empieza moviendo la ley y después entra en una órbita.',
  },
];

export { TOTAL_PASOS, limitarPaso } from './limites';
