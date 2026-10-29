import { describe, expect, it } from 'vitest';
import { MENSAJES, mensajeDeError, senalaModoReducido } from '@/lib/tutor/errores';
import { crearLimitador } from '@/lib/tutor/limitador';
import { elegirModo } from '@/lib/tutor/modo';
import { siguienteNivel, type EstadoNivel } from '@/lib/tutor/nivel';
import { PREGUNTAS_FIJAS, responderReducido, siguientePregunta } from '@/lib/tutor/reducido';
import type { Nivel } from '@/lib/tutor/tipos';

describe('siguienteNivel', () => {
  it('sube con dos aciertos seguidos y baja con dos fallos seguidos, reiniciando la racha', () => {
    let e: EstadoNivel = { nivel: 2, racha: 0 };
    e = siguienteNivel(e, true);
    expect(e).toEqual({ nivel: 2, racha: 1 });
    e = siguienteNivel(e, true);
    expect(e).toEqual({ nivel: 3, racha: 0 });
    e = siguienteNivel(siguienteNivel(e, false), false);
    expect(e).toEqual({ nivel: 2, racha: 0 });
  });

  it('un cambio de signo reinicia la cuenta', () => {
    const e = siguienteNivel(siguienteNivel({ nivel: 2, racha: 0 }, true), false);
    expect(e).toEqual({ nivel: 2, racha: -1 });
  });

  it('nunca sale de 1 a 3', () => {
    let e: EstadoNivel = { nivel: 3, racha: 0 };
    for (let i = 0; i < 6; i++) e = siguienteNivel(e, true);
    expect(e.nivel).toBe(3);
    for (let i = 0; i < 12; i++) e = siguienteNivel(e, false);
    expect(e.nivel).toBe(1);
  });
});

describe('modo reducido', () => {
  const niveles: Nivel[] = [1, 2, 3];

  it('cada pregunta tiene una única opción correcta y correcciones no vacías', () => {
    for (const p of PREGUNTAS_FIJAS) {
      expect(p.opciones.filter((o) => o.acierto)).toHaveLength(1);
      for (const o of p.opciones) expect(o.correccion.trim()).not.toBe('');
    }
  });

  it('hay al menos 2 preguntas por nivel y siguientePregunta respeta nivel y no repite hasta agotar', () => {
    for (const nivel of niveles) {
      const delNivel = PREGUNTAS_FIJAS.filter((p) => p.nivel === nivel);
      expect(delNivel.length).toBeGreaterThanOrEqual(2);
      const vistas: string[] = [];
      for (let i = 0; i < delNivel.length; i++) {
        const p = siguientePregunta(nivel, vistas);
        expect(p.nivel).toBe(nivel);
        expect(vistas).not.toContain(p.id);
        vistas.push(p.id);
      }
      expect(siguientePregunta(nivel, vistas).nivel).toBe(nivel);
    }
  });

  it('responderReducido corrige, sube de nivel tras dos aciertos y devuelve la siguiente pregunta', () => {
    let estado: EstadoNivel = { nivel: 1, racha: 0 };
    let vistas: string[] = [];
    let pregunta = siguientePregunta(1, vistas);
    for (let i = 0; i < 2; i++) {
      const turno = responderReducido(
        estado,
        vistas,
        pregunta,
        pregunta.opciones.findIndex((o) => o.acierto),
      );
      expect(turno.acierto).toBe(true);
      expect(turno.correccion).not.toBe('');
      ({ estado, vistas, siguiente: pregunta } = turno);
    }
    expect(estado.nivel).toBe(2);
    expect(pregunta.nivel).toBe(2);
    const fallo = responderReducido(
      estado,
      vistas,
      pregunta,
      pregunta.opciones.findIndex((o) => !o.acierto),
    );
    expect(fallo.acierto).toBe(false);
    expect(() => responderReducido(estado, vistas, pregunta, 9)).toThrow(RangeError);
  });
});

describe('limitador', () => {
  it('bloquea la petición 11 por IP, no afecta a otras y se libera al pasar la ventana', () => {
    const limitar = crearLimitador(10, 60_000);
    for (let i = 0; i < 10; i++) expect(limitar('1.1.1.1', i * 1000).permitido).toBe(true);
    const bloqueada = limitar('1.1.1.1', 10_000);
    expect(bloqueada.permitido).toBe(false);
    expect(bloqueada.reintentarEnS).toBe(50);
    expect(limitar('2.2.2.2', 10_000).permitido).toBe(true);
    expect(limitar('1.1.1.1', 60_001).permitido).toBe(true);
  });

  it('aplica un tope global sumando todas las IP', () => {
    const limitar = crearLimitador(10, 60_000, 60);
    for (let i = 0; i < 60; i++) expect(limitar(`10.0.0.${i}`, i).permitido).toBe(true);
    const bloqueada = limitar('10.0.1.1', 100);
    expect(bloqueada.permitido).toBe(false);
    expect(bloqueada.reintentarEnS).toBe(60);
    expect(limitar('10.0.1.1', 60_001).permitido).toBe(true);
  });

  it('sigue limitando tras barrer más de 1000 entradas caducadas', () => {
    const limitar = crearLimitador(2, 1000);
    for (let i = 0; i < 1100; i++) limitar(`ip-${i}`, 0);
    expect(limitar('ip-nueva', 5000).permitido).toBe(true);
    expect(limitar('ip-nueva', 5001).permitido).toBe(true);
    expect(limitar('ip-nueva', 5002).permitido).toBe(false);
  });
});

describe('elegirModo', () => {
  it('es reducido sin clave o con proveedor distinto de google', () => {
    expect(elegirModo({})).toBe('reducido');
    expect(elegirModo({ clave: '', proveedor: 'google' })).toBe('reducido');
    expect(elegirModo({ clave: ' ' })).toBe('reducido');
    expect(elegirModo({ clave: 'k', proveedor: 'openai' })).toBe('reducido');
  });

  it('es modelo con clave y proveedor google o ausente', () => {
    expect(elegirModo({ clave: 'k' })).toBe('modelo');
    expect(elegirModo({ clave: 'k', proveedor: 'google' })).toBe('modelo');
  });
});

describe('mensajeDeError', () => {
  const conEstado = (statusCode: number) =>
    Object.assign(new Error('SECRETO-CLAVE-123'), { statusCode });

  it('distingue clave inválida, cuota, red y otro sin citar el mensaje original', () => {
    expect(mensajeDeError(conEstado(401))).toBe(MENSAJES.clave);
    expect(mensajeDeError(conEstado(403))).toBe(MENSAJES.clave);
    expect(mensajeDeError(conEstado(429))).toBe(MENSAJES.cuota);
    expect(mensajeDeError(new TypeError('fetch failed SECRETO-CLAVE-123'))).toBe(MENSAJES.red);
    expect(mensajeDeError(conEstado(500))).toBe(MENSAJES.otro);
    expect(mensajeDeError('SECRETO-CLAVE-123')).toBe(MENSAJES.otro);
    for (const m of Object.values(MENSAJES)) expect(m).not.toContain('SECRETO');
  });

  it('senalaModoReducido reconoce cuota y límite, y no otros errores', () => {
    expect(senalaModoReducido(MENSAJES.cuota)).toBe(true);
    expect(
      senalaModoReducido(JSON.stringify({ codigo: 'limite_peticiones', mensaje: MENSAJES.limite })),
    ).toBe(true);
    expect(senalaModoReducido(MENSAJES.red)).toBe(false);
  });
});
