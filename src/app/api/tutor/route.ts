import { crearManejador } from '@/lib/tutor/manejador';
import { crearLimitador } from '@/lib/tutor/limitador';
import { modeloDeEntorno } from '@/lib/tutor/modo';
import { TOPES } from '@/lib/tutor/tipos';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const { POST, GET } = crearManejador({
  obtenerModelo: () => modeloDeEntorno(),
  limitador: crearLimitador(TOPES.peticionesPorMinuto, 60_000),
  ahora: () => Date.now(),
});

export { POST, GET };
