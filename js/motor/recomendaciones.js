// Recomendaciones de acción según las señales encontradas. Textos fijos, en español.

const TEXTOS = {
  pide_pago: "No hagas ninguna consignación ni transferencia antes de confirmar por otro medio.",
  pide_datos: "Nunca compartas claves, códigos, cédula ni datos bancarios por mensaje.",
  premio_con_pago: "Un premio real no exige pagar impuestos ni cargos para reclamarlo.",
  enlace_acortado: "Los enlaces acortados ocultan el destino. No los abras sin verificar la dirección.",
  dominio_imitacion: "La dirección imita una marca conocida. No la abras: entra escribiendo la dirección oficial en el navegador.",
  dominio_desconocido: "La dirección no corresponde a un sitio conocido. Antes de abrirla, verifica con la marca o la persona.",
  llamado_clic_urgente: "El mensaje te presiona a actuar rápido con un enlace. Tómate un momento antes de hacer clic.",
  solicitud_dinero_sin_pago: "Antes de enviar dinero, contacta a esa persona por otro medio, como una llamada a su número conocido.",
  menciona_enlace: "Si no esperabas este mensaje, no abras el enlace; entra desde la app o la página oficial.",
};

export function recomendar(senales) {
  const tipos = new Set(senales.map((s) => s.tipo));
  const recs = [];
  for (const tipo of ["pide_pago", "pide_datos", "premio_con_pago", "solicitud_dinero_sin_pago", "enlace_acortado", "dominio_imitacion", "dominio_desconocido", "llamado_clic_urgente", "menciona_enlace"]) {
    if (tipos.has(tipo)) recs.push(TEXTOS[tipo]);
  }
  return recs;
}
