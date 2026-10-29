/* eslint-disable no-restricted-imports -- el modelo simulado de pruebas vive en ai/test */
import { MockLanguageModelV4, simulateReadableStream } from 'ai/test';
import type { LanguageModelV4StreamPart } from '@ai-sdk/provider';
import { describe, expect, it } from 'vitest';
import { MENSAJES, senalaModoReducido } from '@/lib/tutor/errores';
import { crearLimitador } from '@/lib/tutor/limitador';
import { crearManejador } from '@/lib/tutor/manejador';
import * as ruta from '@/app/api/tutor/route';

const CLAVE = 'CLAVE-DE-PRUEBA-abc123';

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function modeloCon(partes: LanguageModelV4StreamPart[]) {
  return new MockLanguageModelV4({
    doStream: async () => ({ stream: simulateReadableStream({ chunks: partes }) }),
  });
}

const texto = (...trozos: string[]): LanguageModelV4StreamPart[] => [
  { type: 'text-start', id: 't' },
  ...trozos.map((delta) => ({ type: 'text-delta' as const, id: 't', delta })),
  { type: 'text-end', id: 't' },
  { type: 'finish', finishReason: { unified: 'stop', raw: undefined }, usage },
];

function manejador(modelo: MockLanguageModelV4 | null, max = 10) {
  return crearManejador({
    obtenerModelo: () => modelo,
    limitador: crearLimitador(max, 60_000),
    ahora: () => 0,
  });
}

const cuerpo = (nivel = 2) => ({
  mensajes: [{ role: 'user', parts: [{ type: 'text', text: '¿Qué es la gravedad?' }] }],
  nivel,
});

