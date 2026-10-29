import { convertToModelMessages, stepCountIs, streamText, tool } from 'ai';
import type { LanguageModel, UIMessage } from 'ai';
import { MENSAJES, mensajeDeError } from './errores';
import type { Limitador } from './limitador';
import { construirPrompt } from './prompt';
import {
  TOPES,
  esquemaAjustarLey,
  esquemaMostrarOrbita,
  esquemaPeticion,
  esquemaRegistrarRespuesta,
} from './tipos';

export interface DependenciasManejador {
  /** Devuelve el modelo o `null` si no hay (modo reducido). Se llama en cada petición. */
  obtenerModelo: () => LanguageModel | null;
  limitador: Limitador;
  ahora: () => number;
}

// Sin `execute`: las resuelve el cliente.
const herramientas = {
  ajustar_ley: tool({
    description:
      'Mueve los deslizadores de la ley: masas m1 y m2 y distancia r, todos entre 1 y 10.',
    inputSchema: esquemaAjustarLey,
  }),
  mostrar_orbita: tool({
    description: 'Muestra un enlace a una de las seis órbitas de la galería.',
    inputSchema: esquemaMostrarOrbita,
  }),
  registrar_respuesta: tool({
    description: 'Anota si la persona acertó o falló un concepto.',
    inputSchema: esquemaRegistrarRespuesta,
  }),
};

const MENSAJE_GRANDE = 'La petición es demasiado grande.';

function json(cuerpo: unknown, status: number, cabeceras?: Record<string, string>): Response {
  return Response.json(cuerpo, { status, headers: cabeceras });
}

function errorJson(
  codigo: string,
  mensaje: string,
  status: number,
  cabeceras?: Record<string, string>,
) {
  return json({ codigo, mensaje }, status, cabeceras);
}

/**
 * El primer valor de x-forwarded-for solo es fiable detrás del proxy de Vercel, que lo
 * fija; fuera de él lo controla quien llama. Por eso el limitador tiene también un tope global.
 */
function ipDe(peticion: Request): string {
  return peticion.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'desconocida';
}

export function crearManejador({ obtenerModelo, limitador, ahora }: DependenciasManejador) {
  async function POST(peticion: Request): Promise<Response> {
    const modelo = obtenerModelo();
    if (!modelo) return errorJson('modo_reducido', MENSAJES.reducido, 503);

    const veredicto = limitador(ipDe(peticion), ahora());
    if (!veredicto.permitido) {
      return errorJson('limite_peticiones', MENSAJES.limite, 429, {
        'Retry-After': String(veredicto.reintentarEnS),
      });
    }

    const declarado = Number(peticion.headers.get('content-length'));
    if (declarado > TOPES.bytes) return errorJson('cuerpo_grande', MENSAJE_GRANDE, 413);

    const texto = await peticion.text();
    if (new TextEncoder().encode(texto).length > TOPES.bytes) {
      return errorJson('cuerpo_grande', MENSAJE_GRANDE, 413);
    }

    let datos: unknown;
    try {
      datos = JSON.parse(texto);
    } catch {
      return errorJson('peticion_invalida', 'La petición no es válida.', 400);
    }
    const analisis = esquemaPeticion.safeParse(datos);
    if (!analisis.success) return errorJson('peticion_invalida', 'La petición no es válida.', 400);

    const { mensajes, nivel } = analisis.data;
    let mensajesModelo;
    try {
      mensajesModelo = await convertToModelMessages(
        mensajes as unknown as Omit<UIMessage, 'id'>[],
        {
          ignoreIncompleteToolCalls: true,
        },
      );
    } catch {
      return errorJson('peticion_invalida', 'La petición no es válida.', 400);
    }

    const resultado = streamText({
      model: modelo,
      instructions: construirPrompt(nivel),
      messages: mensajesModelo,
      tools: herramientas,
      stopWhen: stepCountIs(3),
      maxOutputTokens: TOPES.salidaTokens,
      maxRetries: 0,
      onError: () => undefined,
    });
    return resultado.toUIMessageStreamResponse({
      originalMessages: mensajes as unknown as UIMessage[],
      onError: mensajeDeError,
    });
  }

  function GET(): Response {
    return json({ modo: obtenerModelo() ? 'modelo' : 'reducido' }, 200);
  }

  return { POST, GET };
}
