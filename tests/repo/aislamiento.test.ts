import { join } from 'node:path';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { raiz } from './utils';

const archivoDeLib = 'src/lib/fisica/ejemplo.ts';
const archivoDelWorker = 'src/workers/fisica.worker.ts';

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: raiz });
});

async function reglasInfringidas(codigo: string, ruta: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(codigo, { filePath: join(raiz, ruta) });
  return (resultado?.messages ?? []).map((mensaje) => mensaje.ruleId ?? 'sintaxis');
}

describe('GRV-02 · criterio 18: aislamiento de src/lib', () => {
  it.each(['react', 'next/link', 'three'])('prohíbe importar %s', async (modulo) => {
    const reglas = await reglasInfringidas(
      `import * as dependencia from '${modulo}';\nexport { dependencia };\n`,
      archivoDeLib,
    );
    expect(reglas).toContain('no-restricted-imports');
  });

  it.each([
    ['window', 'export const ancho = window.innerWidth;\n'],
    ['document', 'export const titulo = document.title;\n'],
    ['Worker', "export const trabajador = new Worker('ruta');\n"],
  ])('prohíbe el global %s', async (_nombre, codigo) => {
    expect(await reglasInfringidas(codigo, archivoDeLib)).toContain('no-restricted-globals');
  });

  it('permite el código puro y las importaciones relativas', async () => {
    const reglas = await reglasInfringidas(
      "export { energia } from './metricas';\nexport const raiz = Math.sqrt(4);\n",
      archivoDeLib,
    );
    expect(reglas).not.toContain('no-restricted-imports');
    expect(reglas).not.toContain('no-restricted-globals');
  });
});

describe('GRV-02 · criterio 18: aislamiento del Worker', () => {
  it('permite importar solo @/lib/fisica y ./protocolo', async () => {
    const codigo = [
      "import { integrarPeriodo } from '@/lib/fisica';",
      "import { manejarPeticion } from './protocolo';",
      'export const usados = [integrarPeriodo, manejarPeticion];',
      '',
    ].join('\n');
    expect(await reglasInfringidas(codigo, archivoDelWorker)).not.toContain(
      'no-restricted-imports',
    );
  });

  it.each(['react', 'three', '@/lib/fisica/integrador', '../lib/fisica'])(
    'prohíbe importar %s',
    async (modulo) => {
      const reglas = await reglasInfringidas(
        `import * as dependencia from '${modulo}';\nexport { dependencia };\n`,
        archivoDelWorker,
      );
      expect(reglas).toContain('no-restricted-imports');
    },
  );
});
