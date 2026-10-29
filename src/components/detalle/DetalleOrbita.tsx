import { useCallback, useRef, useState } from 'react';
import { VISTA_INICIAL } from '@/lib/escena/camara';
import type { TrazadoMiniatura } from '@/lib/escena/miniatura';
import type { Estado, Slug } from '@/lib/fisica/tipos';
import type { Velocidad } from '@/lib/galeria/controles';
import type { LecturaTelemetria } from '@/lib/galeria/telemetria';
import type { PuntoDeReanudacion } from '@/store/almacenInterfaz';
import type { ApiEscena } from '../escena/tipos';
import { CLASES_PANEL } from '../comunes/clases';
import { useReproduccion } from '../escena/useReproduccion';
import { VisorOrbita, type EstadoEscena } from '../escena/VisorOrbita';
import { ControlesReproduccion, type ApiControles } from './ControlesReproduccion';
import { Telemetria, type ApiTelemetria } from './Telemetria';
import { useSesionVisor } from './useSesionVisor';

interface PropsDetalleOrbita {
  slug: Slug;
  nombre: string;
  miniatura: TrazadoMiniatura;
  periodo: number;
  energiaInicial: number;
  distanciaMinima: number;
  velocidadMaxima: number;
  lecturaInicial: LecturaTelemetria;
  /** Preferencias compartidas entre órbitas: las controla quien llama (el almacén de interfaz). */
  velocidad: Velocidad;
  alCambiarVelocidad: (velocidad: Velocidad) => void;
  longitudEstela: number;
  alCambiarLongitudEstela: (longitud: number) => void;
  /** Dónde retomar la órbita en esta sesión: se lee al montar. */
  reanudacion: PuntoDeReanudacion | undefined;
  /** Al montar el detalle. */
  alMontar: () => void;
  /** Al desmontarlo, solo si la escena llegó a dibujar un fotograma. */
  alSalir: (punto: PuntoDeReanudacion) => void;
}

/**
 * Visor, controles y telemetría. Eleva el estado de reproducción; las cifras, la posición del
 * deslizador y la vista no pasan por el estado de React: `alFotograma` las escribe en el DOM.
 */
export function DetalleOrbita({
  slug,
  nombre,
  miniatura,
  periodo,
  energiaInicial,
  distanciaMinima,
  velocidadMaxima,
  lecturaInicial,
  velocidad,
  alCambiarVelocidad,
  longitudEstela,
  alCambiarLongitudEstela,
  reanudacion,
  alMontar,
  alSalir,
}: PropsDetalleOrbita) {
  const [estadoEscena, setEstadoEscena] = useState<EstadoEscena>('cargando');
  const { reproduciendo, alternar, fijar } = useReproduccion();
  const alPausar = useCallback(() => fijar(false), [fijar]);

  const escena = useRef<ApiEscena | null>(null);
  const controles = useRef<ApiControles>(null);
  const telemetria = useRef<ApiTelemetria>(null);

  const { inicio, alCambiarVista, registrarFotograma } = useSesionVisor({
    reanudacion,
    reproduciendo,
    alMontar,
    alSalir,
  });

  const alListo = useCallback((api: ApiEscena) => {
    escena.current = api;
  }, []);

  const alFotograma = useCallback(
    (u: number, estado: Readonly<Estado>) => {
      if (!registrarFotograma(u)) return;
      telemetria.current?.escribir(u, estado);
      controles.current?.mostrarPosicion(u);
    },
    [registrarFotograma],
  );

  return (
    <div
      data-detalle={slug}
      data-velocidad={velocidad}
      data-longitud-estela={longitudEstela}
      className="flex flex-col gap-6 columnas:gap-10"
    >
      <VisorOrbita
        slug={slug}
        miniatura={miniatura}
        titulo={nombre}
        tamano="grande"
        controlAnimacion={false}
        giroAutomatico={false}
        reproduciendo={reproduciendo}
        alAlternarReproduccion={alternar}
        velocidad={velocidad}
        longitudEstela={longitudEstela}
        posicionInicial={inicio?.posicion}
        vistaInicial={inicio?.vista}
        vistaRestablecida={VISTA_INICIAL}
        alCambiarEstado={setEstadoEscena}
        alListo={alListo}
        alFotograma={alFotograma}
        alCambiarVista={alCambiarVista}
      />
      <div className="max-columnas:order-3">
        <ControlesReproduccion
          ref={controles}
          posicionInicial={inicio?.posicion ?? lecturaInicial.fase}
          periodo={periodo}
          reproduciendo={reproduciendo}
          estadoEscena={estadoEscena}
          alAlternar={alternar}
          alPausar={alPausar}
          velocidad={velocidad}
          alCambiarVelocidad={alCambiarVelocidad}
          longitudEstela={longitudEstela}
          alCambiarLongitudEstela={alCambiarLongitudEstela}
          alFijarPosicion={(u) => escena.current?.fijarPosicion(u)}
          alRestablecerVista={() => escena.current?.restablecerVista()}
        />
      </div>
      <div className={`${CLASES_PANEL} p-4 columnas:p-6 max-columnas:order-2`}>
        <Telemetria
          ref={telemetria}
          periodo={periodo}
          energiaInicial={energiaInicial}
          distanciaMinima={distanciaMinima}
          velocidadMaxima={velocidadMaxima}
          lecturaInicial={lecturaInicial}
        />
      </div>
    </div>
  );
}
