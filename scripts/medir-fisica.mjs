#!/usr/bin/env node
// Medición del motor de física con una reimplementación separada (GRV-02).
//
// Es una implementación aparte de RK4 con duplicación de paso, escrita sin importar nada de
// src/lib/fisica, para comprobar desde fuera los números de la spec y de los ADR 0002 y 0003:
// cierre de cada órbita, deriva de energía y momento angular, extremos, nodos y error de
// interpolación de tres estrategias. Si cambia el catálogo hay que actualizar los datos de aquí.
//
// Limitación: comparte el algoritmo con la librería (RK4 con duplicación de paso), así que detecta
// errores de implementación pero no de diseño. El diseño lo cubren las pruebas de conservación y
// la comparación con una referencia más fina.
//
// Uso: npm run medir:fisica

const TAU = 2 * Math.PI;
const OMEGA = Math.pow(3, -0.25);

const conVelocidad = (vx, vy) => [-1, 0, 1, 0, 0, 0, vx, vy, vx, vy, -2 * vx, -2 * vy];

function lagrange() {
  const estado = new Array(12).fill(0);
  for (let c = 0; c < 3; c++) {
    const a = Math.PI / 2 + (c * TAU) / 3;
    estado[2 * c] = Math.cos(a);
    estado[2 * c + 1] = Math.sin(a);
    estado[6 + 2 * c] = -OMEGA * Math.sin(a);
    estado[7 + 2 * c] = OMEGA * Math.cos(a);
  }
  return estado;
}

const ORBITAS = [
  ['lagrange', TAU * Math.pow(3, 0.25), lagrange()],
  ['figura-de-ocho', 6.32591398, conVelocidad(0.34711689, 0.53272494)],
  ['butterfly-i', 6.2356, conVelocidad(0.30689, 0.12551)],
  ['goggles', 10.4668, conVelocidad(0.0833, 0.12789)],
  ['moth-i', 14.8939, conVelocidad(0.46444, 0.39606)],
  ['yin-yang-i', 17.3284, conVelocidad(0.51394, 0.30474)],
];

function derivada(y, salida) {
  salida.set(y.subarray(6), 0);
  salida.fill(0, 6);
  for (let a = 0; a < 3; a++) {
    for (let b = a + 1; b < 3; b++) {
      const dx = y[2 * b] - y[2 * a];
      const dy = y[2 * b + 1] - y[2 * a + 1];
      const r2 = dx * dx + dy * dy;
      const k = 1 / (r2 * Math.sqrt(r2));
      salida[6 + 2 * a] += dx * k;
      salida[7 + 2 * a] += dy * k;
      salida[6 + 2 * b] -= dx * k;
      salida[7 + 2 * b] -= dy * k;
    }
  }
}

