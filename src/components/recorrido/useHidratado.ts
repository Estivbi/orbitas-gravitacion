import { useSyncExternalStore } from 'react';

const sinSuscripcion = () => () => {};

/** `false` en el HTML del servidor y hasta hidratar; `true` después. Evita controles que no hacen nada sin JavaScript. */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );
}
