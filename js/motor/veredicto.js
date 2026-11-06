// Cálculo del veredicto a partir del puntaje y de las señales.

export const VEREDICTOS = {
  PELIGROSO: "Peligroso",
  SOSPECHOSO: "Sospechoso",
  NO_CONCLUYENTE: "No concluyente",
  SIN_SENALES: "Sin señales de alerta",
};

// Señales que indican una solicitud de dinero o de datos. Con ellas nunca se devuelve "Sin señales".
const TIPOS_DINERO_O_DATOS = ["pide_pago", "pide_datos", "premio_con_pago", "solicitud_dinero_sin_pago"];

// Señales que vuelven el caso ambiguo aunque no sumen puntos.
const TIPOS_AMBIGUOS = ["solicitud_dinero_sin_pago", "menciona_enlace", "dominio_desconocido"];

export function calcularVeredicto(puntaje, senales, config) {
  const tipos = senales.map((s) => s.tipo);

  if (puntaje >= config.umbrales.peligroso) return VEREDICTOS.PELIGROSO;
  if (puntaje >= config.umbrales.sospechoso) return VEREDICTOS.SOSPECHOSO;

  const hayDineroODatos = tipos.some((t) => TIPOS_DINERO_O_DATOS.includes(t));
  const esAmbiguo = tipos.some((t) => TIPOS_AMBIGUOS.includes(t));

  if (hayDineroODatos || esAmbiguo) return VEREDICTOS.NO_CONCLUYENTE;
  return VEREDICTOS.SIN_SENALES;
}

export function requiereVerificacion(senales) {
  return senales.some((s) => TIPOS_DINERO_O_DATOS.includes(s.tipo));
}
