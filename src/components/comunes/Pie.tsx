import Link from 'next/link';
import { ENLACES_SECCIONES } from './enlaces';
import { Logotipo } from './Logotipo';

const CLASES_ENLACE =
  'text-ash-gray hover:text-bone-white text-etiqueta flex min-h-8 min-w-8 items-center font-semibold uppercase';

/** Pie: logotipo, enlaces a las secciones y una línea que resume el proyecto. */
export function Pie() {
  return (
    <footer className="mx-auto flex max-w-pagina flex-col gap-4 px-4 py-10 columnas:flex-row columnas:items-center columnas:justify-between">
      <div className="flex flex-col gap-2">
        <Logotipo />
        <p className="text-ash-gray text-etiqueta font-light">
          Órbitas · La ley de Newton y el problema de los tres cuerpos, para ver y tocar.
        </p>
      </div>
      <ul className="flex gap-6">
        {ENLACES_SECCIONES.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className={CLASES_ENLACE}>
              {e.texto}
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
