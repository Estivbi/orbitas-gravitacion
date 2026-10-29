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
  return (
    <>
      {mensaje.parts.map((parte, i) => {
        if (parte.type === 'text') return <p key={i}>{parte.text}</p>;
        if (parte.type !== 'tool-mostrar_orbita' || !('input' in parte)) return null;
        const orbita = orbitaDeEntrada(parte.input);
        if (!orbita) return null;
        return (
          <Link key={i} href={rutaDeOrbita(orbita.slug)} className={CLASES_FANTASMA}>
            Abrir órbita {orbita.nombre}
          </Link>
        );
      })}
    </>
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
  return (
    <div className="flex max-w-90 flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {previos.map((m) => (
          <li key={m.id} className={m.role === 'user' ? 'text-ash-gray' : undefined}>
            <Mensaje mensaje={m} />
          </li>
        ))}
      </ul>
      <div aria-live="polite" className="flex flex-col gap-3">
        {viva && <Mensaje mensaje={viva} />}
        {error && <p className="text-saffron-spark">{textoDeError(error)}</p>}
        {lleno && <p className="text-silver-mist">{MENSAJE_LIMITE}</p>}
      </div>
      <form onSubmit={enviar} className="flex flex-col gap-2">
        <label
          htmlFor={idEntrada}
          className="text-saffron-spark text-etiqueta font-semibold uppercase"
        >
          Pregunta al tutor
        </label>
        <input
          id={idEntrada}
          type="text"
          value={texto}
          maxLength={TOPES.caracteres}
          disabled={lleno}
          autoComplete="off"
          placeholder="Sobre masas, distancia, fuerza u órbitas"
          onChange={(evento) => setTexto(evento.currentTarget.value)}
          className="placeholder:text-ash-gray min-h-8 w-full bg-transparent"
        />
        <button
          type="submit"
          disabled={!habilitado}
          className={`${CLASES_FANTASMA} disabled:cursor-default`}
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
