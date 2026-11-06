// Arranque de la app: navegación entre pilares y pantalla de detección.
// Toda la lógica de análisis vive en js/motor/.

import { analizar } from "./motor/analizar.js";
import { recomendar } from "./motor/recomendaciones.js";
import { VEREDICTOS } from "./motor/veredicto.js";
import { guardarSiPrueba } from "./registro.js";
import { iniciarPrevencion, pausarSimulacro, palabraClave } from "./prevencion.js";
import { iniciarMitigacion, pausarCrono } from "./mitigacion.js";
import { iniciarAsistente } from "./asistente.js";
import { cargarModelo, iniciarAprendizaje, pintarOpinion, modeloActual } from "./aprendizaje.js";
import { decidir } from "./motor/decision.js";

const $ = (id) => document.getElementById(id);

const ETIQUETAS_SENAL = {
  urgencia: "Te apuran",
  pide_pago: "Pide pagar o consignar",
  premio_con_pago: "Premio que exige pagar",
  pide_datos: "Pide clave, código o datos",
  solicitud_dinero_sin_pago: "Pide dinero sin decir cómo pagar",
  llamado_clic_urgente: "Te presiona a hacer clic",
  menciona_enlace: "Menciona un enlace",
  enlace_acortado: "Enlace acortado",
  dominio_imitacion: "Dirección que imita una marca",
  dominio_desconocido: "Dirección no conocida",
};

const CLASES_VEREDICTO = {
  [VEREDICTOS.PELIGROSO]: "peligroso",
  [VEREDICTOS.SOSPECHOSO]: "sospechoso",
  [VEREDICTOS.NO_CONCLUYENTE]: "no-concluyente",
  [VEREDICTOS.SIN_SENALES]: "sin-senales",
};

const EXPLICACION_VEREDICTO = {
  [VEREDICTOS.PELIGROSO]: "El clasificador lo ve muy parecido a los mensajes de phishing que conoce. No respondas, no hagas clic y no envíes nada.",
  [VEREDICTOS.SOSPECHOSO]: "Hay razones suficientes para desconfiar. Verifica por un canal oficial antes de hacer nada.",
  [VEREDICTOS.NO_CONCLUYENTE]: "No tenemos pruebas de que sea fraude, pero tampoco para descartarlo. Verifica antes de actuar.",
  [VEREDICTOS.SIN_SENALES]: "Ni el clasificador ni las reglas encontraron nada. Eso no quiere decir que sea seguro: quiere decir que no vimos nada sospechoso.",
};

const EJEMPLOS = {
  familiar: { texto: "hola hijo, cambié de número, este es el nuevo. necesito que me prestes 10k urgente, luego te los devuelvo", url: "" },
  banco: { texto: "Bancolombia: detectamos un acceso no autorizado. Confirma tu clave ahora o tu cuenta será bloqueada en 2 horas.", url: "bancolombia-seguro.co/validar" },
  premio: { texto: "¡FELICIDADES! Ganaste $2.000.000 en nuestro sorteo. Para reclamar el premio consigna $80.000 de impuesto a Nequi hoy mismo.", url: "" },
  legitimo: { texto: "Hola, soy Cami del grupo de cálculo. ¿Mañana nos vemos a las 3 en la biblioteca para el taller?", url: "" },
};

let config = null;
let entrada = null;
let respuestas = {};
let modo = "mensaje";

/* ---------- navegación ---------- */

