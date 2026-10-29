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
import { LEY_INICIAL, limitarLey, type Ley } from '@/lib/ley/ley';
import { ESTADO_NIVEL_INICIAL, siguienteNivel, type EstadoNivel } from '@/lib/tutor/nivel';

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
  /** Ley de gravitación que comparten los deslizadores, el SVG y la herramienta `ajustar_ley`. */
  ley: Readonly<Ley>;
  /** Nivel del tutor (1 a 3) y racha de aciertos (+) o fallos (−) seguidos. */
  tutor: Readonly<EstadoNivel>;
}

export interface AccionesInterfaz {
  elegirOrden(orden: OrdenGaleria): void;
  recordarOrbita(slug: Slug): void;
  olvidarOrbita(): void;
  fijarVelocidad(velocidad: number): void;
  fijarLongitudEstela(longitud: number): void;
  guardarReanudacion(slug: Slug, punto: PuntoDeReanudacion): void;
  marcarEntradaPorHistorial(valor: boolean): void;
  /** Fusiona los valores dados con la ley actual, recortados a los límites y al paso. */
  fijarLey(parcial: Partial<Ley>): void;
  registrarResultado(acierto: boolean): void;
}

export type AlmacenInterfaz = StoreApi<EstadoInterfaz & AccionesInterfaz>;

export const ESTADO_INICIAL: Readonly<EstadoInterfaz> = Object.freeze({
  ordenGaleria: ORDEN_INICIAL,
  ultimaOrbita: null,
  velocidad: VELOCIDAD_INICIAL,
  longitudEstela: LONGITUD_ESTELA.inicial,
  reanudacion: Object.freeze({}),
  entradaPorHistorial: false,
  ley: LEY_INICIAL,
  tutor: Object.freeze({ ...ESTADO_NIVEL_INICIAL }),
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
    fijarLey(parcial) {
      const actual = get().ley;
      const nueva = limitarLey({ ...actual, ...parcial });
      if (nueva.m1 === actual.m1 && nueva.m2 === actual.m2 && nueva.r === actual.r) return;
      set({ ley: nueva });
    },
    registrarResultado(acierto) {
      set({ tutor: siguienteNivel(get().tutor, acierto) });
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
  ley: (estado: Estado) => estado.ley,
  tutor: (estado: Estado) => estado.tutor,
} as const;
