import { obtenerOrbita, type Slug } from '@/lib/fisica';
import type { Ley } from '@/lib/ley/ley';
import {
  esquemaAjustarLey,
  esquemaMostrarOrbita,
  esquemaRegistrarRespuesta,
  type NombreHerramienta,
} from '@/lib/tutor/tipos';

export interface AccionesHerramientas {
  fijarLey: (ley: Ley) => void;
  registrarResultado: (acierto: boolean) => void;
}

export type ResultadoHerramienta = { ok: true; salida: unknown } | { ok: false; error: string };

const INVALIDA: ResultadoHerramienta = { ok: false, error: 'Argumentos no válidos' };

/** Valida los argumentos que propone el modelo y, solo si son válidos, actúa sobre la interfaz. */
export function ejecutarHerramienta(
  nombre: string,
  entrada: unknown,
  acciones: AccionesHerramientas,
): ResultadoHerramienta {
  switch (nombre as NombreHerramienta) {
    case 'ajustar_ley': {
      const datos = esquemaAjustarLey.safeParse(entrada);
      if (!datos.success) return INVALIDA;
      acciones.fijarLey(datos.data);
      return { ok: true, salida: datos.data };
    }
    case 'mostrar_orbita': {
      const datos = esquemaMostrarOrbita.safeParse(entrada);
      return datos.success ? { ok: true, salida: datos.data } : INVALIDA;
    }
    case 'registrar_respuesta': {
      const datos = esquemaRegistrarRespuesta.safeParse(entrada);
      if (!datos.success) return INVALIDA;
      acciones.registrarResultado(datos.data.acierto);
      return { ok: true, salida: datos.data };
    }
    default:
      return { ok: false, error: 'Herramienta desconocida' };
  }
}

/** Nombre y enlace de la órbita que pide `mostrar_orbita`, o null si el slug no es válido. */
export function orbitaDeEntrada(entrada: unknown): { slug: Slug; nombre: string } | null {
  const datos = esquemaMostrarOrbita.safeParse(entrada);
  if (!datos.success) return null;
  const orbita = obtenerOrbita(datos.data.slug);
  return orbita ? { slug: datos.data.slug, nombre: orbita.nombre } : null;
}
