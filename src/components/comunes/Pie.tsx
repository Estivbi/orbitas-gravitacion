import Link from 'next/link';

const CLASES_ENLACE =
  'text-ash-gray hover:text-bone-white text-etiqueta flex min-h-8 min-w-8 items-center font-semibold uppercase';

/** Pie genérico: nombre y frase, enlaces a las secciones y créditos técnicos. */
export function Pie() {
  return (
    <footer className="text-ash-gray text-etiqueta mx-auto flex max-w-pagina flex-col gap-4 px-4 py-10 font-light">
      <p>
        <span className="text-bone-white font-semibold uppercase">Órbitas</span> · La ley de Newton
        y el problema de los tres cuerpos, para ver y tocar.
      </p>
      <ul className="flex gap-4">
        <li>
          <Link href="/#ley" className={CLASES_ENLACE}>
            La ley
          </Link>
        </li>
        <li>
          <Link href="/#galeria" className={CLASES_ENLACE}>
            Galería
          </Link>
        </li>
      </ul>
      <p>Hecho con Next.js, three.js y el Vercel AI SDK</p>
    </footer>
  );
}
