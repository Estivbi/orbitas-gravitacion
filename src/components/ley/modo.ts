import type { Modo } from '@/lib/tutor/tipos';

/** Pregunta al servidor si hay modelo de lenguaje; cualquier fallo o respuesta rara es modo reducido. */
export async function obtenerModo(senal: AbortSignal): Promise<Modo> {
  try {
    const respuesta = await fetch('/api/tutor', { signal: senal });
    if (!respuesta.ok) return 'reducido';
    const cuerpo: unknown = await respuesta.json();
    const modo = (cuerpo as { modo?: unknown } | null)?.modo;
    return modo === 'modelo' ? 'modelo' : 'reducido';
  } catch {
    return 'reducido';
  }
}
