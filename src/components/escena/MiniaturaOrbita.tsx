import type { TrazadoMiniatura } from '@/lib/escena/miniatura';

/** Un color por cuerpo, en el orden de DESIGN.md. */
const COLORES_TRAZO = ['stroke-electric-iris', 'stroke-saffron-spark', 'stroke-orbit-teal'];

interface Props {
  trazado: TrazadoMiniatura;
  className?: string;
}

/** Dibujo de la órbita en SVG: es lo primero que se ve y lo que queda si no hay escena 3D. */
export function MiniaturaOrbita({ trazado, className }: Props) {
  return (
    <svg viewBox={trazado.viewBox} aria-hidden="true" focusable="false" className={className}>
      {trazado.trazos.map((d, cuerpo) => (
        <path
          key={cuerpo}
          d={d}
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={COLORES_TRAZO[cuerpo]}
        />
      ))}
    </svg>
  );
}
