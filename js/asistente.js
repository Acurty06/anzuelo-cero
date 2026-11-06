// Asistente guiado del pilar de mitigación.
// Conversación por turnos sobre reglas explícitas: no hay modelo de lenguaje ni
// llamadas a ningún servidor. Todo ocurre en el navegador.

import { interpretar, TRIAJE, TIEMPOS, CONTEXTOS } from "./datos/asistente.js";
import { ACCIONES } from "./datos/plan.js";
import { mostrarPlan } from "./mitigacion.js";

const $ = (id) => document.getElementById(id);

const CORTO = Object.fromEntries(ACCIONES.map((a) => [a.id, a.corto]));
// Orden estable para el resumen, de más grave a menos.
const ORDEN = ACCIONES.map((a) => a.id);

let acciones = new Set();
let avisos = [];
let triajePendiente = [];
let estado = "relato"; // relato → confirmar → triaje → tiempo → plan

/* ---------- pintado del chat ---------- */

function burbuja(texto, quien = "bot") {
  const div = document.createElement("div");
  div.className = `msg msg-${quien}`;
  div.textContent = texto;
  $("chat").appendChild(div);
  $("chat").scrollTop = $("chat").scrollHeight;
  return div;
}

// Respuestas rápidas debajo del último mensaje.
function opciones(lista) {
  const cont = document.createElement("div");
  cont.className = "msg-opciones";
  for (const o of lista) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.textContent = o.etiqueta;
    b.addEventListener("click", () => {
      cont.remove();
      burbuja(o.etiqueta, "yo");
      o.accion();
    });
    cont.appendChild(b);
  }
  $("chat").appendChild(cont);
  $("chat").scrollTop = $("chat").scrollHeight;
}

// Pequeña pausa para que la conversación no aparezca de golpe.
function responder(fn, ms = 420) {
  const esperando = burbuja("…", "bot");
  esperando.classList.add("escribiendo");
  setTimeout(() => { esperando.remove(); fn(); }, ms);
}

/* ---------- pasos de la conversación ---------- */

function resumirAcciones() {
  const nombres = ORDEN.filter((id) => acciones.has(id)).map((id) => CORTO[id]);
  if (nombres.length === 1) return nombres[0];
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

function preguntarTiempo() {
  estado = "tiempo";
  responder(() => {
    burbuja("Última cosa: ¿hace cuánto pasó?");
    opciones(TIEMPOS.map((t) => ({
      etiqueta: t.etiqueta,
      accion: () => { avisos.unshift(t.aviso); armar(); },
    })));
  });
}

function siguienteTriaje() {
  const pendiente = triajePendiente.shift();
  if (!pendiente) return preguntarTiempo();

  estado = "triaje";
  responder(() => {
    burbuja(pendiente.texto);
    opciones([
      { etiqueta: "Sí", accion: () => { acciones.add(pendiente.id); siguienteTriaje(); } },
      { etiqueta: "No", accion: () => siguienteTriaje() },
    ]);
  });
}

function confirmar() {
  estado = "confirmar";
  responder(() => {
    burbuja(`Entendí que ${resumirAcciones()}. ¿Hubo algo más?`);
    const faltantes = ACCIONES
      .filter((a) => !acciones.has(a.id))
      .map((a) => ({
        etiqueta: a.etiqueta,
        accion: () => {
          acciones.add(a.id);
          responder(() => {
            burbuja(`Anotado. Ahora tengo: ${resumirAcciones()}.`);
            confirmar();
          }, 300);
        },
      }));
    opciones([...faltantes, { etiqueta: "Eso fue todo", accion: preguntarTiempo }]);
  });
}

function armar() {
  estado = "plan";
  responder(() => {
    const urgente = acciones.has("dinero");
    burbuja(urgente
      ? "Listo. Como hubo dinero de por medio, el primer paso es el banco y es ahora mismo. Te dejo el plan completo abajo."
      : "Listo. Te armé el plan abajo, en orden de urgencia. Haz los pasos de arriba hacia abajo.");
    mostrarPlan([...acciones], avisos);
  }, 500);
}

function procesarRelato(texto) {
  const { acciones: detectadas, contextos } = interpretar(texto);
  detectadas.forEach((a) => acciones.add(a));
  avisos = contextos.map((c) => c.aviso);

  if (acciones.size) {
    confirmar();
    return;
  }

  // No se entendió qué hizo: se pasa al triaje por preguntas cerradas.
  triajePendiente = [...TRIAJE];
  responder(() => {
    burbuja("No me quedó claro qué alcanzaste a hacer, así que te pregunto directo.");
    siguienteTriaje();
  });
}

function enviar() {
  const campo = $("chat-input");
  const texto = campo.value.trim();
  if (!texto) return;
  campo.value = "";
  burbuja(texto, "yo");

  if (estado === "relato") return procesarRelato(texto);

  // Si escribe estando en otro paso, se reinterpreta y se suma lo nuevo.
  const { acciones: nuevas, contextos } = interpretar(texto);
  nuevas.forEach((a) => acciones.add(a));
  for (const c of contextos) if (!avisos.includes(c.aviso)) avisos.push(c.aviso);
  responder(() => {
    burbuja(acciones.size
      ? `Anotado. Ahora tengo: ${resumirAcciones()}.`
      : "No alcancé a identificar nada ahí. Vamos por partes.");
    if (acciones.size) confirmar();
    else { triajePendiente = [...TRIAJE]; siguienteTriaje(); }
  }, 300);
}

function reiniciar() {
  acciones = new Set();
  avisos = [];
  triajePendiente = [];
  estado = "relato";
  $("chat").innerHTML = "";
  $("plan-zona").hidden = true;
  burbuja("Cuéntame qué pasó, con tus palabras. Por ejemplo: «me llegó un mensaje del banco, abrí el enlace y puse mi clave».");
}

export function iniciarAsistente() {
  reiniciar();
  $("chat-enviar").addEventListener("click", enviar);
  $("chat-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });
  $("chat-reiniciar").addEventListener("click", reiniciar);
}
