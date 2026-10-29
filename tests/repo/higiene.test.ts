import { describe, expect, it } from 'vitest';
import { archivosVersionados, existe, leer } from './utils';

const listaPrivada = 'docs/privado/terminos-privacidad.txt';

describe('GRV-01 · criterio 9: privado fuera del repositorio', () => {
  it('no versiona nada bajo docs/privado/', () => {
    const versionados = archivosVersionados().filter((ruta) => ruta.startsWith('docs/privado/'));
    expect(versionados).toEqual([]);
  });

  it('ignora docs/privado/ en .gitignore', () => {
    const lineas = leer('.gitignore')
      .split('\n')
      .map((linea) => linea.trim());
    expect(lineas).toContain('docs/privado/');
  });
});

describe.skipIf(!existe(listaPrivada))('GRV-01 · criterio 13: neutralidad', () => {
  const excluidos = ['docs/diseno/referencia/', 'package-lock.json'];

  it('ningún archivo versionado contiene términos de la lista privada', () => {
    const terminos = leer(listaPrivada)
      .split('\n')
      .map((linea) => linea.trim().toLowerCase())
      .filter(Boolean);
    const hallazgos = archivosVersionados()
      .filter((ruta) => !excluidos.some((prefijo) => ruta.startsWith(prefijo)))
      .flatMap((ruta) => {
        const texto = leer(ruta).toLowerCase();
        return terminos.filter((termino) => texto.includes(termino)).map((t) => `${ruta}: ${t}`);
      });
    expect(hallazgos).toEqual([]);
  });
});
