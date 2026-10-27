import { describe, expect, it } from 'vitest';
import { estaIgnorado, existe, leer } from './utils';

describe('GRV-01 · criterio 10: sin placeholders', () => {
  it.each(['AGENTS.md', 'DESIGN.md'])('%s no conserva marcas {{...}}', (archivo) => {
    expect(leer(archivo)).not.toContain('{{');
  });
});

describe('GRV-01 · criterio 11: entorno documentado', () => {
  const variables = ['GOOGLE_GENERATIVE_AI_API_KEY', 'LLM_PROVIDER', 'LLM_MODEL'];

  const valores = () =>
    Object.fromEntries(
      leer('.env.example')
        .split('\n')
        .map((linea) => linea.match(/^([A-Z][A-Z0-9_]*)=(.*)$/))
        .filter((coincidencia): coincidencia is RegExpMatchArray => coincidencia !== null)
        .map(([, nombre, valor]) => [nombre, (valor ?? '').trim()]),
    ) as Record<string, string>;

  it('existe .env.example', () => {
    expect(existe('.env.example')).toBe(true);
  });

  it.each(variables)('declara %s', (nombre) => {
    expect(Object.keys(valores())).toContain(nombre);
  });

  it('no contiene valores que parezcan una clave real', () => {
    const sospechosos = Object.entries(valores()).filter(([, valor]) =>
      /^(AIza|sk-|ghp_)|[A-Za-z0-9_-]{30,}/.test(valor),
    );
    expect(sospechosos).toEqual([]);
  });

  it('ignora .env en .gitignore', () => {
    expect(estaIgnorado('.env')).toBe(true);
  });
});

describe('GRV-01 · criterio 12: documentación mínima', () => {
  it('el README explica cómo ejecutarlo en local', () => {
    const readme = leer('README.md');
    expect(readme).toMatch(/npm (ci|install)/);
    expect(readme).toContain('npm run dev');
  });

  it('el README explica qué es la aplicación', () => {
    expect(leer('README.md')).toMatch(/tres cuerpos/i);
  });

  it.each(['docs/estado.md', 'docs/adr/0001-herramientas-y-estructura.md'])('existe %s', (ruta) => {
    expect(existe(ruta)).toBe(true);
  });
});
