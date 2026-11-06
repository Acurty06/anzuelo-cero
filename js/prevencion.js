// Pilar de prevención: simulacro cronometrado, palabra clave, biblioteca y mitos.

import { SIMULACRO } from "./datos/simulacro.js";
import { SENALES_EDU, CANALES, MITOS } from "./datos/educacion.js";

const $ = (id) => document.getElementById(id);

const CLAVE_RACHA = "anzuelo_cero_racha";
const CLAVE_PALABRA = "anzuelo_cero_palabra";
const SEGUNDOS = 10;
const CIRCUNFERENCIA = 2 * Math.PI * 20; // r = 20 en el SVG

let orden = [];
let indice = 0;
let aciertos = 0;
let peorTiempo = 0;
let restante = SEGUNDOS;
let inicioCaso = 0;
let intervalo = null;

/* ---------- almacenamiento ---------- */

function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch (_) {
    return porDefecto;
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch (_) {
    // Si el navegador bloquea el almacenamiento, la app sigue funcionando.
  }
}

export function palabraClave() {
  const v = leer(CLAVE_PALABRA, "");
  return typeof v === "string" ? v : "";
}

/* ---------- simulacro ---------- */

function pintarRacha() {
  const mejor = leer(CLAVE_RACHA, null);
  $("racha").textContent = mejor === null
    ? "Sin jugar todavía"
    : `Tu mejor: ${mejor} de ${SIMULACRO.length}`;
}

function mostrarPanel(id) {
  for (const p of ["sim-inicio", "sim-juego", "sim-feedback", "sim-final"]) {
    $(p).hidden = p !== id;
  }
}

function pararReloj() {
  if (intervalo) clearInterval(intervalo);
  intervalo = null;
}

function pintarReloj() {
  const barra = $("reloj-barra");
  const fraccion = Math.max(0, restante) / SEGUNDOS;
  barra.style.strokeDasharray = CIRCUNFERENCIA;
  barra.style.strokeDashoffset = CIRCUNFERENCIA * (1 - fraccion);
  barra.classList.toggle("poco", restante <= 3);
  $("reloj-num").textContent = Math.max(0, restante);
}

function siguienteCaso() {
  if (indice >= orden.length) return terminar();

  const caso = SIMULACRO[orden[indice]];
  $("sim-progreso").textContent = `Mensaje ${indice + 1} de ${orden.length}`;
  $("sim-texto").textContent = caso.texto;
  mostrarPanel("sim-juego");

  restante = SEGUNDOS;
  inicioCaso = Date.now();
  pintarReloj();

  pararReloj();
  intervalo = setInterval(() => {
    restante -= 1;
    pintarReloj();
    if (restante <= 0) responder(null); // se acabó el tiempo
  }, 1000);
}

function responder(dijoTrampa) {
  pararReloj();
  const caso = SIMULACRO[orden[indice]];
  const segundos = Math.min(SEGUNDOS, (Date.now() - inicioCaso) / 1000);
  peorTiempo = Math.max(peorTiempo, segundos);

  const acerto = dijoTrampa !== null && dijoTrampa === caso.trampa;
  if (acerto) aciertos += 1;

  const caja = $("feedback-caja");
  caja.className = `feedback ${acerto ? "bien" : "mal"}`;
  $("feedback-titulo").textContent = dijoTrampa === null
    ? "Se acabó el tiempo"
    : acerto ? "Correcto" : "Incorrecto";
  $("feedback-senal").textContent = caso.senal;
  $("feedback-exp").textContent = caso.explicacion;
  mostrarPanel("sim-feedback");
}

function terminar() {
  pararReloj();
  $("sim-aciertos").textContent = aciertos;
  $("sim-tiempo").textContent = `${peorTiempo.toFixed(1)}s`;

  const mejor = leer(CLAVE_RACHA, null);
  if (mejor === null || aciertos > mejor) guardar(CLAVE_RACHA, aciertos);
  pintarRacha();

  const total = orden.length;
  let texto;
  if (aciertos === total) {
    texto = "Perfecto. Ojo: en la vida real no sabes que te están evaluando, y ahí es donde cambia todo.";
  } else if (aciertos >= total - 2) {
    texto = "Buen reflejo. Los que fallaste son justo los casos ambiguos, que son los que más cuestan.";
  } else {
    texto = "Esto es normal, y es exactamente el punto: reconocer las señales en frío no es lo mismo que decidir en diez segundos.";
  }
  $("sim-veredicto-final").textContent = texto;
  mostrarPanel("sim-final");
}

