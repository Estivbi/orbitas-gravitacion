'use client';

import Link from 'next/link';
import { useRef, useState, type KeyboardEvent } from 'react';

const ID_MENU = 'menu-principal';
const CLASES_ENLACE =
  'text-ash-gray hover:text-bone-white text-etiqueta flex min-h-8 min-w-8 items-center px-2 font-semibold uppercase';

const ENLACES = [
  { href: '/#ley', texto: 'La ley' },
  { href: '/#galeria', texto: 'Galería' },
];

/** Cabecera con logotipo y navegación principal; en móvil la lista se despliega con «Menú». */
export function Cabecera() {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  function alTeclear(evento: KeyboardEvent) {
    if (evento.key !== 'Escape' || !abierto) return;
    setAbierto(false);
    boton.current?.focus();
  }

  return (
    <header
      onKeyDown={alTeclear}
      className="mx-auto flex min-h-14 max-w-pagina flex-wrap items-center justify-between px-4"
    >
      <Link href="/" aria-label="Órbitas, inicio" className="flex min-h-8 items-center gap-2">
        <svg width="20" height="19" viewBox="0 0 20 19" aria-hidden="true" focusable="false">
          <polygon points="10,1 19,18 1,18" className="fill-electric-iris" />
        </svg>
        <span className="text-etiqueta font-semibold uppercase">Órbitas</span>
      </Link>
      <nav aria-label="Principal" className="max-sm:contents">
        <button
          ref={boton}
          type="button"
          aria-expanded={abierto}
          aria-controls={ID_MENU}
          onClick={() => setAbierto(!abierto)}
          className={`${CLASES_ENLACE} cursor-pointer sm:hidden`}
        >
          Menú
        </button>
        <ul
          id={ID_MENU}
          className={`${abierto ? 'flex' : 'max-sm:hidden'} flex-col max-sm:order-last max-sm:w-full sm:flex sm:flex-row sm:gap-2`}
        >
          {ENLACES.map((e) => (
            <li key={e.href}>
              <Link href={e.href} onClick={() => setAbierto(false)} className={CLASES_ENLACE}>
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