function paso(y, h, t) {
  const { k1, k2, k3, k4, s } = t;
  derivada(y, k1);
  for (let i = 0; i < 12; i++) s[i] = y[i] + 0.5 * h * k1[i];
  derivada(s, k2);
  for (let i = 0; i < 12; i++) s[i] = y[i] + 0.5 * h * k2[i];
  derivada(s, k3);
  for (let i = 0; i < 12; i++) s[i] = y[i] + h * k3[i];
  derivada(s, k4);
  for (let i = 0; i < 12; i++) y[i] += (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
}

const limitar = (x, a, b) => Math.min(b, Math.max(a, x));

/** Integra un periodo y devuelve los pasos aceptados como nodos { tiempos, estados }. */
function integrar(estadoInicial, periodo, tolerancia, pasoMaximo) {
  const trabajo = Object.fromEntries(
    ['k1', 'k2', 'k3', 'k4', 's'].map((n) => [n, new Float64Array(12)]),
  );
  const y = Float64Array.from(estadoInicial);
  const yA = new Float64Array(12);
  const yB = new Float64Array(12);
  const tiempos = [0];
  const estados = [Float64Array.from(y)];
  let t = 0;
  let h = pasoMaximo / 8;
  while (t < periodo) {
    const ultimo = h >= periodo - t;
    const dt = ultimo ? periodo - t : h;
    yA.set(y);
    paso(yA, dt, trabajo);
    yB.set(y);
    paso(yB, dt / 2, trabajo);
    paso(yB, dt / 2, trabajo);
    let error = 0;
    for (let i = 0; i < 12; i++) error = Math.max(error, Math.abs(yA[i] - yB[i]));
    if (error <= tolerancia) {
      t = ultimo ? periodo : t + dt;
      y.set(yB);
      tiempos.push(t);
      estados.push(Float64Array.from(y));
    }
    h = Math.min(
      dt * limitar(0.9 * Math.pow(tolerancia / Math.max(error, 1e-300), 0.2), 0.3, 2),
      pasoMaximo,
    );
  }
  return { tiempos, estados, periodo };
}

function evaluar(nodos, tiempo, modo) {
  let bajo = 0;
  let alto = nodos.tiempos.length - 1;
  while (alto - bajo > 1) {
    const medio = (bajo + alto) >> 1;
    if (nodos.tiempos[medio] <= tiempo) bajo = medio;
    else alto = medio;
  }
  const a = nodos.estados[bajo];
  const b = nodos.estados[alto];
  const h = nodos.tiempos[alto] - nodos.tiempos[bajo];
  const s = (tiempo - nodos.tiempos[bajo]) / h;
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1;
  const h10 = s ** 3 - 2 * s ** 2 + s;
  const h01 = -2 * s ** 3 + 3 * s ** 2;
  const h11 = s ** 3 - s ** 2;
  const salida = new Float64Array(12);
  for (let k = 0; k < 6; k++) {
    salida[k] =
      modo === 'lineal'
        ? a[k] + (b[k] - a[k]) * s
        : h00 * a[k] + h10 * h * a[6 + k] + h01 * b[k] + h11 * h * b[6 + k];
    salida[6 + k] = a[6 + k] + (b[6 + k] - a[6 + k]) * s;
  }
  return salida;
}

const distancia = (y, a, b) => Math.hypot(y[2 * a] - y[2 * b], y[2 * a + 1] - y[2 * b + 1]);
const distanciaMinima = (y) => Math.min(distancia(y, 0, 1), distancia(y, 0, 2), distancia(y, 1, 2));
const velocidadMaxima = (y) =>
  Math.max(...[0, 1, 2].map((c) => Math.hypot(y[6 + 2 * c], y[7 + 2 * c])));
const momentoLineal = (y) => Math.hypot(y[6] + y[8] + y[10], y[7] + y[9] + y[11]);
const momentoAngular = (y) =>
  [0, 1, 2].reduce((suma, c) => suma + y[2 * c] * y[7 + 2 * c] - y[2 * c + 1] * y[6 + 2 * c], 0);

function energia(y) {
  const cinetica = 0.5 * y.slice(6).reduce((suma, v) => suma + v * v, 0);
  return cinetica - (1 / distancia(y, 0, 1) + 1 / distancia(y, 0, 2) + 1 / distancia(y, 1, 2));
}

const maximo = (nodos, f) => Math.max(...nodos.estados.map(f));
const sci = (x) => x.toExponential(1);

function errorDePosicion(nodos, referencia, modo, muestras = 7200) {
  let peor = 0;
  for (let j = 0; j < muestras; j++) {
    const t = ((j + 0.37) * referencia.periodo) / muestras;
    const a = evaluar(nodos, t, modo);
    const b = evaluar(referencia, t, 'hermite');
    for (let k = 0; k < 6; k++) peor = Math.max(peor, Math.abs(a[k] - b[k]));
  }
  return peor;
}

console.log('Órbita          | cierre  | máx|ΔE| | máx|ΔL| | máx|P|  | d. mín. | v. máx. | nodos');
const filasInterpolacion = [];
for (const [slug, periodo, inicial] of ORBITAS) {
  const nodos = integrar(inicial, periodo, 1e-10, periodo / 720);
  const final = nodos.estados.at(-1);
  const cierre = Math.max(...inicial.map((v, i) => Math.abs(final[i] - v)));
  const e0 = energia(nodos.estados[0]);
  const l0 = momentoAngular(nodos.estados[0]);
  console.log(
    [
      slug.padEnd(15),
      sci(cierre),
      sci(maximo(nodos, (y) => Math.abs(energia(y) - e0))),
      sci(maximo(nodos, (y) => Math.abs(momentoAngular(y) - l0))),
      sci(maximo(nodos, momentoLineal)),
      Math.min(...nodos.estados.map(distanciaMinima))
        .toFixed(4)
        .padEnd(7),
      Math.max(...nodos.estados.map(velocidadMaxima))
        .toFixed(4)
        .padEnd(7),
      nodos.tiempos.length,
    ].join(' | '),
  );

  const referencia = integrar(inicial, periodo, 1e-13, periodo / 7200);
  // Rejilla uniforme del planteamiento inicial: n intervalos iguales, integrados con precisión hasta cada instante.
  const uniforme = (n) => {
    const duracion = periodo / n;
    const tiempos = Array.from({ length: n + 1 }, (_, k) => k * duracion);
    const estados = [Float64Array.from(inicial)];
    for (let k = 1; k <= n; k++) {
      estados.push(integrar(estados[k - 1], duracion, 1e-13, duracion / 8).estados.at(-1));
    }
    return { tiempos, estados, periodo };
  };
  filasInterpolacion.push([
    slug.padEnd(15),
    sci(errorDePosicion(uniforme(720), referencia, 'lineal')),
    sci(errorDePosicion(uniforme(2880), referencia, 'hermite')),
    sci(errorDePosicion({ ...nodos, periodo }, referencia, 'hermite')),
  ]);
}

console.log(
  '\nError máximo de posición entre muestras, frente a una referencia de tolerancia 1e-13',
);
console.log(
  'Órbita          | 720 uniformes + lineal | 2880 uniformes + Hermite | pasos adaptativos + Hermite',
);
for (const fila of filasInterpolacion) console.log(fila.join(' | '));
