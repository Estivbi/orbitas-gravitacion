'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CLASES_BOTON_CONTORNO, CLASES_BOTON_PRINCIPAL } from './clases';
import { ENLACES_SECCIONES } from './enlaces';
import { Logotipo } from './Logotipo';

const ID_MENU = 'menu-principal';
const CLASES_ENLACE =
  'text-ash-gray hover:text-bone-white aria-[current=true]:text-bone-white aria-[current=true]:underline decoration-saffron-spark text-etiqueta flex min-h-8 min-w-8 items-center px-2 font-semibold uppercase underline-offset-8';

/** Banda del visor, algo por encima del centro: la sección que la cruza es la «visible». */
const BANDA = '-35% 0px -60% 0px';

/**
 * Cabecera: logotipo, enlaces a las secciones y el botón «Comenzar». En la portada marca con
 * `aria-current` la sección visible. En móvil quedan el logotipo y
 * «Menú», que despliega la lista. El violeta es de «Comenzar» solo en la portada; en el detalle
 * lo tiene «Reproducir», y aquí pasa a contorno.
 */
export function Cabecera() {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const enPortada = usePathname() === '/';
  const claseComenzar = enPortada ? CLASES_BOTON_PRINCIPAL : CLASES_BOTON_CONTORNO;
  const [activa, setActiva] = useState<string | null>(null);

  useEffect(() => {
    if (!enPortada) return;
    const visibles = new Set<string>();
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) visibles.add(e.target.id);
          else visibles.delete(e.target.id);
        }
        setActiva(ENLACES_SECCIONES.find((s) => visibles.has(s.id))?.id ?? null);
      },
      { rootMargin: BANDA },
    );
    for (const { id } of ENLACES_SECCIONES) {
      const seccion = document.getElementById(id);
      if (seccion) observador.observe(seccion);
    }
    return () => {
      observador.disconnect();
      setActiva(null);
    };
  }, [enPortada]);

  function alTeclear(evento: KeyboardEvent) {
    if (evento.key !== 'Escape' || !abierto) return;
    setAbierto(false);
    boton.current?.focus();
  }

  return (
    <header
      onKeyDown={alTeclear}
      className="mx-auto flex min-h-14 max-w-pagina flex-wrap items-center justify-between px-4 py-2"
    >
      <Logotipo enlace className="sm:flex-1" />
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
          className={`${abierto ? 'flex' : 'max-sm:hidden'} flex-col max-sm:order-last max-sm:w-full max-sm:gap-1 max-sm:pt-2 sm:flex sm:flex-row sm:gap-6`}
        >
          {ENLACES_SECCIONES.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                onClick={() => setAbierto(false)}
                aria-current={enPortada && activa === e.id ? 'true' : undefined}
                className={CLASES_ENLACE}
              >
                {e.texto}
              </Link>
            </li>
          ))}
          <li className="sm:hidden">
            <Link
              href="/#ley"
              onClick={() => setAbierto(false)}
              className={`${claseComenzar} mt-2`}
            >
              Comenzar
            </Link>
          </li>
        </ul>
      </nav>
      <div className="flex justify-end max-sm:hidden sm:flex-1">
        <Link href="/#ley" className={claseComenzar}>
          Comenzar
        </Link>
      </div>
    </header>
  );
}
