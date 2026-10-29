import Link from 'next/link';

function Marca() {
  return (
    <>
      <svg width="20" height="19" viewBox="0 0 20 19" aria-hidden="true" focusable="false">
        <polygon points="10,1 19,18 1,18" className="fill-electric-iris" />
      </svg>
      <span className="text-cuerpo font-normal">Órbitas</span>
    </>
  );
}

/** Logotipo (triángulo violeta) y nombre. Con `enlace`, lleva a la portada; sin él es solo la marca. */
export function Logotipo({
  enlace = false,
  className = '',
}: {
  enlace?: boolean;
  className?: string;
}) {
  const clases = `flex min-h-8 items-center gap-2 ${className}`;
  if (!enlace) {
    return (
      <p className={clases}>
        <Marca />
      </p>
    );
  }
  return (
    <Link href="/" aria-label="Órbitas, inicio" className={clases}>
      <Marca />
    </Link>
  );
}
