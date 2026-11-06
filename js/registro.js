// Registro anónimo para la prueba técnica.
// Solo se activa con ?prueba=1 en la URL. Guarda señales, respuestas y veredicto.
// NUNCA guarda el texto original ni la URL.

const CLAVE = "anzuelo_cero_registro";

export function modoPruebaActivo() {
  try {
    return new URLSearchParams(window.location.search).get("prueba") === "1";
  } catch (_) {
    return false;
  }
}

export function guardarSiPrueba({ resultado, respuestas }) {
  if (!modoPruebaActivo()) return;
  try {
    const filas = leerRegistro();
    filas.push({
      fecha: new Date().toISOString(),
      senales: resultado.senales.map((s) => s.tipo).join(";"),
      respuestas: JSON.stringify(respuestas),
      puntaje: resultado.puntaje,
      veredicto: resultado.veredicto,
      tipo_caso: "",
    });
    localStorage.setItem(CLAVE, JSON.stringify(filas));
  } catch (_) {
    // Si el navegador bloquea el almacenamiento, la app sigue funcionando.
  }
}

export function leerRegistro() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || "[]");
  } catch (_) {
    return [];
  }
}

export function borrarRegistro() {
  try {
    localStorage.removeItem(CLAVE);
  } catch (_) {
    // Sin efecto si el almacenamiento no está disponible.
  }
}

export function registroACsv(filas) {
  const columnas = ["fecha", "senales", "respuestas", "puntaje", "veredicto", "tipo_caso"];
  const escapar = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lineas = [columnas.join(",")];
  for (const f of filas) lineas.push(columnas.map((c) => escapar(f[c])).join(","));
  return lineas.join("\n");
}
