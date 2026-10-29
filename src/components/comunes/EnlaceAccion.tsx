import Link from 'next/link';
import type { ReactNode } from 'react';
import { CLASES_BOTON_PRINCIPAL, CLASES_ENLACE_FANTASMA } from './clases';

/** Llamada a la acción: pastilla violeta con flecha (uno por sección) o enlace fantasma. */
export function EnlaceAccion({
  href,
  children,
  fantasma = false,
}: {
  href: string;
  children: ReactNode;
  fantasma?: boolean;
}) {
  return (
    <Link href={href} className={fantasma ? CLASES_ENLACE_FANTASMA : CLASES_BOTON_PRINCIPAL}>
      {children}
      {!fantasma && <span aria-hidden="true">→</span>}
    </Link>
  );
}
