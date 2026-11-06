// Clasificador Naive Bayes multinomial, entrenable e incremental.
// Es un modelo real de aprendizaje automático, pero NO es caja negra:
// expone el peso de cada palabra, así que todo veredicto se puede explicar.
// Módulo puro: no toca el DOM ni la red.

import { normalizar } from "./paginas.js";

const ALFA = 1; // suavizado de Laplace
const MIN_LONGITUD = 3;

// Palabras vacías: aparecen en todo y solo añaden ruido.
const VACIAS = new Set([
  "que", "los", "las", "del", "por", "para", "con", "una", "uno", "sus", "como",
  "este", "esta", "esto", "esos", "esas", "pero", "mas", "muy", "son", "fue",
  "han", "hay", "sin", "sobre", "entre", "desde", "hasta", "tambien", "donde",
  "cuando", "porque", "todo", "toda", "todos", "todas", "ser", "estar", "tiene",
  "tienes", "tengo", "puede", "puedes", "aqui", "alli", "ese", "esa",
]);

/**
 * Convierte un texto en la lista de piezas que el modelo cuenta.
 * Además de palabras, añade marcas del formato: montos, enlaces y cifras.
 */
export function tokenizar(texto) {
  const norm = normalizar(texto || "");
  const tokens = [];

  for (const palabra of norm.split(/[^a-z0-9ñ]+/)) {
    if (!palabra || palabra.length < MIN_LONGITUD) continue;
    if (VACIAS.has(palabra)) continue;
    // Las cifras sueltas se agrupan: importa que haya un número, no cuál.
    tokens.push(/^\d+$/.test(palabra) ? "«cifra»" : palabra);
  }

  if (/\$\s?\d|\b\d+\s?(k|mil|millones)\b/.test(norm)) tokens.push("«monto»");
  if (/https?:\/\/|www\.|\.(com|co|net|online|xyz|info)\b/.test(norm)) tokens.push("«enlace»");
  if (norm.length < 60) tokens.push("«corto»");

  return tokens;
}

/**
 * Entrena desde cero con una lista de { t: texto, e: 1|0 }.
 * Devuelve el modelo, que es un objeto de datos simple y serializable.
 */
export function entrenar(ejemplos) {
  const conteo = [Object.create(null), Object.create(null)]; // [legítimo, phishing]
  const totalTokens = [0, 0];
  const docs = [0, 0];
  const vocabulario = new Set();

  for (const ej of ejemplos) {
    const clase = ej.e === 1 ? 1 : 0;
    docs[clase] += 1;
    for (const tok of tokenizar(ej.t)) {
      conteo[clase][tok] = (conteo[clase][tok] || 0) + 1;
      totalTokens[clase] += 1;
      vocabulario.add(tok);
    }
  }

  return { conteo, totalTokens, docs, vocabulario: [...vocabulario], ejemplos: docs[0] + docs[1] };
}

// log P(token | clase) con suavizado de Laplace.
function logProb(modelo, token, clase) {
  const v = modelo.vocabulario.length;
  const c = modelo.conteo[clase][token] || 0;
  return Math.log((c + ALFA) / (modelo.totalTokens[clase] + ALFA * v));
}

/**
 * Predice sobre un texto.
 * Devuelve la probabilidad de phishing, la confianza (según cuántos ejemplos
 * conoce y cuántas palabras reconoció) y las palabras que más pesaron.
 */
export function predecir(modelo, texto) {
  const tokens = tokenizar(texto);
  const total = modelo.docs[0] + modelo.docs[1];

  if (!total || !tokens.length) {
    return { probabilidad: 0.5, confianza: "ninguna", palabras: [], tokensConocidos: 0, ejemplos: total };
  }

  let logLegitimo = Math.log(modelo.docs[0] / total);
  let logPhishing = Math.log(modelo.docs[1] / total);
  const pesos = [];
  let conocidos = 0;

  for (const tok of tokens) {
    const pL = logProb(modelo, tok, 0);
    const pP = logProb(modelo, tok, 1);
    logLegitimo += pL;
    logPhishing += pP;

    const visto = (modelo.conteo[0][tok] || 0) + (modelo.conteo[1][tok] || 0);
    if (visto > 0) {
      conocidos += 1;
      pesos.push({ palabra: tok, peso: pP - pL });
    }
  }

  // Softmax estable entre las dos clases.
  const mayor = Math.max(logLegitimo, logPhishing);
  const eL = Math.exp(logLegitimo - mayor);
  const eP = Math.exp(logPhishing - mayor);
  const probabilidad = eP / (eL + eP);

  pesos.sort((a, b) => Math.abs(b.peso) - Math.abs(a.peso));

  return {
    probabilidad,
    confianza: nivelConfianza(total, conocidos),
    palabras: pesos.slice(0, 6),
    tokensConocidos: conocidos,
    ejemplos: total,
  };
}

// La confianza es baja a propósito mientras haya pocos datos: preferimos
// decirlo antes que aparentar una certeza que el modelo no tiene.
export function nivelConfianza(ejemplos, tokensConocidos) {
  if (ejemplos < 60 || tokensConocidos < 2) return "baja";
  if (ejemplos < 300 || tokensConocidos < 4) return "media";
  return "alta";
}

/** Añade un ejemplo a un modelo ya entrenado, sin reentrenar todo. */
export function aprender(modelo, texto, etiqueta) {
  const clase = etiqueta === 1 ? 1 : 0;
  const vocab = new Set(modelo.vocabulario);
  modelo.docs[clase] += 1;
  for (const tok of tokenizar(texto)) {
    modelo.conteo[clase][tok] = (modelo.conteo[clase][tok] || 0) + 1;
    modelo.totalTokens[clase] += 1;
    vocab.add(tok);
  }
  modelo.vocabulario = [...vocab];
  modelo.ejemplos = modelo.docs[0] + modelo.docs[1];
  return modelo;
}

/**
 * Evaluación con partición de entrenamiento y prueba.
 * Sirve para reportar desempeño honestamente, no sobre los mismos datos
 * con los que se entrenó.
 */
export function evaluar(ejemplos, proporcionPrueba = 0.3, semilla = 7) {
  // Barajado determinista para que el resultado sea reproducible.
  const datos = [...ejemplos];
  let s = semilla;
  for (let i = datos.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [datos[i], datos[j]] = [datos[j], datos[i]];
  }

  const corte = Math.floor(datos.length * (1 - proporcionPrueba));
  const modelo = entrenar(datos.slice(0, corte));
  const prueba = datos.slice(corte);

  let vp = 0, vn = 0, fp = 0, fn = 0;
  for (const ej of prueba) {
    const p = predecir(modelo, ej.t).probabilidad >= 0.5 ? 1 : 0;
    if (ej.e === 1 && p === 1) vp += 1;
    else if (ej.e === 0 && p === 0) vn += 1;
    else if (ej.e === 0 && p === 1) fp += 1;
    else fn += 1;
  }

  const total = prueba.length || 1;
  return {
    n: prueba.length,
    exactitud: (vp + vn) / total,
    precision: vp + fp ? vp / (vp + fp) : 0,
    sensibilidad: vp + fn ? vp / (vp + fn) : 0,
    vp, vn, fp, fn,
  };
}
