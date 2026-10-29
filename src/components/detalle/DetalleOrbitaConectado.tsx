'use client';

import { useCallback, useState, type ComponentProps } from 'react';
import { selectores, type PuntoDeReanudacion } from '@/store/almacenInterfaz';
import { useAlmacen, useAlmacenApi } from '@/store/ProveedorAlmacen';
import { DetalleOrbita } from './DetalleOrbita';

type PropsDeLaFicha = Omit<
  ComponentProps<typeof DetalleOrbita>,
  | 'velocidad'
  | 'alCambiarVelocidad'
  | 'longitudEstela'
  | 'alCambiarLongitudEstela'
  | 'reanudacion'
  | 'alMontar'
  | 'alSalir'
>;

function Conectado(props: PropsDeLaFicha) {
  const { slug } = props;
  const almacen = useAlmacenApi();
  const velocidad = useAlmacen(selectores.velocidad);
  const longitudEstela = useAlmacen(selectores.longitudEstela);
  // Se lee una sola vez al montar (sin suscripción): la reanudación solo vale para esta visita.
  const [reanudacion] = useState<PuntoDeReanudacion | undefined>(
    () => almacen.getState().reanudacion[slug],
  );

  const alMontar = useCallback(() => {
    const acciones = almacen.getState();
    acciones.recordarOrbita(slug);
    acciones.marcarEntradaPorHistorial(false);
  }, [almacen, slug]);
  const alSalir = useCallback(
    (punto: PuntoDeReanudacion) => almacen.getState().guardarReanudacion(slug, punto),
    [almacen, slug],
  );

  return (
    <DetalleOrbita
      {...props}
      velocidad={velocidad}
      alCambiarVelocidad={(nueva) => almacen.getState().fijarVelocidad(nueva)}
      longitudEstela={longitudEstela}
      alCambiarLongitudEstela={(nueva) => almacen.getState().fijarLongitudEstela(nueva)}
      reanudacion={reanudacion}
      alMontar={alMontar}
      alSalir={alSalir}
    />
  );
}

/**
 * Conecta el detalle al almacén de interfaz: preferencias compartidas entre órbitas, reanudación
 * por órbita y registro de la última órbita visitada. Se vuelve a montar al cambiar de órbita.
 */
export function DetalleOrbitaConectado(props: PropsDeLaFicha) {
  return <Conectado key={props.slug} {...props} />;
}
