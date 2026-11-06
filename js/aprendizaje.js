// Capa de aprendizaje: carga el corpus semilla, suma lo que la persona etiqueta
// y pinta cómo decidió el modelo en la pantalla de detección.
// La etiqueta final la decide el clasificador (js/motor/decision.js); esta capa
// solo lo muestra y recoge correcciones.
//
// PRIVACIDAD: el análisis normal nunca guarda nada. Solo cuando la persona
// pulsa un botón de corrección se guarda ese texto, y únicamente en su propio
// navegador (localStorage). Nunca sale de ahí.

import { entrenar, predecir, aprender, evaluar } from "./motor/modelo.js";

const $ = (id) => document.getElementById(id);
const CLAVE = "anzuelo_cero_ejemplos";
const TOPE = 500;
// Un mismo texto no puede repetirse indefinidamente: repetirlo es la forma
// más barata de envenenar el modelo local. Con el tope, 20 correcciones
// idénticas pesan lo mismo que dos.
const TOPE_POR_TEXTO = 2;

let modelo = null;
let semilla = [];
let ultimoTexto = "";

/* ---------- ejemplos propios ---------- */

function leerPropios() {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE) || "[]");
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

function guardarPropios(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista.slice(-TOPE)));
  } catch (_) {
    // Sin almacenamiento el modelo sigue funcionando con la semilla.
  }
}

/* ---------- carga y entrenamiento ---------- */

/** El modelo entrenado, o null si el corpus no se pudo cargar. */
export function modeloActual() {
  return modelo;
}

export async function cargarModelo() {
  const r = await fetch("config/corpus-semilla.json");
  if (!r.ok) throw new Error("No se pudo cargar el corpus");
  const corpus = await r.json();
  semilla = corpus.mensajes || [];

  modelo = entrenar([...semilla, ...leerPropios()]);
  return modelo;
}

function reentrenar() {
  modelo = entrenar([...semilla, ...leerPropios()]);
  pintarEstado();
}

/* ---------- pintado ---------- */

const TEXTO_CONFIANZA = {
  baja: "confianza baja: el modelo conoce pocos ejemplos o pocas palabras de este mensaje",
  media: "confianza media",
  alta: "confianza alta",
};

// El puntaje del Naive Bayes NO está calibrado: tiende a valores extremos
// (0% o 100%) aunque el caso sea dudoso. Se presenta como similitud con el
// corpus, nunca como probabilidad de fraude.
const BANDAS = [
  { min: 0.85, texto: "muy parecido a los phishing del corpus" },
  { min: 0.6, texto: "más parecido a phishing que a legítimo" },
  { min: 0.4, texto: "no se parece claramente a ninguno de los dos" },
  { min: 0.15, texto: "más parecido a legítimo que a phishing" },
  { min: 0, texto: "muy parecido a los mensajes legítimos del corpus" },
];

function banda(p) {
  return BANDAS.find((b) => p >= b.min).texto;
}

function pintarEstado() {
  const propios = leerPropios().length;
  $("modelo-estado").textContent = propios
    ? `Entrenado con ${semilla.length} ejemplos de la semilla y ${propios} que has etiquetado tú.`
    : `Entrenado con ${semilla.length} ejemplos de la semilla. Todavía no le has enseñado ninguno.`;
  $("modelo-borrar").hidden = propios === 0;
}

export function pintarOpinion(texto, veredictoReglas) {
  const caja = $("modelo-caja");
  if (!modelo) { caja.hidden = true; return; }

  ultimoTexto = texto;
  caja.hidden = false;

  const p = predecir(modelo, texto);
  const pct = Math.round(p.probabilidad * 100);

  $("modelo-barra").style.width = `${pct}%`;
  $("modelo-barra").className = `modelo-relleno ${pct >= 50 ? "alto" : "bajo"}`;
  $("modelo-pct").textContent = `${pct}%`;
  $("modelo-confianza").textContent = `${banda(p.probabilidad)} · ${TEXTO_CONFIANZA[p.confianza] || ""}`;

  // Palabras que empujaron la decisión, con su dirección.
  const chips = $("modelo-palabras");
  chips.innerHTML = "";
  if (!p.palabras.length) {
    const s = document.createElement("span");
    s.className = "chip";
    s.textContent = "Ninguna palabra conocida en este mensaje";
    chips.appendChild(s);
  }
  for (const w of p.palabras) {
    const s = document.createElement("span");
    s.className = `chip chip-peso ${w.peso > 0 ? "sube" : "baja"}`;
    s.textContent = `${w.palabra} ${w.peso > 0 ? "↑" : "↓"}`;
    s.title = `Peso ${w.peso.toFixed(2)} hacia ${w.peso > 0 ? "phishing" : "legítimo"}`;
    chips.appendChild(s);
  }

  // El aviso de desacuerdo lo pinta app.js junto al veredicto, porque ahora
  // depende de la regla de combinación y no solo de esta tarjeta.
  $("modelo-desacuerdo").hidden = true;

  $("modelo-gracias").hidden = true;
  $("modelo-botones").hidden = false;
  pintarEstado();
}

/* ---------- corrección del usuario ---------- */

function enseñar(etiqueta) {
  if (!ultimoTexto.trim()) return;
  const propios = leerPropios();
  const clave = ultimoTexto.trim().toLowerCase();
  const repetidos = propios.filter((e) => e.t.trim().toLowerCase() === clave).length;

  $("modelo-botones").hidden = true;
  $("modelo-gracias").hidden = false;

  if (repetidos >= TOPE_POR_TEXTO) {
    $("modelo-gracias").textContent =
      `Este mensaje ya lo corregiste ${repetidos} veces y no lo vuelvo a contar. ` +
      "Repetir el mismo ejemplo no enseña más, solo desbalancea el modelo.";
    return;
  }

  propios.push({ t: ultimoTexto, e: etiqueta });
  guardarPropios(propios);
  modelo = aprender(modelo, ultimoTexto, etiqueta);

  $("modelo-gracias").textContent = etiqueta === 1
    ? "Listo, lo guardé como phishing. El modelo ya lo tuvo en cuenta."
    : "Listo, lo guardé como legítimo. El modelo ya lo tuvo en cuenta.";
  pintarEstado();
}

function borrarAprendido() {
  try { localStorage.removeItem(CLAVE); } catch (_) { /* sin almacenamiento */ }
  reentrenar();
  $("modelo-gracias").hidden = false;
  $("modelo-gracias").textContent = "Borré todo lo que le habías enseñado. Volvió a la semilla.";
}

export function iniciarAprendizaje() {
  pintarEstado();
  $("modelo-si").addEventListener("click", () => enseñar(1));
  $("modelo-no").addEventListener("click", () => enseñar(0));
  $("modelo-borrar").addEventListener("click", borrarAprendido);

  // Desempeño honesto: se mide sobre ejemplos que el modelo no vio al entrenar.
  $("modelo-evaluar").addEventListener("click", () => {
    const r = evaluar([...semilla, ...leerPropios()], 0.3);
    $("modelo-metricas").hidden = false;
    $("modelo-metricas").textContent =
      `Sobre ${r.n} ejemplos apartados (que no vio al entrenar): ` +
      `${(r.exactitud * 100).toFixed(1)}% de aciertos, ` +
      `${(r.sensibilidad * 100).toFixed(1)}% de los phishing detectados, ` +
      `${r.fp} legítimos marcados por error.`;
  });
}
