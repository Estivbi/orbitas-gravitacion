import { LinearSRGBColorSpace, PerspectiveCamera, WebGLRenderer } from 'three';
import { distanciaInicial, posicionCamara } from '@/lib/escena/camara';
import type { Trayectoria } from '@/lib/fisica';
import { leerPaleta, type PaletaEscena } from './colores';
import { crearComposicion } from './composicion';
import { conectarInteraccion } from './interaccion';
import { prefiereMovimientoReducido } from './movimiento';
import { crearSimulacion } from './simulacion';
import type { PropsEscenaOrbita } from './tipos';

const DENSIDAD_MAXIMA = 2;
const CAMPO_DE_VISION = 40;

export interface Montaje {
  trayectoria: Trayectoria;
  etiqueta: string;
  descripcionId: string;
  particulas: number;
}

type Registrar = (limpieza: () => void) => void;

/**
 * Contexto WebGL2 opaco, creado antes que el renderer: three lo pide siempre con alfa y escribe
 * un error en la consola si no hay WebGL2, mientras que aquí la falta de soporte es un `Error` limpio.
 */
function crearContexto(lienzo: HTMLCanvasElement): WebGL2RenderingContext {
  const contexto = lienzo.getContext('webgl2', {
    alpha: false,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!contexto) {
    throw new Error('Este navegador no admite WebGL2');
  }
  return contexto;
}

function crearRenderer(paleta: PaletaEscena, montaje: Montaje): WebGLRenderer {
  const lienzo = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas: lienzo, context: crearContexto(lienzo) });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DENSIDAD_MAXIMA));
  renderer.setClearColor(paleta.fondo, 1);
  lienzo.className = 'absolute inset-0 block size-full cursor-grab';
  lienzo.style.touchAction = 'pan-y';
  lienzo.tabIndex = 0;
  lienzo.setAttribute('role', 'img');
  lienzo.setAttribute('aria-label', montaje.etiqueta);
  lienzo.setAttribute('aria-describedby', montaje.descripcionId);
  return renderer;
}

/** Bucle de dibujo: se detiene con la pestaña oculta o la escena fuera de pantalla. */
function crearBucle(dibujar: (dt: number) => void, visible: () => boolean) {
  let marcador = 0;
  let ultima = 0;

  function fotograma(ahora: number): void {
    marcador = 0;
    if (!visible()) return;
    marcador = requestAnimationFrame(fotograma);
    const dt = Math.max(0, (ahora - ultima) / 1000);
    ultima = ahora;
    dibujar(dt);
  }

  function arrancar(): void {
    if (marcador !== 0) return;
    ultima = performance.now();
    marcador = requestAnimationFrame(fotograma);
  }

  function detener(): void {
    cancelAnimationFrame(marcador);
    marcador = 0;
  }

  return {
    arrancar,
    detener,
    sincronizar: () => (visible() ? arrancar() : detener()),
  };
}

function iniciar(
  host: HTMLDivElement,
  montaje: Montaje,
  leerProps: () => PropsEscenaOrbita,
  registrar: Registrar,
): void {
  const { trayectoria } = montaje;
  const paleta = leerPaleta();
  const renderer = crearRenderer(paleta, montaje);
  registrar(() => {
    renderer.dispose();
    renderer.forceContextLoss();
  });
  const lienzo = renderer.domElement;
  host.appendChild(lienzo);
  registrar(() => lienzo.remove());

  const composicion = crearComposicion(
    trayectoria,
    paleta,
    renderer.getPixelRatio(),
    montaje.particulas,
  );
  registrar(composicion.liberar);

  const camara = new PerspectiveCamera(CAMPO_DE_VISION, 1, 0.1, 400);
  camara.up.set(0, 0, 1);
  let distanciaBase = distanciaInicial(trayectoria.radioMaximo, 1);
  const simulacion = crearSimulacion(trayectoria, leerProps, prefiereMovimientoReducido());
  let fotogramaVisible = true;
  let destruida = false;

  function pintar(): void {
    const estado = composicion.actualizar(simulacion.posicion, simulacion.longitudEstela);
    const [x, y, z] = posicionCamara(simulacion.vistaDibujada, distanciaBase);
    camara.position.set(x, y, z);
    camara.lookAt(0, 0, 0);
    renderer.render(composicion.escena, camara);
    leerProps().alFotograma?.(simulacion.posicion, estado);
  }

  const bucle = crearBucle(
    (dt) => {
      if (simulacion.avanzar(dt)) pintar();
    },
    () => fotogramaVisible && !document.hidden && !destruida,
  );
  registrar(() => {
    destruida = true;
    bucle.detener();
  });

  function ajustarTamano(): void {
    const ancho = Math.max(1, host.clientWidth);
    const alto = Math.max(1, host.clientHeight);
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    distanciaBase = distanciaInicial(trayectoria.radioMaximo, camara.aspect);
  }
  ajustarTamano();
  const observadorTamano = new ResizeObserver(() => {
    ajustarTamano();
    pintar();
  });
  observadorTamano.observe(host);
  registrar(() => observadorTamano.disconnect());

  const observadorVisibilidad = new IntersectionObserver((entradas) => {
    fotogramaVisible = entradas.at(-1)?.isIntersecting ?? true;
    bucle.sincronizar();
  });
  observadorVisibilidad.observe(host);
  registrar(() => observadorVisibilidad.disconnect());

  document.addEventListener('visibilitychange', bucle.sincronizar);
  registrar(() => document.removeEventListener('visibilitychange', bucle.sincronizar));

  const alPerderContexto = (evento: Event) => {
    evento.preventDefault();
    bucle.detener();
    leerProps().alError?.(new Error('Se perdió el contexto WebGL'));
  };
  lienzo.addEventListener('webglcontextlost', alPerderContexto);
  registrar(() => lienzo.removeEventListener('webglcontextlost', alPerderContexto));

  const propsIniciales = leerProps();
  registrar(
    conectarInteraccion(lienzo, {
      alOrden: simulacion.ordenar,
      alAlternar: () => leerProps().alAlternarReproduccion?.(),
      ruedaActiva: propsIniciales.ruedaActiva ?? false,
    }),
  );

  pintar();
  propsIniciales.alCambiarVista?.(simulacion.vistaDibujada);
  propsIniciales.alListo?.({
    restablecerVista: () => simulacion.ordenar({ tipo: 'restablecer' }),
    fijarPosicion: simulacion.fijarPosicion,
  });
  bucle.arrancar();
}

/**
 * Monta la escena dentro de `host` y devuelve la función que la desmonta: cancela el bucle,
 * desconecta observadores y manejadores, libera geometrías y materiales y pierde el contexto.
 * Lanza un `Error` si no hay WebGL2 o si falla algo al montar (dejando todo liberado).
 */
export function montarEscena(
  host: HTMLDivElement,
  montaje: Montaje,
  leerProps: () => PropsEscenaOrbita,
): () => void {
  const limpiezas: Array<() => void> = [];
  const limpiar = () =>
    limpiezas
      .splice(0)
      .reverse()
      .forEach((limpieza) => limpieza());
  try {
    iniciar(host, montaje, leerProps, (limpieza) => limpiezas.push(limpieza));
  } catch (causa) {
    limpiar();
    throw causa;
  }
  return limpiar;
}
