import { createStore, type StoreApi } from 'zustand/vanilla';
import type { VistaCamara } from '@/lib/escena/camara';
import type { Slug } from '@/lib/fisica/tipos';
import {
  LONGITUD_ESTELA,
  VELOCIDAD_INICIAL,
  esVelocidad,
  type Velocidad,
} from '@/lib/galeria/controles';
import { esOrden, ORDEN_INICIAL, type OrdenGaleria } from '@/lib/galeria/orden';

export interface PuntoDeReanudacion {
  /** Fracción del periodo, en [0, 1). */
  posicion: number;
  vista: VistaCamara;
}

export interface EstadoInterfaz {
  ordenGaleria: OrdenGaleria;
  ultimaOrbita: Slug | null;
  velocidad: Velocidad;
  longitudEstela: number;
  reanudacion: Readonly<Partial<Record<Slug, PuntoDeReanudacion>>>;
  /** La marca el proveedor al recibir un popstate; el detalle la desmarca al montarse. */
  entradaPorHistorial: boolean;
}

export interface AccionesInterfaz {
  elegirOrden(orden: OrdenGaleria): void;
  recordarOrbita(slug: Slug): void;
  olvidarOrbita(): void;
  fijarVelocidad(velocidad: number): void;
  fijarLongitudEstela(longitud: number): void;
  guardarReanudacion(slug: Slug, punto: PuntoDeReanudacion): void;
  marcarEntradaPorHistorial(valor: boolean): void;
}

export type AlmacenInterfaz = StoreApi<EstadoInterfaz & AccionesInterfaz>;

export const ESTADO_INICIAL: Readonly<EstadoInterfaz> = Object.freeze({
  ordenGaleria: ORDEN_INICIAL,
  ultimaOrbita: null,
  velocidad: VELOCIDAD_INICIAL,
  longitudEstela: LONGITUD_ESTELA.inicial,
  reanudacion: Object.freeze({}),
  entradaPorHistorial: false,
});

/** A [0, 1) sin alterar los valores que ya están dentro (a diferencia de `((u % 1) + 1) % 1`). */
const envolver = (u: number): number => {
  const envuelta = u - Math.floor(u);
  return envuelta >= 1 ? 0 : envuelta;
};

const vistaEsFinita = (vista: VistaCamara): boolean =>
  Number.isFinite(vista.acimut) && Number.isFinite(vista.polar) && Number.isFinite(vista.distancia);

const mismoPunto = (a: PuntoDeReanudacion | undefined, b: PuntoDeReanudacion): boolean =>
  a !== undefined &&
  a.posicion === b.posicion &&
  a.vista.acimut === b.vista.acimut &&
  a.vista.polar === b.vista.polar &&
  a.vista.distancia === b.vista.distancia;

/**
 * Un almacén nuevo por llamada: nunca una instancia de módulo, que el servidor compartiría entre
 * peticiones. Cada acción comprueba que el valor cambia antes de llamar a `set`.
 */
export function crearAlmacenInterfaz(inicial: Partial<EstadoInterfaz> = {}): AlmacenInterfaz {
  return createStore<EstadoInterfaz & AccionesInterfaz>()((set, get) => ({
    ...ESTADO_INICIAL,
    ...inicial,
    elegirOrden(orden) {
      if (!esOrden(orden) || orden === get().ordenGaleria) return;
      set({ ordenGaleria: orden });
    },
    recordarOrbita(slug) {
      if (slug === get().ultimaOrbita) return;
      set({ ultimaOrbita: slug });
    },
    olvidarOrbita() {
      if (get().ultimaOrbita === null) return;
      set({ ultimaOrbita: null });
    },
    fijarVelocidad(velocidad) {
      if (!esVelocidad(velocidad) || velocidad === get().velocidad) return;
      set({ velocidad });
    },
    fijarLongitudEstela(longitud) {
      if (!Number.isFinite(longitud)) return;
      const limitada = Math.min(LONGITUD_ESTELA.maxima, Math.max(LONGITUD_ESTELA.minima, longitud));
      if (limitada === get().longitudEstela) return;
      set({ longitudEstela: limitada });
    },
    guardarReanudacion(slug, punto) {
      if (!Number.isFinite(punto.posicion) || !vistaEsFinita(punto.vista)) return;
      const nuevo: PuntoDeReanudacion = {
        posicion: envolver(punto.posicion),
        vista: {
          acimut: punto.vista.acimut,
          polar: punto.vista.polar,
          distancia: punto.vista.distancia,
        },
      };
      if (mismoPunto(get().reanudacion[slug], nuevo)) return;
      set({ reanudacion: { ...get().reanudacion, [slug]: nuevo } });
    },
    marcarEntradaPorHistorial(valor) {
      if (valor === get().entradaPorHistorial) return;
      set({ entradaPorHistorial: valor });
    },
  }));
}

type Estado = EstadoInterfaz & AccionesInterfaz;

/** Selectores que devuelven valores primitivos o la misma referencia del estado. */
export const selectores = {
  ordenGaleria: (estado: Estado) => estado.ordenGaleria,
  ultimaOrbita: (estado: Estado) => estado.ultimaOrbita,
  velocidad: (estado: Estado) => estado.velocidad,
  longitudEstela: (estado: Estado) => estado.longitudEstela,
  reanudacion: (estado: Estado) => estado.reanudacion,
  entradaPorHistorial: (estado: Estado) => estado.entradaPorHistorial,
} as const;
