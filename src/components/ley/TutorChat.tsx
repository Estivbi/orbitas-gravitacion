'use client';

import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai';
import Link from 'next/link';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { rutaDeOrbita } from '@/lib/galeria/navegacion';
import { MENSAJES, senalaModoReducido } from '@/lib/tutor/errores';
import { COOLDOWN_MS, MAX_MENSAJES, puedeEnviar } from '@/lib/tutor/cliente';
import { TOPES } from '@/lib/tutor/tipos';
import { useAlmacenApi } from '@/store/ProveedorAlmacen';
import { ejecutarHerramienta, orbitaDeEntrada } from './herramientas';
import type { MotivoReducido } from './PanelTutor';
import { CLASES_FANTASMA } from './TutorReducido';

const MENSAJE_RED = 'No se pudo conectar con el tutor. Comprueba tu conexión e inténtalo de nuevo.';
const MENSAJE_LIMITE =
  'La conversación llegó a su límite de 20 mensajes. Recarga la página para empezar otra.';

/** Texto de un error del chat: el JSON `{ mensaje }` del servidor, el texto del flujo o el de red. */
function textoDeError(error: Error): string {
  try {
    const cuerpo: unknown = JSON.parse(error.message);
    const mensaje = (cuerpo as { mensaje?: unknown } | null)?.mensaje;
    if (typeof mensaje === 'string') return mensaje;
  } catch {
    // No era JSON: es el texto del flujo (ya en castellano) o un fallo de red.
  }
  return error instanceof TypeError ? MENSAJE_RED : error.message || MENSAJES.otro;
}