function empezar() {
  orden = SIMULACRO.map((_, i) => i).sort(() => Math.random() - 0.5);
  indice = 0;
  aciertos = 0;
  peorTiempo = 0;
  siguienteCaso();
}

/* ---------- contenido educativo ---------- */

function pintarBiblioteca() {
  const cont = $("biblioteca");
  cont.innerHTML = "";
  for (const s of SENALES_EDU) {
    const ficha = document.createElement("article");
    ficha.className = "ficha";
    ficha.tabIndex = 0;

    const h = document.createElement("h3");
    h.textContent = s.titulo;
    const que = document.createElement("p");
    que.textContent = s.que;

    const detalle = document.createElement("div");
    detalle.className = "ficha-detalle";
    detalle.hidden = true;
    const ej = document.createElement("p");
    ej.className = "ficha-ejemplo";
    ej.textContent = s.ejemplo;
    const ac = document.createElement("p");
    ac.className = "ficha-accion";
    ac.textContent = s.accion;
    detalle.append(ej, ac);

    const alternar = () => { detalle.hidden = !detalle.hidden; };
    ficha.addEventListener("click", alternar);
    ficha.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alternar(); }
    });

    ficha.append(h, que, detalle);
    cont.appendChild(ficha);
  }
}

function pintarCanales() {
  const cont = $("canales");
  cont.innerHTML = "";
  for (const c of CANALES) {
    const fila = document.createElement("div");
    fila.className = "canal-fila";

    const nombre = document.createElement("span");
    nombre.className = "canal-nombre";
    nombre.textContent = c.nombre;

    const barra = document.createElement("div");
    barra.className = "canal-barra";
    const relleno = document.createElement("div");
    relleno.className = "canal-relleno";
    relleno.style.width = `${c.porcentaje}%`;
    barra.appendChild(relleno);

    const valor = document.createElement("span");
    valor.className = "canal-valor";
    valor.textContent = `${c.porcentaje}%`;

    fila.append(nombre, barra, valor);
    cont.appendChild(fila);
  }
}

function pintarMitos() {
  const cont = $("mitos");
  cont.innerHTML = "";
  for (const m of MITOS) {
    const art = document.createElement("article");
    art.className = "mito";
    const h = document.createElement("p");
    h.className = "mito-h";
    h.textContent = m.mito;
    const p = document.createElement("p");
    p.textContent = m.realidad;
    art.append(h, p);
    cont.appendChild(art);
  }
}

/* ---------- palabra clave ---------- */

function iniciarPalabra() {
  const input = $("clave-input");
  const estado = $("clave-estado");
  const actual = palabraClave();
  if (actual) {
    input.value = actual;
    estado.hidden = false;
    estado.textContent = "Tu palabra clave está guardada en este navegador.";
  }
  $("clave-guardar").addEventListener("click", () => {
    const valor = input.value.trim();
    guardar(CLAVE_PALABRA, valor);
    estado.hidden = false;
    estado.textContent = valor
      ? `Guardada. Pídela cuando alguien te escriba pidiendo plata desde un número nuevo.`
      : "Palabra clave borrada.";
  });
}

export function iniciarPrevencion() {
  pintarRacha();
  pintarBiblioteca();
  pintarCanales();
  pintarMitos();
  iniciarPalabra();

  $("sim-empezar").addEventListener("click", empezar);
  $("sim-reiniciar").addEventListener("click", empezar);
  $("sim-siguiente").addEventListener("click", () => { indice += 1; siguienteCaso(); });
  document.querySelectorAll("[data-sim]").forEach((b) => {
    b.addEventListener("click", () => responder(b.dataset.sim === "trampa"));
  });
}

// Si el usuario sale de la pestaña en medio del simulacro, se detiene el reloj.
export function pausarSimulacro() {
  pararReloj();
}
