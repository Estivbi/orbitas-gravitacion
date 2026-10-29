'use client';

import { useEffect, useState } from 'react';
import type { Modo } from '@/lib/tutor/tipos';
import { CLASES_PANEL } from '../comunes/clases';
import { obtenerModo } from './modo';
import { TutorChat } from './TutorChat';
import { TutorReducido } from './TutorReducido';

export type MotivoReducido = 'sin-modelo' | 'cuota';

const AVISOS: Record<MotivoReducido, string> = {
  'sin-modelo':
    'El chat con inteligencia artificial no está activo ahora. Mientras tanto, practica con estas preguntas.',
  cuota: 'Se ha alcanzado el límite de uso del tutor con IA. Seguimos con preguntas de práctica.',
};

/** Decide entre el chat con modelo y el modo reducido, y avisa de por qué se degradó. */
export function PanelTutor() {
  const [modo, setModo] = useState<Modo | 'cargando'>('cargando');
  const [motivo, setMotivo] = useState<MotivoReducido>('sin-modelo');

  useEffect(() => {
    const control = new AbortController();
    void obtenerModo(control.signal).then((m) => {
      if (!control.signal.aborted) setModo(m);
    });
    return () => control.abort();
  }, []);

  function pasarAReducido(causa: MotivoReducido) {
    setMotivo(causa);
    setModo('reducido');
  }

  return (
    <div className="flex flex-col gap-4" data-modo-tutor={modo}>
      <h3 className="text-titular-xs">Comprueba lo que has aprendido</h3>
      <div className={`${CLASES_PANEL} flex flex-col gap-4 p-4 columnas:p-6`}>
        {modo === 'reducido' && <p className="text-saffron-spark">{AVISOS[motivo]}</p>}
        {modo === 'cargando' && <p className="text-silver-mist">Comprobando el tutor…</p>}
        {modo === 'modelo' && <TutorChat alReducido={pasarAReducido} />}
        {modo === 'reducido' && <TutorReducido />}
      </div>
    </div>
  );
}
