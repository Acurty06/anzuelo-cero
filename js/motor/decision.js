// Regla de combinación entre el modelo y el motor de reglas.
//
// CONTRATO (documentado y probado en tests/decision.test.js):
//
//   1. El CLASIFICADOR decide la etiqueta phishing/legítimo. Esa etiqueta es la
//      que gobierna el veredicto que ve el usuario.
//   2. Las reglas aportan un PISO de cautela basado solo en evidencia dura que
//      el modelo no puede ver: peticiones de dinero o datos, enlaces acortados
//      y dominios que imitan una marca. El modelo solo lee palabras; no sabe
//      leer una URL.
//   3. El veredicto final es el MÁXIMO entre el nivel del modelo y ese piso.
//      Las reglas nunca pueden BAJAR el nivel que fijó el modelo.
//
// Es decir: ante desacuerdo la etiqueta final es la del modelo, y las reglas
// solo pueden hacer la respuesta más cautelosa, nunca más tranquilizadora.
// Por eso el sistema no se llama "híbrido" a secas: es un clasificador con
// piso de seguridad por reglas.

import { predecir } from "./modelo.js";
import { VEREDICTOS } from "./veredicto.js";

export const ETIQUETAS = { PHISHING: "phishing", LEGITIMO: "legitimo" };

// Umbral de decisión del modelo. 0.5 es el punto neutro del Naive Bayes; no se
// movió para ajustar métricas. Cualquier cambio exige una evaluación aparte,
// con datos distintos de los de prueba, y debe documentarse aquí.
export const UMBRAL = 0.5;
// Por encima de este valor el modelo está muy seguro y el veredicto sube a
// Peligroso. El puntaje NO está calibrado, así que esto es una banda de
// similitud, no una probabilidad real de fraude.
export const UMBRAL_ALTO = 0.85;

const ORDEN = [
  VEREDICTOS.SIN_SENALES,
  VEREDICTOS.NO_CONCLUYENTE,
  VEREDICTOS.SOSPECHOSO,
  VEREDICTOS.PELIGROSO,
];

const nivel = (veredicto) => ORDEN.indexOf(veredicto);
const subir = (a, b) => ORDEN[Math.max(nivel(a), nivel(b))];

// Señales que obligan a no dar el resultado más favorable.
const EVIDENCIA_PETICION = ["pide_pago", "pide_datos", "premio_con_pago", "solicitud_dinero_sin_pago"];
// Evidencia de enlace: el modelo no puede evaluarla porque solo ve texto.
const EVIDENCIA_ENLACE = ["dominio_imitacion", "enlace_acortado"];

/**
 * Decisión del modelo, aislada y pura para poder probarla sin interfaz.
 * @returns {{etiqueta: string, puntuacion: number, confianza: string, palabras: Array}}
 */
export function clasificarConModelo(modelo, texto, umbral = UMBRAL) {
  const p = predecir(modelo, texto);
  return {
    etiqueta: p.probabilidad >= umbral ? ETIQUETAS.PHISHING : ETIQUETAS.LEGITIMO,
    puntuacion: p.probabilidad,
    confianza: p.confianza,
    palabras: p.palabras,
    tokensConocidos: p.tokensConocidos,
    ejemplos: p.ejemplos,
  };
}

/** Nivel mínimo que imponen las reglas. Nunca baja nada; solo pone un suelo. */
export function pisoDeReglas(senales) {
  const tipos = (senales || []).map((s) => s.tipo);
  let piso = VEREDICTOS.SIN_SENALES;
  if (tipos.some((t) => EVIDENCIA_PETICION.includes(t))) {
    piso = subir(piso, VEREDICTOS.NO_CONCLUYENTE);
  }
  if (tipos.some((t) => EVIDENCIA_ENLACE.includes(t))) {
    piso = subir(piso, VEREDICTOS.SOSPECHOSO);
  }
  return piso;
}

/** Veredicto que corresponde a la decisión del modelo, antes del piso. */
export function veredictoDelModelo(decision) {
  if (decision.etiqueta !== ETIQUETAS.PHISHING) return VEREDICTOS.SIN_SENALES;
  return decision.puntuacion >= UMBRAL_ALTO ? VEREDICTOS.PELIGROSO : VEREDICTOS.SOSPECHOSO;
}

/**
 * Veredicto final. El modelo manda; las reglas solo suben.
 * @returns {{veredicto, base, piso, decision, reglasSubieron, desacuerdo}}
 */
export function decidir(modelo, texto, senales, umbral = UMBRAL) {
  const decision = clasificarConModelo(modelo, texto, umbral);
  const base = veredictoDelModelo(decision);
  const piso = pisoDeReglas(senales);
  const veredicto = subir(base, piso);

  return {
    veredicto,
    base,
    piso,
    decision,
    reglasSubieron: nivel(veredicto) > nivel(base),
    // El modelo dice que es legítimo pero las reglas tienen evidencia dura.
    desacuerdo: decision.etiqueta === ETIQUETAS.LEGITIMO && nivel(piso) > 0,
  };
}
