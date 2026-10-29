import Link from 'next/link';
import { CLASES_BOTON_CONTORNO, CLASES_ETIQUETA_SECCION } from '@/components/comunes/clases';
import { SeccionLey } from '@/components/ley/SeccionLey';
import { VisorOrbita } from '@/components/escena/VisorOrbita';
import { Galeria } from '@/components/galeria/Galeria';
import { fichaDeOrbita } from '@/lib/galeria/fichas';

const SLUG = 'figura-de-ocho';

export default function Portada() {
  // La miniatura se calcula al prerenderizar: el HTML ya trae la figura sin esperar al Worker.
  const { orbita, miniatura } = fichaDeOrbita(SLUG);
  return (
    <>
      <div className="mx-auto grid max-w-pagina grid-cols-1 items-center gap-6 px-4 columnas:min-h-100 columnas:grid-cols-[1fr_1.1fr] columnas:gap-10">
        <div className="flex flex-col items-start gap-6 py-4">
          <p className={CLASES_ETIQUETA_SECCION}>Explora el universo</p>
          <h1 className="text-titular-lg text-balance">La gravedad también se puede ver.</h1>
          <p className="max-w-90">
            Descubre cómo se atraen los cuerpos con una ley sencilla, experimenta con ella y explora
            seis órbitas donde tres cuerpos se persiguen para siempre.
          </p>
          <Link href="#galeria" className={CLASES_BOTON_CONTORNO}>
            Explorar ahora <span aria-hidden="true">→</span>
          </Link>
        </div>
        <VisorOrbita slug={SLUG} miniatura={miniatura} titulo={orbita.nombre} />
      </div>
      <SeccionLey />
      <Galeria />
    </>
  );
}
