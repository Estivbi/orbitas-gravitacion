import { describe, expect, it } from 'vitest';
import { archivosVersionados, leer } from './utils';

const CLAVE = 'GOOGLE_GENERATIVE_AI_API_KEY';
const PREFIJOS_CLIENTE = ['src/components/', 'src/store/', 'src/app/'];
const EXCLUIDO = 'src/app/api/';

/** Archivos del cliente (todo src/app/ salvo api/) que mencionan la clave. */
export function conClaveEnCliente(rutas: string[], contenido: (ruta: string) => string): string[] {
  return rutas
    .filter((r) => PREFIJOS_CLIENTE.some((p) => r.startsWith(p)) && !r.startsWith(EXCLUIDO))
    .filter((r) => contenido(r).includes(CLAVE));
}

describe('GRV tutor: la clave del modelo solo vive en el servidor', () => {
  it('detecta la clave en cliente y respeta src/app/api/', () => {
    const contenidos: Record<string, string> = {
      'src/components/a.tsx': `x ${CLAVE}`,
      'src/store/b.ts': 'limpio',
      'src/app/api/tutor/route.ts': CLAVE,
      'src/lib/tutor/modo.ts': CLAVE,
    };
    expect(conClaveEnCliente(Object.keys(contenidos), (r) => contenidos[r]!)).toEqual([
      'src/components/a.tsx',
    ]);
  });

  it('ningún archivo de src/components/, src/store/ ni src/app/ (salvo api/) la contiene', () => {
    expect(conClaveEnCliente(archivosVersionados(), leer)).toEqual([]);
  });
});
