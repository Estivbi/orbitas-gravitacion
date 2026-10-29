import { describe, expect, it } from 'vitest';
import {
  esquemaAjustarLey,
  esquemaMostrarOrbita,
  esquemaPeticion,
  esquemaRegistrarRespuesta,
} from '@/lib/tutor/tipos';

const texto = (t: string) => ({ role: 'user', parts: [{ type: 'text', text: t }] });
const peticion = (mensajes: unknown[], nivel: unknown = 1) =>
  esquemaPeticion.safeParse({ mensajes, nivel });

describe('esquemaPeticion', () => {
  it('acepta una petición válida con partes de texto, paso y herramienta', () => {
    const asistente = {
      role: 'assistant',
      parts: [
        { type: 'step-start' },
        {
          type: 'tool-ajustar_ley',
          toolCallId: 'a',
          state: 'output-available',
          input: {},
          output: 'ok',
        },
      ],
    };
    expect(peticion([texto('hola'), asistente], 3).success).toBe(true);
  });

  it('rechaza más de 20 mensajes', () => {
    expect(peticion(Array.from({ length: 21 }, () => texto('x'))).success).toBe(false);
    expect(peticion(Array.from({ length: 20 }, () => texto('x'))).success).toBe(true);
  });

  it('rechaza texto de más de 1000 caracteres', () => {
    expect(peticion([texto('a'.repeat(1001))]).success).toBe(false);
    expect(peticion([texto('a'.repeat(1000))]).success).toBe(true);
  });

  it('rechaza roles ajenos, niveles fuera de 1 a 3 y partes desconocidas', () => {
    expect(peticion([{ role: 'system', parts: [{ type: 'text', text: 'x' }] }]).success).toBe(
      false,
    );
    for (const nivel of [0, 4, 1.5, '2', null])
      expect(peticion([texto('x')], nivel).success).toBe(false);
    expect(peticion([{ role: 'user', parts: [{ type: 'file', url: 'x' }] }]).success).toBe(false);
    expect(
      peticion([{ role: 'user', parts: [{ type: 'tool-otra', toolCallId: 'a', state: 's' }] }])
        .success,
    ).toBe(false);
  });
});

describe('esquemas de herramientas', () => {
  it('ajustar_ley acepta [1, 10] y rechaza fuera de rango y NaN', () => {
    expect(esquemaAjustarLey.safeParse({ m1: 1, m2: 10, r: 5.5 }).success).toBe(true);
    for (const malo of [{ m1: 0.5 }, { m2: 11 }, { r: NaN }, { r: Infinity }, { m1: '3' }]) {
      expect(esquemaAjustarLey.safeParse({ m1: 4, m2: 2, r: 4, ...malo }).success).toBe(false);
    }
  });

  it('mostrar_orbita solo admite los seis slugs', () => {
    expect(esquemaMostrarOrbita.safeParse({ slug: 'lagrange' }).success).toBe(true);
    for (const slug of ['x', '../', ''])
      expect(esquemaMostrarOrbita.safeParse({ slug }).success).toBe(false);
  });

  it('registrar_respuesta valida concepto y acierto', () => {
    expect(esquemaRegistrarRespuesta.safeParse({ concepto: 'masa', acierto: true }).success).toBe(
      true,
    );
    expect(esquemaRegistrarRespuesta.safeParse({ concepto: 'otro', acierto: true }).success).toBe(
      false,
    );
    expect(esquemaRegistrarRespuesta.safeParse({ concepto: 'masa', acierto: 'si' }).success).toBe(
      false,
    );
  });
});
