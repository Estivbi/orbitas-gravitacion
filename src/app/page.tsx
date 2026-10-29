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
        <div className="flex flex-col gap-6 py-4">
          <p className="text-saffron-spark text-etiqueta font-semibold uppercase">
            Gravitación universal
          </p>
          <h1 className="text-titular-lg text-balance">
            La ley que mueve el universo, a tu alcance.
          </h1>
          <p className="max-w-90">
            Mueve dos masas y mira cómo cambia la fuerza, ponte a prueba con un tutor y explora seis
            órbitas donde tres cuerpos se persiguen para siempre.
          </p>
        </div>
        <VisorOrbita slug={SLUG} miniatura={miniatura} titulo={orbita.nombre} />
      </div>
      <SeccionLey />
      <Galeria />
    </>
  );
}
