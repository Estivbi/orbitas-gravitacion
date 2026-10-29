import { createGoogleGenerativeAI } from '@ai-sdk/google';
import type { LanguageModel } from 'ai';
import type { Modo } from './tipos';

export const MODELO_POR_DEFECTO = 'gemini-2.5-flash-lite';

export function elegirModo(env: { clave?: string; proveedor?: string }): Modo {
  const proveedor = (env.proveedor ?? 'google').trim().toLowerCase() || 'google';
  return proveedor === 'google' && (env.clave ?? '').trim() !== '' ? 'modelo' : 'reducido';
}

/** Lee el entorno en cada llamada y devuelve `null` si no hay modelo disponible. */
export function modeloDeEntorno(env: NodeJS.ProcessEnv = process.env): LanguageModel | null {
  const clave = env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (elegirModo({ clave, proveedor: env.LLM_PROVIDER }) === 'reducido') return null;
  return createGoogleGenerativeAI({ apiKey: clave })(env.LLM_MODEL || MODELO_POR_DEFECTO);
}
