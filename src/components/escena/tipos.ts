import type { VistaCamara } from '@/lib/escena/camara';
import type { Estado, Trayectoria } from '@/lib/fisica';

export interface ApiEscena {
  restablecerVista(): void;
  /** Fija la fracción del periodo; se envuelve a [0, 1). */
  fijarPosicion(u: number): void;
}

export interface PropsEscenaOrbita {
  trayectoria: Trayectoria;
  etiqueta: string;
  descripcionId: string;
  reproduciendo: boolean;
  alAlternarReproduccion?: () => void;
  /** Por defecto 1. */
  velocidad?: number;
  /** Fracción del periodo entre 0,05 y 1; por defecto 0,5. */
  longitudEstela?: number;
  /** Fracción del periodo al montar; por defecto 0. */
  posicionInicial?: number;
  /** Vista al montar. Por defecto `VISTA_INICIAL`. */
  vistaInicial?: VistaCamara;
  /** Destino de la orden «restablecer» (Inicio y `restablecerVista`). Por defecto, `vistaInicial ?? VISTA_INICIAL`. */
  vistaRestablecida?: VistaCamara;
  giroAutomatico?: boolean;
  /** Se lee al montar. */
  ruedaActiva?: boolean;
  /** Por defecto 300. */
  particulasAmbientales?: number;
  alListo?: (api: ApiEscena) => void;
  /** Tras cada fotograma dibujado; el buffer se reutiliza: no guardarlo. */
  alFotograma?: (u: number, estado: Readonly<Estado>) => void;
  /** Cada vez que cambia la vista objetivo, de forma síncrona. */
  alCambiarVista?: (vista: Readonly<VistaCamara>) => void;
  /** Sin WebGL2 o con el contexto perdido. */
  alError?: (causa: Error) => void;
}
