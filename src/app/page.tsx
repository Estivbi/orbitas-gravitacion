import { VisorOrbita } from '@/components/escena/VisorOrbita';
import { trazarMiniatura } from '@/lib/escena/miniatura';
import { integrarPeriodo, obtenerOrbita } from '@/lib/fisica';

const SLUG = 'figura-de-ocho';

/** La miniatura se calcula al prerenderizar: el HTML ya trae la figura sin esperar al Worker. */
function miniaturaDeLaPortada() {
  const orbita = obtenerOrbita(SLUG);
  if (!orbita) throw new Error(`La órbita ${SLUG} no está en el catálogo`);
  return { orbita, miniatura: trazarMiniatura(integrarPeriodo(orbita)) };
}

export default function Portada() {
  const { orbita, miniatura } = miniaturaDeLaPortada();
  return (
    <div className="mx-auto grid max-w-pagina grid-cols-1 items-center gap-6 px-4 columnas:min-h-100 columnas:grid-cols-[1fr_1.1fr] columnas:gap-10">
      <div className="flex flex-col gap-6 py-4">
        <p className="text-saffron-spark text-etiqueta font-semibold uppercase">
          Gravitación universal
        </p>
        <h1 className="text-titular-lg text-balance">Tres cuerpos, una sola curva.</h1>
        <p className="max-w-90">
          Newton resolvió el movimiento de dos masas que se atraen. Con tres no hay fórmula general,
          pero unas pocas condiciones iniciales dibujan órbitas que se repiten sin fin.
        </p>
      </div>
      <VisorOrbita slug={SLUG} miniatura={miniatura} titulo={orbita.nombre} />
    </div>
  );
}
