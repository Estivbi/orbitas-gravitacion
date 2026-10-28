import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Line,
  Points,
  Scene,
  type Material,
} from 'three';
import { generarCampoAmbiental } from '@/lib/escena/ambiente';
import {
  construirEstelas,
  crearDatosEstelas,
  type DatosCuerpo,
  type DatosEstelas,
} from '@/lib/escena/estela';
import { VALORES_POR_ESTADO, estadoEn, type Estado, type Trayectoria } from '@/lib/fisica';
import type { PaletaEscena } from './colores';
import { crearMateriales } from './sombreadores';

const SEMILLA_AMBIENTE = 7;

export interface Composicion {
  escena: Scene;
  /** Coloca cuerpos y estelas en la fracción `u`; devuelve el estado (buffer reutilizado). */
  actualizar(u: number, longitudEstela: number): Estado;
  liberar(): void;
}

function atributoDinamico(valores: Float32Array, componentes: number): BufferAttribute {
  return new BufferAttribute(valores, componentes).setUsage(DynamicDrawUsage);
}

function colorUniforme(color: Color, cantidad: number): Float32Array {
  const valores = new Float32Array(3 * cantidad);
  for (let i = 0; i < cantidad; i++) color.toArray(valores, 3 * i);
  return valores;
}

function geometria(
  posiciones: BufferAttribute,
  alfas: BufferAttribute,
  colores: Float32Array,
): BufferGeometry {
  return new BufferGeometry()
    .setAttribute('position', posiciones)
    .setAttribute('aAlfa', alfas)
    .setAttribute('aColor', new BufferAttribute(colores, 3));
}

/** Geometrías de la estela de un cuerpo: posiciones y alfas comparten buffer con `DatosCuerpo`. */
function geometriasDeEstela(datos: DatosCuerpo, color: Color) {
  const vertices = datos.lineaAlfa.length;
  const marcas = datos.marcasAlfa.length;
  return {
    linea: geometria(
      atributoDinamico(datos.linea, 3),
      atributoDinamico(datos.lineaAlfa, 1),
      colorUniforme(color, vertices),
    ),
    marcas: geometria(
      atributoDinamico(datos.marcas, 3),
      atributoDinamico(datos.marcasAlfa, 1),
      colorUniforme(color, marcas),
    ),
  };
}

function geometriaDeCuerpos(posiciones: Float32Array, colores: Color[]): BufferGeometry {
  const valoresColor = new Float32Array(9);
  colores.forEach((color, i) => color.toArray(valoresColor, 3 * i));
  return geometria(
    atributoDinamico(posiciones, 3),
    new BufferAttribute(new Float32Array([1, 1, 1]), 1),
    valoresColor,
  );
}

function geometriaDeAmbiente(particulas: number, paleta: Color[]): BufferGeometry {
  const campo = generarCampoAmbiental(particulas, SEMILLA_AMBIENTE);
  const colores = new Float32Array(3 * particulas);
  campo.paleta.forEach((indice, i) => paleta[indice]!.toArray(colores, 3 * i));
  return geometria(
    new BufferAttribute(campo.posiciones, 3),
    new BufferAttribute(campo.alfas, 1),
    colores,
  );
}

function sinRecorte<T extends Line | Points>(objeto: T): T {
  objeto.frustumCulled = false;
  return objeto;
}

/** Cuerpos (punto con halo), estelas (polilínea y marcas triangulares) y campo ambiental. */
export function crearComposicion(
  trayectoria: Trayectoria,
  paleta: PaletaEscena,
  densidad: number,
  particulas: number,
): Composicion {
  const materiales = crearMateriales(densidad);
  const datos: DatosEstelas = crearDatosEstelas(trayectoria);
  const estado: Estado = new Float64Array(VALORES_POR_ESTADO);
  const posicionesCuerpos = new Float32Array(9);

  const geometriasCuerpos = geometriaDeCuerpos(posicionesCuerpos, paleta.cuerpos);
  const geometriasAmbiente = geometriaDeAmbiente(particulas, paleta.ambiente);
  const estelas = datos.map((cuerpo, i) => geometriasDeEstela(cuerpo, paleta.cuerpos[i]!));

  const escena = new Scene();
  escena.add(sinRecorte(new Points(geometriasAmbiente, materiales.ambiente)));
  for (const { linea, marcas } of estelas) {
    escena.add(sinRecorte(new Line(linea, materiales.linea)));
    escena.add(sinRecorte(new Points(marcas, materiales.marca)));
  }
  escena.add(sinRecorte(new Points(geometriasCuerpos, materiales.cuerpo)));

  function actualizar(u: number, longitudEstela: number): Estado {
    estadoEn(trayectoria, u, estado);
    for (let b = 0; b < 3; b++) {
      posicionesCuerpos[3 * b] = estado[2 * b]!;
      posicionesCuerpos[3 * b + 1] = estado[2 * b + 1]!;
    }
    geometriasCuerpos.getAttribute('position').needsUpdate = true;

    const usados = construirEstelas(trayectoria, u, longitudEstela, datos);
    estelas.forEach(({ linea, marcas }) => {
      linea.setDrawRange(0, usados.vertices);
      linea.getAttribute('position').needsUpdate = true;
      linea.getAttribute('aAlfa').needsUpdate = true;
      marcas.setDrawRange(0, usados.marcas);
      marcas.getAttribute('position').needsUpdate = true;
      marcas.getAttribute('aAlfa').needsUpdate = true;
    });
    return estado;
  }

  function liberar(): void {
    const geometrias = [
      geometriasCuerpos,
      geometriasAmbiente,
      ...estelas.flatMap((e) => [e.linea, e.marcas]),
    ];
    geometrias.forEach((geometria) => geometria.dispose());
    const lista: Material[] = Object.values(materiales);
    lista.forEach((material) => material.dispose());
  }

  return { escena, actualizar, liberar };
}
