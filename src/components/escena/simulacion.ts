import {
  VISTA_INICIAL,
  aplicarOrden,
  girarAutomaticamente,
  type OrdenCamara,
  type VistaCamara,
} from '@/lib/escena/camara';
import { limitar } from '@/lib/escena/numeros';
import { avanzarPosicion, envolverPosicion } from '@/lib/escena/reloj';
import type { Trayectoria } from '@/lib/fisica';
import { suavizarVista, vistasIguales } from './suavizado';
import type { PropsEscenaOrbita } from './tipos';

const LONGITUD_ESTELA_POR_DEFECTO = 0.5;

/** Estado de la órbita y de la cámara, sin tocar el DOM ni three. Las props se leen en cada paso. */
export interface Simulacion {
  readonly posicion: number;
  readonly vistaDibujada: VistaCamara;
  readonly longitudEstela: number;
  ordenar(orden: OrdenCamara): void;
  fijarPosicion(u: number): void;
  /** Avanza `dt` segundos; devuelve si hay algo nuevo que dibujar. */
  avanzar(dt: number): boolean;
}

export function crearSimulacion(
  trayectoria: Trayectoria,
  leerProps: () => PropsEscenaOrbita,
  movimientoReducido: boolean,
): Simulacion {
  const inicial = leerProps();
  const vistaInicial = () => leerProps().vistaInicial ?? VISTA_INICIAL;
  let u = envolverPosicion(inicial.posicionInicial ?? 0);
  let objetivo: VistaCamara = { ...vistaInicial() };
  let dibujada: VistaCamara = { ...objetivo };
  let giroDetenido = false;
  let reproduciendoAntes = inicial.reproduciendo;
  let longitud = LONGITUD_ESTELA_POR_DEFECTO;
  let hayCambios = true;

  function girando(props: PropsEscenaOrbita): boolean {
    return (
      (props.giroAutomatico ?? false) && props.reproduciendo && !movimientoReducido && !giroDetenido
    );
  }

  function observarProps(props: PropsEscenaOrbita): void {
    const nuevaLongitud = limitar(props.longitudEstela ?? LONGITUD_ESTELA_POR_DEFECTO, 0.05, 1);
    if (nuevaLongitud !== longitud || props.reproduciendo !== reproduciendoAntes) {
      hayCambios = true;
    }
    longitud = nuevaLongitud;
    reproduciendoAntes = props.reproduciendo;
  }

  return {
    get posicion() {
      return u;
    },
    get vistaDibujada() {
      return dibujada;
    },
    get longitudEstela() {
      return longitud;
    },
    ordenar(orden) {
      objetivo =
        orden.tipo === 'restablecer' ? { ...vistaInicial() } : aplicarOrden(objetivo, orden);
      giroDetenido = true;
      leerProps().alCambiarVista?.(objetivo);
    },
    fijarPosicion(nueva) {
      if (!Number.isFinite(nueva)) return;
      u = envolverPosicion(nueva);
      hayCambios = true;
    },
    avanzar(dt) {
      const props = leerProps();
      observarProps(props);
      if (props.reproduciendo) {
        u = avanzarPosicion(u, dt, props.velocidad ?? 1, trayectoria.periodo);
        hayCambios = true;
      }
      if (girando(props)) {
        objetivo = girarAutomaticamente(objetivo, dt);
        props.alCambiarVista?.(objetivo);
      }
      const anterior = dibujada;
      dibujada = suavizarVista(dibujada, objetivo, dt);
      const dibujar = hayCambios || !vistasIguales(anterior, dibujada);
      hayCambios = false;
      return dibujar;
    },
  };
}