function Mensaje({ mensaje }: { mensaje: UIMessage }) {
  const esUsuario = mensaje.role === 'user';
  return (
    <div
      className={`flex flex-col ${
        esUsuario ? 'items-end self-end ml-auto' : 'items-start self-start mr-auto'
      } max-w-[85%]`}
    >
      <span
        className={`mb-1 text-[11px] font-semibold uppercase tracking-wider ${
          esUsuario ? 'text-ash-gray' : 'text-saffron-spark'
        }`}
      >
        {esUsuario ? 'Tú' : 'Tutor'}
      </span>
      <div
        className={`rounded-2xl px-3.5 py-2.5 break-words ${
          esUsuario
            ? 'rounded-tr-xs bg-electric-iris/20 border border-electric-iris/40 text-bone-white'
            : 'rounded-tl-xs bg-bone-white/5 border border-bone-white/10 text-bone-white'
        }`}
      >
        {mensaje.parts.map((parte, i) => {
          if (parte.type === 'text') return <p key={i} className="whitespace-pre-wrap">{parte.text}</p>;
          if (parte.type !== 'tool-mostrar_orbita' || !('input' in parte)) return null;
          const orbita = orbitaDeEntrada(parte.input);
          if (!orbita) return null;
          return (
            <Link key={i} href={rutaDeOrbita(orbita.slug)} className={`${CLASES_FANTASMA} mt-2 inline-block`}>
              Abrir órbita {orbita.nombre}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Chat con el modelo: una petición cada vez, 2 s entre envíos y 20 mensajes como máximo. */
export function TutorChat({ alReducido }: { alReducido: (motivo: MotivoReducido) => void }) {
  const almacen = useAlmacenApi();
  const idEntrada = useId();
  const [texto, setTexto] = useState('');
  const [ultimoEnvio, setUltimoEnvio] = useState<number | null>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);
  const salidaHerramienta = useRef<ReturnType<typeof useChat>['addToolOutput']>(undefined);

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/tutor',
      prepareSendMessagesRequest: ({ messages: mensajes }) => ({
        body: { mensajes, nivel: almacen.getState().tutor.nivel },
      }),
      fetch: async (entrada, opciones) => {
        const respuesta = await fetch(entrada, opciones);
        if (respuesta.status === 429) alReducido('cuota');
        if (respuesta.status === 503) alReducido('sin-modelo');
        return respuesta;
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      if (toolCall.dynamic) return;
      const { fijarLey, registrarResultado } = almacen.getState();
      const resultado = ejecutarHerramienta(toolCall.toolName, toolCall.input, {
        fijarLey,
        registrarResultado,
      });
      const comun = { tool: toolCall.toolName, toolCallId: toolCall.toolCallId };
      void salidaHerramienta.current?.(
        resultado.ok
          ? { ...comun, output: resultado.salida }
          : { ...comun, state: 'output-error', errorText: resultado.error },
      );
    },
  });
  useEffect(() => {
    salidaHerramienta.current = addToolOutput;
  }, [addToolOutput]);
  useEffect(() => {
    if (error && senalaModoReducido(error.message)) {
      alReducido(error.message.includes(MENSAJES.reducido) ? 'sin-modelo' : 'cuota');
    }
  }, [error, alReducido]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const lleno = messages.length >= MAX_MENSAJES;
  const ocupado = status === 'submitted' || status === 'streaming';
  // Mientras hay `ultimoEnvio` se está enfriando: el temporizador lo borra pasado COOLDOWN_MS.
  const habilitado =
    puedeEnviar({ enviando: ocupado, ultimoEnvio, mensajes: messages.length }, ultimoEnvio ?? 0)
      .ok && texto.trim() !== '';

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    const ahora = Date.now();
    if (!puedeEnviar({ enviando: ocupado, ultimoEnvio, mensajes: messages.length }, ahora).ok) {
      return;
    }
    if (texto.trim() === '') return;
    void sendMessage({ text: texto.trim() });
    setTexto('');
    setUltimoEnvio(ahora);
    temporizador.current = setTimeout(() => setUltimoEnvio(null), COOLDOWN_MS);
  }

  // La última respuesta del tutor va en una región educada; el resto del historial, fuera.
  const ultima = messages.at(-1);
  const viva = ultima?.role === 'assistant' ? ultima : undefined;
  const previos = viva ? messages.slice(0, -1) : messages;

  const contenedorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contenedorRef.current) {
      contenedorRef.current.scrollTo({
        top: contenedorRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, viva]);

  return (
    <div className="flex w-full max-w-120 flex-col gap-3">
      {/* Contenedor de mensajes con altura acotada y scroll interno exclusivo */}
      <div ref={contenedorRef} className="flex max-h-96 min-h-36 flex-col gap-3 overflow-y-auto pr-1">
        <ul className="flex flex-col gap-3">
          {previos.map((m) => (
            <li key={m.id} className="flex flex-col">
              <Mensaje mensaje={m} />
            </li>
          ))}
        </ul>
        <div aria-live="polite" className="flex flex-col gap-3">
          {viva && <Mensaje mensaje={viva} />}
          {ocupado && !viva && (
            <div className="flex flex-col items-start self-start mr-auto max-w-[85%]">
              <span className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-saffron-spark">
                Tutor
              </span>
              <div className="rounded-2xl rounded-tl-xs bg-bone-white/5 border border-bone-white/10 px-4 py-3 text-silver-mist">
                <span className="inline-flex items-center gap-1.5" aria-label="El tutor está respondiendo">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-saffron-spark" />
                  <span className="h-1.5 w-1.5 animate-bounce [animation-delay:0.2s] rounded-full bg-saffron-spark" />
                  <span className="h-1.5 w-1.5 animate-bounce [animation-delay:0.4s] rounded-full bg-saffron-spark" />
                </span>
              </div>
            </div>
          )}
          {error && <p className="text-saffron-spark">{textoDeError(error)}</p>}
          {lleno && <p className="text-silver-mist">{MENSAJE_LIMITE}</p>}
        </div>
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            '¿Cómo influye la distancia en la gravedad?',
            'Pon la masa 1 al máximo',
            'Enséñame una órbita',
          ].map((sugerencia) => (
            <button
              key={sugerencia}
              type="button"
              onClick={() => {
                void sendMessage({ text: sugerencia });
              }}
              className="cursor-pointer rounded-2xl border border-bone-white/15 bg-bone-white/5 px-3 py-1.5 text-etiqueta text-silver-mist transition-colors hover:border-electric-iris hover:text-bone-white"
            >
              {sugerencia}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={enviar} className="flex flex-col gap-2 border-t border-ash-gray/20 pt-3">
        <p className="text-silver-mist text-etiqueta">Pregúntame sobre la ley de gravitación y las órbitas</p>
        <label
          htmlFor={idEntrada}
          className="text-saffron-spark text-etiqueta font-semibold uppercase"
        >
          Pregunta al tutor
        </label>
        <div className="flex gap-2">
          <input
            id={idEntrada}
            type="text"
            value={texto}
            maxLength={TOPES.caracteres}
            disabled={lleno}
            autoComplete="off"
            placeholder="Sobre masas, distancia, fuerza u órbitas"
            onChange={(evento) => setTexto(evento.currentTarget.value)}
            className="placeholder:text-ash-gray min-h-10 flex-1 rounded-2xl border border-ash-gray/30 bg-bone-white/5 px-3 py-2 text-cuerpo text-bone-white focus:border-electric-iris focus:outline-none"
          />
          <button
            type="submit"
            disabled={!habilitado}
            className={`${CLASES_FANTASMA} min-h-10 rounded-2xl px-4 disabled:cursor-default`}
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