function ir(vista) {
  document.querySelectorAll(".vista").forEach((s) => {
    s.classList.toggle("activa", s.dataset.vista === vista);
  });
  document.querySelectorAll(".nav button, .tabs button").forEach((b) => {
    b.classList.toggle("activo", b.dataset.ir === vista);
  });
  // Si salimos de prevención o mitigación, no dejamos relojes corriendo.
  if (vista !== "prevencion") pausarSimulacro();
  if (vista !== "mitigacion") pausarCrono();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function iniciarNavegacion() {
  document.addEventListener("click", (e) => {
    const destino = e.target.closest("[data-ir]");
    if (!destino) return;
    e.preventDefault();
    ir(destino.dataset.ir);
  });
}

/* ---------- utilidades de texto ---------- */

function escaparHtml(texto) {
  return texto.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Resalta los fragmentos de las señales dentro del texto original.
function resaltar(texto, senales) {
  const fragmentos = [...new Set(senales.flatMap((s) => s.fragmentos).filter((f) => f && f.length > 1))];
  let html = escaparHtml(texto);
  for (const f of fragmentos.sort((a, b) => b.length - a.length)) {
    const patron = new RegExp(escaparRegex(escaparHtml(f)), "gi");
    html = html.replace(patron, (m) => `<mark class="senal">${m}</mark>`);
  }
  return html;
}

/* ---------- detección ---------- */

function mostrarSeccion(id) {
  $("det-preguntas").hidden = id !== "preguntas";
  $("det-veredicto").hidden = id !== "veredicto";
}

function pintarPregunta(r) {
  mostrarSeccion("preguntas");
  $("preg-progreso").textContent = `Pregunta ${r.pregunta.indice} de ${r.pregunta.total}`;
  $("pregunta").textContent = r.pregunta.texto;
  $("det-preguntas").dataset.id = r.pregunta.id;
  $("det-preguntas").scrollIntoView({ behavior: "smooth", block: "center" });
}

function pintarVeredicto(r) {
  mostrarSeccion("veredicto");

  // La etiqueta la decide el clasificador; las reglas solo pueden subir la
  // cautela (js/motor/decision.js). Sin modelo cargado, caen las reglas solas.
  const modelo = modeloActual();
  const texto = entrada.texto || entrada.url;
  const d = modelo ? decidir(modelo, texto, r.senales) : null;
  const veredicto = d ? d.veredicto : r.veredicto;

  const v = $("veredicto");
  v.textContent = veredicto;
  v.className = `veredicto ${CLASES_VEREDICTO[veredicto]}`;
  $("veredicto-exp").textContent = EXPLICACION_VEREDICTO[veredicto] || "";

  // Aviso cuando las reglas levantaron el nivel que había fijado el modelo.
  const aviso = $("aviso-piso");
  if (d && d.reglasSubieron) {
    aviso.hidden = false;
    aviso.textContent = d.desacuerdo
      ? "El clasificador no vio parecido con phishing, pero las reglas encontraron evidencia concreta en el mensaje o en el enlace. Subimos la alarma: hazle caso a las reglas, porque son las que miran la dirección y lo que te piden."
      : "Las reglas encontraron evidencia en el enlace o en la petición y subieron el nivel de alerta.";
  } else {
    aviso.hidden = true;
  }

  // Recordatorio de la palabra clave si el caso involucra dinero o datos.
  const rec = $("recordatorio-clave");
  const palabra = palabraClave();
  if (r.requiereVerificacion && palabra) {
    rec.hidden = false;
    rec.innerHTML = `Este mensaje pide dinero o datos. Antes de responder, pide la palabra clave que acordaron: <b>${escaparHtml(palabra)}</b>. Si no la saben, no es quien dice ser.`;
  } else if (r.requiereVerificacion) {
    rec.hidden = false;
    rec.innerHTML = `Este mensaje pide dinero o datos. Si todavía no tienes una <b>palabra clave familiar</b>, acuérdala hoy con tu familia en la sección de Prevención.`;
  } else {
    rec.hidden = true;
  }

  $("texto-resaltado").innerHTML = resaltar(entrada.texto || entrada.url, r.senales);

  const chips = $("senales");
  chips.innerHTML = "";
  if (!r.senales.length) {
    const p = document.createElement("span");
    p.className = "chip";
    p.textContent = "Ninguna señal encontrada";
    chips.appendChild(p);
  }
  for (const s of r.senales) {
    const c = document.createElement("span");
    c.className = "chip chip-senal";
    c.textContent = ETIQUETAS_SENAL[s.tipo] || s.tipo;
    chips.appendChild(c);
  }

  const recs = $("recomendaciones");
  recs.innerHTML = "";
  const textos = recomendar(r.senales);
  if (!textos.length) {
    textos.push("No encontramos señales, pero si no reconoces a quien te escribe, confirma por otro medio antes de responder.");
  }
  for (const t of textos) {
    const li = document.createElement("li");
    li.textContent = t;
    recs.appendChild(li);
  }

  pintarOpinion(texto, veredicto);
  guardarSiPrueba({ entrada, respuestas, resultado: { ...r, veredicto } });
  $("det-veredicto").scrollIntoView({ behavior: "smooth", block: "start" });
}

function analizarActual() {
  const r = analizar(entrada, respuestas, config);
  if (r.error) {
    $("error").textContent = r.error;
    $("error").hidden = false;
    mostrarSeccion(null);
    return;
  }
  $("error").hidden = true;
  if (r.fase === "preguntas") pintarPregunta(r);
  else pintarVeredicto(r);
}

function leerEntrada() {
  if (modo === "enlace") return { texto: "", url: $("url-solo").value.trim() };
  return { texto: $("texto").value, url: $("url").value.trim() };
}

function limpiar() {
  $("texto").value = "";
  $("url").value = "";
  $("url-solo").value = "";
  entrada = null;
  respuestas = {};
  mostrarSeccion(null);
  $("error").hidden = true;
}

function iniciarDeteccion() {
  document.querySelectorAll("[data-modo]").forEach((b) => {
    b.addEventListener("click", () => {
      modo = b.dataset.modo;
      document.querySelectorAll("[data-modo]").forEach((o) => o.classList.toggle("activo", o === b));
      $("campo-mensaje").hidden = modo !== "mensaje";
      $("campo-enlace").hidden = modo !== "enlace";
      limpiar();
    });
  });

  document.querySelectorAll("[data-ejemplo]").forEach((b) => {
    b.addEventListener("click", () => {
      const ej = EJEMPLOS[b.dataset.ejemplo];
      modo = "mensaje";
      document.querySelectorAll("[data-modo]").forEach((o) => o.classList.toggle("activo", o.dataset.modo === "mensaje"));
      $("campo-mensaje").hidden = false;
      $("campo-enlace").hidden = true;
      $("texto").value = ej.texto;
      $("url").value = ej.url;
      respuestas = {};
      entrada = leerEntrada();
      analizarActual();
    });
  });

  $("analizar").addEventListener("click", () => {
    entrada = leerEntrada();
    respuestas = {};
    analizarActual();
  });

  document.querySelectorAll("#det-preguntas [data-respuesta]").forEach((boton) => {
    boton.addEventListener("click", () => {
      const id = $("det-preguntas").dataset.id;
      const valor = boton.dataset.respuesta;
      // null marca la pregunta como respondida sin ajuste de puntaje.
      respuestas[id] = valor === "si" ? true : valor === "no" ? false : null;
      analizarActual();
    });
  });

  $("nuevo").addEventListener("click", () => {
    limpiar();
    $("texto").focus();
  });
}

/* ---------- arranque ---------- */

async function cargarConfig() {
  const respuesta = await fetch("config/reglas.json");
  if (!respuesta.ok) throw new Error("No se pudo cargar reglas.json");
  config = await respuesta.json();
}

Promise.all([cargarConfig(), cargarModelo().catch(() => null)])
  .then(() => {
    iniciarNavegacion();
    iniciarDeteccion();
    iniciarPrevencion();
    iniciarMitigacion();
    iniciarAsistente();
    iniciarAprendizaje();
  })
  .catch(() => {
    $("error").hidden = false;
    $("error").textContent = "No pudimos cargar las reglas. Abre la página desde un servidor local (python3 -m http.server), no con doble clic.";
    // El resto de la app sí funciona sin el motor.
    iniciarNavegacion();
    iniciarPrevencion();
    iniciarMitigacion();
    iniciarAsistente();
    iniciarAprendizaje();
  });
