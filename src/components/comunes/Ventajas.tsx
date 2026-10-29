import type { ReactNode } from 'react';

const TRAZO = {
  width: 28,
  height: 28,
  viewBox: '0 0 24 24',
  fill: 'none',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
  className: 'stroke-electric-iris shrink-0',
} as const;

const VENTAJAS: { titulo: string; texto: string; icono: ReactNode }[] = [
  {
    titulo: 'Aprende jugando',
    texto: 'Mueve las masas y mira el resultado',
    icono: <path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />,
  },
  {
    titulo: 'Pensada para principiantes',
    texto: 'Sin tecnicismos',
    icono: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5" />,
  },
  {
    titulo: 'Funciona en el móvil',
    texto: 'En cualquier pantalla',
    icono: (
      <>
        <rect x="7" y="3" width="10" height="18" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  },
  {
    titulo: 'Un tutor que te guía',
    texto: 'Pregunta y avanza a tu ritmo',
    icono: <path d="M4 5h16v11H9l-5 4z" />,
  },
];

/** Tira de ventajas: icono, título y una línea, sin cajas. */
export function Ventajas() {
  return (
    <section aria-label="Ventajas" className="mx-auto max-w-pagina px-4 py-16">
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 columnas:grid-cols-4">
        {VENTAJAS.map((v) => (
          <li key={v.titulo} className="flex items-start gap-3">
            <svg {...TRAZO}>{v.icono}</svg>
            <p className="flex flex-col gap-1">
              <span className="text-bone-white text-cuerpo font-normal">{v.titulo}</span>
              <span className="text-ash-gray text-etiqueta font-light">{v.texto}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
