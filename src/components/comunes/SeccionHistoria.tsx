import { CLASES_ETIQUETA_SECCION } from './clases';

const ID_TITULO = 'titulo-historia';

const HITOS = [
  {
    cuando: '1609 – 1619',
    titulo: 'Kepler describe los planetas',
    texto:
      'Johannes Kepler descubre que los planetas giran alrededor del Sol en elipses. Sabe cómo se mueven, pero no por qué.',
  },
  {
    cuando: '1687',
    titulo: 'Newton lo explica con una sola ley',
    texto:
      'En sus Principia, Isaac Newton propone que dos cuerpos cualesquiera se atraen con una fuerza que crece con sus masas y disminuye con el cuadrado de la distancia. Según cuenta la anécdota, lo que hace caer una manzana es lo mismo que mantiene a la Luna en su órbita. Con dos cuerpos, la ley se resuelve del todo.',
  },
  {
    cuando: '1767 – 1772',
    titulo: 'Con tres cuerpos, todo se complica',
    texto:
      'Leonhard Euler y Joseph-Louis Lagrange encuentran los primeros casos especiales con solución exacta. Uno de ellos es el triángulo de Lagrange (1772), que verás en la galería.',
  },
  {
    cuando: 'Hacia 1890',
    titulo: 'Poincaré descubre el caos',
    texto:
      'Henri Poincaré demuestra que, en general, el movimiento de tres cuerpos no se puede predecir a largo plazo: una diferencia mínima al empezar se convierte en un recorrido muy distinto.',
  },
  {
    cuando: '1993 – 2000',
    titulo: 'La figura de ocho',
    texto:
      'Cris Moore la encuentra con un ordenador en 1993, y Alain Chenciner y Richard Montgomery demuestran en 2000 que existe: tres cuerpos iguales que se persiguen por la misma curva.',
  },
  {
    cuando: '2013',
    titulo: 'Nuevas familias de órbitas',
    texto:
      'Milovan Šuvakov y Veljko Dmitrašinović encuentran, también por ordenador, nuevas órbitas periódicas. Butterfly, Goggles, Moth y Yin-Yang son de esa familia.',
  },
] as const;

/** Contexto antes de la ley: qué es esta página, de dónde viene y qué se va a encontrar. */
export function SeccionHistoria() {
  return (
    <section id="historia" aria-labelledby={ID_TITULO} className="mx-auto max-w-pagina px-4 py-16">
      <div className="grid grid-cols-1 gap-10 columnas:grid-cols-[1fr_1.2fr] columnas:gap-16">
        <div className="flex flex-col items-start gap-4">
          <p className={CLASES_ETIQUETA_SECCION}>02 · Un poco de historia</p>
          <h2 id={ID_TITULO} className="text-titular-sm text-balance">
            Por qué se mueven así los astros
          </h2>
          <p className="text-silver-mist max-w-90">
            Esta página te enseña cómo funciona la gravedad según Newton y qué pasa cuando, en vez
            de dos cuerpos, hay tres. Primero, de dónde viene la idea; después, la ley para que la
            toques; luego seis órbitas reales y, al final, un tutor para comprobar lo que has
            aprendido.
          </p>
          <p className="text-ash-gray text-etiqueta font-light max-w-90">
            ¿Y Einstein? En 1915 la relatividad general afinó la gravedad para casos extremos, como
            los agujeros negros. Para planetas y para todo lo que verás aquí, la ley de Newton sigue
            siendo excelente.
          </p>
        </div>
        <ol className="flex flex-col gap-8">
          {HITOS.map((hito) => (
            <li key={hito.cuando} className="flex flex-col gap-1">
              <span className={CLASES_ETIQUETA_SECCION}>{hito.cuando}</span>
              <h3 className="text-titular-xs">{hito.titulo}</h3>
              <p className="text-silver-mist">{hito.texto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
