import { CLASES_ETIQUETA_SECCION } from './clases';

interface Props {
  hacer: string;
  observar: string;
}

/** Dos frases al abrir una sección: qué hacer y qué fijarse en el resultado. */
export function GuiaSeccion({ hacer, observar }: Props) {
  return (
    <dl className="mb-10 grid max-w-3xl grid-cols-1 gap-4 columnas:grid-cols-2 columnas:gap-10">
      <div className="flex flex-col gap-1">
        <dt className={CLASES_ETIQUETA_SECCION}>Qué hacer</dt>
        <dd className="text-silver-mist">{hacer}</dd>
      </div>
      <div className="flex flex-col gap-1">
        <dt className={CLASES_ETIQUETA_SECCION}>Qué observar</dt>
        <dd className="text-silver-mist">{observar}</dd>
      </div>
    </dl>
  );
}
