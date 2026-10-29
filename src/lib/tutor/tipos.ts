import { z } from 'zod';
import { SLUGS } from '@/lib/fisica/tipos';

export const CONCEPTOS = [
  'masa',
  'distancia',
  'inverso-cuadrado',
  'atraccion-mutua',
  'tres-cuerpos',
] as const;
export type Concepto = (typeof CONCEPTOS)[number];

export type Nivel = 1 | 2 | 3;
export type Modo = 'modelo' | 'reducido';

/** Rangos de los deslizadores de la ley (iguales a LIMITES de src/lib/ley). */
export const RANGO = { min: 1, max: 10 } as const;

/** Topes de entrada del servidor. */
export const TOPES = {
  bytes: 32 * 1024,
  mensajes: 20,
  caracteres: 1000,
  salidaTokens: 400,
  peticionesPorMinuto: 10,
} as const;

const valor = z.number().finite().min(RANGO.min).max(RANGO.max);

export interface AjusteLey {
  m1: number;
  m2: number;
  r: number;
}

export const esquemaAjustarLey = z.object({ m1: valor, m2: valor, r: valor });
export const esquemaMostrarOrbita = z.object({ slug: z.enum(SLUGS) });
export const esquemaRegistrarRespuesta = z.object({
  concepto: z.enum(CONCEPTOS),
  acierto: z.boolean(),
});

/** Nombres de las herramientas que resuelve el cliente. */
export const HERRAMIENTAS = ['ajustar_ley', 'mostrar_orbita', 'registrar_respuesta'] as const;
export type NombreHerramienta = (typeof HERRAMIENTAS)[number];

const parteTexto = z.object({ type: z.literal('text'), text: z.string().max(TOPES.caracteres) });
const parteInicioPaso = z.object({ type: z.literal('step-start') });
const parteHerramienta = z.looseObject({
  type: z.enum(HERRAMIENTAS.map((h) => `tool-${h}`) as [string, ...string[]]),
  toolCallId: z.string().max(200),
  state: z.string().max(50),
});

const esquemaMensaje = z.object({
  id: z.string().max(200).optional(),
  role: z.enum(['user', 'assistant']),
  parts: z.array(z.union([parteTexto, parteInicioPaso, parteHerramienta])).max(20),
});

export const esquemaPeticion = z.object({
  mensajes: z.array(esquemaMensaje).min(1).max(TOPES.mensajes),
  nivel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type Peticion = z.infer<typeof esquemaPeticion>;
