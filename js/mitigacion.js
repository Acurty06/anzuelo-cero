// Pilar de mitigación: plan de 5 minutos según lo que la persona alcanzó a hacer.
// El asistente guiado (js/asistente.js) llama a mostrarPlan().

import { ACCIONES, MENSAJE_AVISO, NO_HACER, planPara } from "./datos/plan.js";

const $ = (id) => document.getElementById(id);
const CLAVE_HECHOS = "anzuelo_cero_plan_hechos";

let marcadas = new Set();
let pasosActuales = [];
let hechos = new Set();
let segundos = 300;
let crono = null;

function leerHechos() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CLAVE_HECHOS) || "[]"));
  } catch (_) {
    return new Set();
  }
}

function guardarHechos() {
  try {
    localStorage.setItem(CLAVE_HECHOS, JSON.stringify([...hechos]));
  } catch (_) {
    // Sin efecto si el almacenamiento no está disponible.
  }
}

function pintarAcciones() {
  const cont = $("acciones-lista");
  cont.innerHTML = "";
  for (const a of ACCIONES) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.dataset.accion = a.id;
    b.textContent = a.etiqueta;
    b.addEventListener("click", () => {
      if (marcadas.has(a.id)) marcadas.delete(a.id);
      else marcadas.add(a.id);
      b.classList.toggle("marcado", marcadas.has(a.id));
    });
    cont.appendChild(b);
  }
}

function actualizarProgreso() {
  $("progreso").textContent = `${hechos.size} de ${pasosActuales.length} pasos completados.`;
}

function pintarPasos() {
  const lista = $("pasos");
  lista.innerHTML = "";

  pasosActuales.forEach((paso, i) => {
    const li = document.createElement("li");
    li.className = "paso";
    const clave = `${paso.minuto}-${paso.titulo}`;
    if (hechos.has(clave)) li.classList.add("hecho");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = hechos.has(clave);
    check.setAttribute("aria-label", paso.titulo);
    check.addEventListener("change", () => {
      if (check.checked) hechos.add(clave);
      else hechos.delete(clave);
      li.classList.toggle("hecho", check.checked);
      guardarHechos();
      actualizarProgreso();
    });

    const cuerpo = document.createElement("div");
    cuerpo.className = "paso-cuerpo";

    const min = document.createElement("p");
    min.className = "paso-min";
    min.textContent = paso.minuto === 0 ? "Ahora mismo" : `Minuto ${paso.minuto}`;

    const titulo = document.createElement("p");
    titulo.className = "paso-titulo";
    titulo.textContent = `${i + 1}. ${paso.titulo}`;

    const detalle = document.createElement("p");
    detalle.className = "paso-detalle";
    detalle.textContent = paso.detalle;

    cuerpo.append(min, titulo, detalle);
    li.append(check, cuerpo);
    lista.appendChild(li);
  });

  actualizarProgreso();
}

function pintarAvisos(avisos) {
  const cont = $("plan-avisos");
  cont.innerHTML = "";
  cont.hidden = !avisos.length;
  for (const a of avisos) {
    const p = document.createElement("p");
    p.className = "aviso-ctx";
    p.textContent = a;
    cont.appendChild(p);
  }
}

function pintarNoHacer() {
  const lista = $("no-hacer");
  lista.innerHTML = "";
  for (const t of NO_HACER) {
    const li = document.createElement("li");
    li.textContent = t;
    lista.appendChild(li);
  }
}

function formatear(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function alternarCrono() {
  const btn = $("crono-btn");
  if (crono) {
    clearInterval(crono);
    crono = null;
    btn.textContent = "Seguir";
    return;
  }
  btn.textContent = "Pausar";
  crono = setInterval(() => {
    segundos = Math.max(0, segundos - 1);
    $("crono-num").textContent = formatear(segundos);
    if (segundos === 0) {
      clearInterval(crono);
      crono = null;
      btn.textContent = "Reiniciar";
    }
  }, 1000);
}

/**
 * Muestra el plan. Lo usan el asistente y el modo manual.
 * @param {string[]} acciones ids de ACCIONES
 * @param {string[]} avisos textos contextuales a mostrar sobre el plan
 */
export function mostrarPlan(acciones, avisos = []) {
  const lista = acciones.length ? acciones : ["clic"];
  marcadas = new Set(lista);

  // Refleja la selección en los chips del modo manual.
  document.querySelectorAll("#acciones-lista .chip").forEach((c) => {
    c.classList.toggle("marcado", marcadas.has(c.dataset.accion));
  });

  pasosActuales = planPara([...marcadas]);
  hechos = leerHechos();
  pintarPasos();
  pintarAvisos(avisos);

  $("plan-zona").hidden = false;
  $("plan-titulo").textContent = marcadas.has("dinero")
    ? "Primero: detener el dinero"
    : "Primeros 5 minutos";
  $("plan-zona").scrollIntoView({ behavior: "smooth", block: "start" });
}

async function copiarAviso() {
  const btn = $("copiar");
  try {
    await navigator.clipboard.writeText(MENSAJE_AVISO);
    btn.textContent = "Copiado";
  } catch (_) {
    // Sin permiso de portapapeles: se selecciona para copiar a mano.
    const rango = document.createRange();
    rango.selectNodeContents($("mensaje-aviso"));
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(rango);
    btn.textContent = "Selecciona y copia";
  }
  setTimeout(() => { btn.textContent = "Copiar"; }, 2500);
}

export function iniciarMitigacion() {
  pintarAcciones();
  pintarNoHacer();
  $("mensaje-aviso").textContent = MENSAJE_AVISO;
  $("crono-num").textContent = formatear(segundos);

  $("armar-plan").addEventListener("click", () => mostrarPlan([...marcadas]));
  $("copiar").addEventListener("click", copiarAviso);
  $("crono-btn").addEventListener("click", () => {
    if (segundos === 0) { segundos = 300; $("crono-num").textContent = formatear(segundos); }
    alternarCrono();
  });

  // Alternar entre asistente y selección manual.
  $("ver-manual").addEventListener("click", () => {
    const manual = $("modo-manual");
    manual.hidden = !manual.hidden;
    $("ver-manual").textContent = manual.hidden
      ? "Prefiero marcar opciones"
      : "Volver al asistente";
    if (!manual.hidden) manual.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function pausarCrono() {
  if (crono) { clearInterval(crono); crono = null; $("crono-btn").textContent = "Seguir"; }
}
