import { AdditiveBlending, ShaderMaterial } from 'three';

const VERTICE = /* glsl */ `
  attribute vec3 aColor;
  attribute float aAlfa;
  uniform float uTamano;
  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    vColor = aColor;
    vAlfa = aAlfa;
    gl_PointSize = uTamano;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Polilínea de la estela: tenue, para que mande el contorno de las marcas. */
const FRAGMENTO_LINEA = /* glsl */ `
  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    gl_FragColor = vec4(vColor, vAlfa * 0.35);
  }
`;

/** Cuerpo: núcleo sólido con un halo radial que se apaga hacia el borde del punto. */
const FRAGMENTO_CUERPO = /* glsl */ `
  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float nucleo = 1.0 - smoothstep(0.3, 0.38, d);
    float halo = 0.45 * pow(1.0 - d, 2.0);
    gl_FragColor = vec4(vColor, max(nucleo, halo) * vAlfa);
  }
`;

/** Contorno fino de un triángulo equilátero, por distancia con signo dentro del punto. */
const FRAGMENTO_TRIANGULO = /* glsl */ `
  varying vec3 vColor;
  varying float vAlfa;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    p.y = -p.y;
    vec2 q = vec2(p.x * 1.25, p.y * 1.25 + 0.29);
    float k = 1.7320508;
    q.x = abs(q.x) - 1.0;
    q.y = q.y + 1.0 / k;
    if (q.x + k * q.y > 0.0) q = vec2(q.x - k * q.y, -k * q.x - q.y) / 2.0;
    q.x -= clamp(q.x, -2.0, 0.0);
    float d = -length(q) * sign(q.y);
    float a = 1.0 - smoothstep(0.04, 0.15, abs(d));
    if (a < 0.01) discard;
    gl_FragColor = vec4(vColor, vAlfa * a);
  }
`;

/** Tamaños de punto en píxeles CSS; se multiplican por la densidad de píxeles. */
const TAMANO_CUERPO = 28;
const TAMANO_MARCA = 9;
const TAMANO_AMBIENTE = 7;

export interface Materiales {
  linea: ShaderMaterial;
  cuerpo: ShaderMaterial;
  marca: ShaderMaterial;
  ambiente: ShaderMaterial;
}

function crearMaterial(fragmento: string, tamano: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTICE,
    fragmentShader: fragmento,
    uniforms: { uTamano: { value: tamano } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: AdditiveBlending,
  });
}

/** Todo se dibuja con brillo aditivo sobre el fondo negro. */
export function crearMateriales(densidad: number): Materiales {
  return {
    linea: crearMaterial(FRAGMENTO_LINEA, 1),
    cuerpo: crearMaterial(FRAGMENTO_CUERPO, TAMANO_CUERPO * densidad),
    marca: crearMaterial(FRAGMENTO_TRIANGULO, TAMANO_MARCA * densidad),
    ambiente: crearMaterial(FRAGMENTO_TRIANGULO, TAMANO_AMBIENTE * densidad),
  };
}
