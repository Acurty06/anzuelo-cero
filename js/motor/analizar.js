// Función principal del motor. Pura: no lee archivos ni toca el DOM.
// analizar(entrada, respuestas, config) -> resultado

import { normalizar } from "./paginas.js";
import { detectarSenales } from "./senales.js";
import { calcularVeredicto, requiereVerificacion, VEREDICTOS } from "./veredicto.js";

const MAX_PREGUNTAS = 2;

// Tope de entrada. Por encima de esto no hay nada que ganar: el texto deja de
// ser un mensaje y los detectores (regex, Levenshtein) degradan la interfaz.
export const MAX_CARACTERES = 5000;
export const MAX_URL = 2000;

// Qué pregunta de seguimiento corresponde según las señales.
function preguntasPara(senales, config) {
  const tipos = senales.map((s) => s.tipo);
  if (tipos.includes("solicitud_dinero_sin_pago")) {
    return ["numero_guardado", "confirmo_otro_medio"];
  }
  if (tipos.includes("menciona_enlace") || tipos.includes("dominio_desconocido")) {
    return ["esperado"];
  }
  return [];
}

// Ajuste de puntaje por respuestas de seguimiento (tabla de reglas del PRD).
function ajusteRespuestas(respuestas, config) {
  const p = config.puntos;
  let ajuste = 0;
  const aplicadas = [];
  if (respuestas.numero_guardado === false) {
    ajuste += p.seguimiento_no_guardado;
    aplicadas.push("numero_guardado:no");
  } else if (respuestas.numero_guardado === true) {
    ajuste += p.seguimiento_guardado;
    aplicadas.push("numero_guardado:si");
  }
  if (respuestas.confirmo_otro_medio === true) {
    ajuste += p.seguimiento_confirmado_otro_medio;
    aplicadas.push("confirmo_otro_medio:si");
  }
  if (respuestas.esperado === true) {
    ajuste += p.seguimiento_esperado;
    aplicadas.push("esperado:si");
  } else if (respuestas.esperado === false) {
    ajuste += p.seguimiento_no_esperado;
    aplicadas.push("esperado:no");
  }
  return { ajuste, aplicadas };
}

export function analizar(entrada, respuestas = {}, config) {
  const texto = (entrada && entrada.texto) || "";
  const url = (entrada && entrada.url) || "";
  const textoNorm = normalizar(texto);

  if (!textoNorm.trim() && !url.trim()) {
    return { error: "Pega un mensaje o una dirección para analizar." };
  }

  if (texto.length > MAX_CARACTERES) {
    return { error: `El mensaje supera los ${MAX_CARACTERES} caracteres. Pega solo la parte sospechosa.` };
  }
  if (url.length > MAX_URL) {
    return { error: `La dirección supera los ${MAX_URL} caracteres y no parece un enlace válido.` };
  }

  const senales = detectarSenales(textoNorm, url, config);
  const base = senales.reduce((suma, s) => suma + s.puntos, 0);

  // Paso 1: si el caso es ambiguo y faltan preguntas, se preguntan ANTES de dar veredicto.
  // Así el usuario nunca ve un veredicto que luego cambie con sus respuestas.
  const preliminar = calcularVeredicto(Math.max(0, base), senales, config);
  if (preliminar === VEREDICTOS.NO_CONCLUYENTE) {
    const candidatas = preguntasPara(senales, config);
    const pendientes = candidatas.filter((id) => !(id in respuestas));
    const respondidas = candidatas.length - pendientes.length;
    if (pendientes.length && respondidas < MAX_PREGUNTAS) {
      const id = pendientes[0];
      const total = Math.min(candidatas.length, MAX_PREGUNTAS);
      return {
        fase: "preguntas",
        veredicto: null,
        puntaje: null,
        senales,
        ajustesAplicados: [],
        pregunta: { id, texto: config.preguntas[id], indice: respondidas + 1, total },
        requiereVerificacion: requiereVerificacion(senales),
      };
    }
  }

  // Paso 2: con todas las respuestas, se calcula el veredicto final una sola vez.
  const { ajuste, aplicadas } = ajusteRespuestas(respuestas, config);
  const puntaje = Math.max(0, base + ajuste);
  const veredicto = calcularVeredicto(puntaje, senales, config);

  return {
    fase: "final",
    puntaje,
    veredicto,
    senales,
    ajustesAplicados: aplicadas,
    pregunta: null,
    requiereVerificacion: requiereVerificacion(senales),
  };
}