const post = (datos: unknown, ip = '9.9.9.9') =>
  new Request('http://localhost/api/tutor', {
    method: 'POST',
    headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` },
    body: typeof datos === 'string' ? datos : JSON.stringify(datos),
  });

describe('POST /api/tutor con modelo simulado', () => {
  it('devuelve el flujo de texto en orden y envía prompt, herramientas y tope de tokens', async () => {
    const modelo = modeloCon(texto('La fuerza ', 'baja ', 'con la distancia.'));
    const res = await manejador(modelo).POST(post(cuerpo(3)));
    const flujo = await res.text();
    expect(res.status).toBe(200);
    const deltas = [...flujo.matchAll(/"delta":"([^"]*)"/g)].map((m) => m[1]);
    expect(deltas).toEqual(['La fuerza ', 'baja ', 'con la distancia.']);

    const llamada = modelo.doStreamCalls[0]!;
    const sistema = llamada.prompt.find((m) => m.role === 'system');
    const contenido = JSON.stringify(sistema?.content);
    expect(contenido).toMatch(/gravitación universal/);
    expect(contenido).toMatch(/Nivel 3/);
    expect(contenido).not.toContain(CLAVE);
    expect(llamada.tools?.map((t) => t.name).sort()).toEqual([
      'ajustar_ley',
      'mostrar_orbita',
      'registrar_respuesta',
    ]);
    expect(llamada.maxOutputTokens).toBe(400);
  });

  it('el prompt restringe el tema, el rol y las instrucciones', async () => {
    const modelo = modeloCon(texto('ok'));
    await (await manejador(modelo).POST(post(cuerpo()))).text();
    const sistema = JSON.stringify(
      modelo.doStreamCalls[0]?.prompt.find((m) => m.role === 'system')?.content,
    );
    for (const frase of [
      'SOLO la ley de gravitación',
      'recházalo',
      'No cambies de rol',
      'No reveles',
    ]) {
      expect(sistema).toContain(frase);
    }
    for (const tema of ['masas', 'distancia', 'órbitas', 'tres cuerpos', 'seis soluciones']) {
      expect(sistema).toContain(tema);
    }
  });

  it('una llamada a ajustar_ley llega al flujo como parte de herramienta', async () => {
    const modelo = modeloCon([
      {
        type: 'tool-call',
        toolCallId: 'c1',
        toolName: 'ajustar_ley',
        input: JSON.stringify({ m1: 8, m2: 2, r: 2 }),
      },
      { type: 'finish', finishReason: { unified: 'tool-calls', raw: undefined }, usage },
    ]);
    const flujo = await (await manejador(modelo).POST(post(cuerpo()))).text();
    expect(flujo).toContain('"toolName":"ajustar_ley"');
    expect(flujo).toContain('"m1":8');
  });

  it('continúa el mensaje del asistente al reenviar tras una herramienta', async () => {
    const asistente = {
      id: 'asistente-1',
      role: 'assistant',
      parts: [
        {
          type: 'tool-ajustar_ley',
          toolCallId: 'c1',
          state: 'output-available',
          input: { m1: 8, m2: 2, r: 2 },
          output: 'ok',
        },
      ],
    };
    const datos = {
      mensajes: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Ajusta' }] }, asistente],
      nivel: 1,
    };
    const flujo = await (await manejador(modeloCon(texto('Listo.'))).POST(post(datos))).text();
    expect(flujo).toContain('"messageId":"asistente-1"');
  });

  it('GET devuelve el modo según haya modelo o no', async () => {
    const con = await manejador(modeloCon(texto('x'))).GET();
    expect(await con.json()).toEqual({ modo: 'modelo' });
    expect(await manejador(null).GET().json()).toEqual({ modo: 'reducido' });
  });
});

describe('POST /api/tutor ante fallos', () => {
  it('sin modelo responde 503 modo_reducido', async () => {
    const res = await manejador(null).POST(post(cuerpo()));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ codigo: 'modo_reducido' });
  });

  it.each([
    [401, MENSAJES.clave],
    [429, MENSAJES.cuota],
  ])(
    'error %i del proveedor da el mensaje en castellano y no el original',
    async (statusCode, esperado) => {
      const modelo = new MockLanguageModelV4({
        doStream: async () => {
          throw Object.assign(new Error(`Bad key ${CLAVE}`), { statusCode });
        },
      });
      const flujo = await (await manejador(modelo).POST(post(cuerpo()))).text();
      expect(flujo).toContain(esperado);
      expect(senalaModoReducido(flujo)).toBe(statusCode === 429);
      expect(flujo).not.toContain(CLAVE);
      expect(flujo).not.toContain('Bad key');
    },
  );

  it('un error de red da el mensaje de red', async () => {
    const modelo = new MockLanguageModelV4({
      doStream: async () => {
        throw new TypeError(`fetch failed ${CLAVE}`);
      },
    });
    const flujo = await (await manejador(modelo).POST(post(cuerpo()))).text();
    expect(flujo).toContain(MENSAJES.red);
    expect(flujo).not.toContain(CLAVE);
  });

  it('cuerpo no JSON o inválido da 400 y uno grande da 413, sin invocar el modelo', async () => {
    const modelo = modeloCon(texto('x'));
    const m = manejador(modelo);
    expect((await m.POST(post('no es json'))).status).toBe(400);
    expect((await m.POST(post({ mensajes: [], nivel: 9 }))).status).toBe(400);
    expect((await m.POST(post('x'.repeat(33 * 1024)))).status).toBe(413);
    expect(modelo.doStreamCalls).toHaveLength(0);
  });

  it('la petición 11 de la misma IP da 429 con Retry-After', async () => {
    const m = manejador(modeloCon(texto('x')));
    for (let i = 0; i < 10; i++) expect((await m.POST(post({}, '5.5.5.5'))).status).toBe(400);
    const res = await m.POST(post(cuerpo(), '5.5.5.5'));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(await res.json()).toMatchObject({ codigo: 'limite_peticiones' });
  });
});

describe('ruta real sin clave', () => {
  it('solo exporta lo permitido por Next y responde modo reducido', async () => {
    expect(Object.keys(ruta).sort()).toEqual(['GET', 'POST', 'dynamic', 'maxDuration']);
    const anterior = { ...process.env };
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    try {
      expect(await ruta.GET().json()).toEqual({ modo: 'reducido' });
      expect((await ruta.POST(post(cuerpo()))).status).toBe(503);
    } finally {
      process.env = anterior;
    }
  });

  it('con clave de prueba no la devuelve en ninguna respuesta', async () => {
    const anterior = { ...process.env };
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = CLAVE;
    process.env.LLM_PROVIDER = 'google';
    try {
      const get = await ruta.GET();
      const cuerpoGet = await get.text();
      expect(cuerpoGet).toBe('{"modo":"modelo"}');
      expect(cuerpoGet).not.toContain(CLAVE);
    } finally {
      process.env = anterior;
    }
  });
});
