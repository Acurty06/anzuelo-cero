// Pilar de mitigación: qué hacer después de caer.
// Los pasos se ordenan por urgencia según lo que la persona alcanzó a hacer.

export const ACCIONES = [
  { id: "dinero", etiqueta: "Envié dinero", corto: "enviaste dinero", urgencia: 1 },
  { id: "tarjeta", etiqueta: "Di datos de mi tarjeta", corto: "diste los datos de tu tarjeta", urgencia: 2 },
  { id: "codigo", etiqueta: "Di un código de verificación", corto: "diste un código de verificación", urgencia: 3 },
  { id: "clave", etiqueta: "Escribí mi contraseña", corto: "escribiste tu contraseña", urgencia: 4 },
  { id: "clic", etiqueta: "Solo abrí el enlace", corto: "abriste el enlace", urgencia: 5 },
  { id: "datos", etiqueta: "Di mi cédula o datos personales", corto: "diste datos personales", urgencia: 6 },
];

// Cada paso: minutos estimados y a qué acciones aplica.
export const PASOS = [
  {
    para: ["dinero"],
    minuto: 0,
    titulo: "Llama ya a tu banco",
    detalle: "Usa el número que está en el respaldo de tu tarjeta o en la app oficial, nunca el que te escribieron. Pide reversar o bloquear la transacción. Entre más rápido, más posibilidades hay.",
  },
  {
    para: ["tarjeta"],
    minuto: 0,
    titulo: "Bloquea la tarjeta",
    detalle: "Desde la app del banco o llamando a la línea oficial. Bloquear es inmediato y reversible: una tarjeta nueva es mucho menos problema que un cobro no autorizado.",
  },
  {
    para: ["codigo"],
    minuto: 0,
    titulo: "Recupera la cuenta antes que ellos",
    detalle: "Un código de un solo uso sirve para entrar a tu cuenta ahora mismo. Entra tú primero, cambia la clave y saca las sesiones abiertas. En WhatsApp, vuelve a registrar tu número.",
  },
  {
    para: ["clave", "codigo"],
    minuto: 1,
    titulo: "Cambia la contraseña",
    detalle: "Primero la cuenta afectada. Después cualquier otra cuenta donde uses esa misma contraseña, que es por donde se propaga el daño.",
  },
  {
    para: ["clave", "codigo", "clic"],
    minuto: 2,
    titulo: "Cierra las sesiones que no reconozcas",
    detalle: "En la configuración de la cuenta busca «dispositivos» o «sesiones activas» y cierra todas las que no sean tuyas.",
  },
  {
    para: ["clave", "codigo", "clic", "tarjeta"],
    minuto: 3,
    titulo: "Activa la verificación en dos pasos",
    detalle: "Así una contraseña robada ya no alcanza para entrar. Hazlo en la app o página oficial, no desde ningún enlace que te hayan mandado.",
  },
  {
    para: ["dinero", "tarjeta", "codigo", "clave", "clic", "datos"],
    minuto: 4,
    titulo: "Avisa a tu círculo",
    detalle: "Si entraron a tu cuenta, van a escribirle a tus contactos haciéndose pasar por ti. Avisar temprano corta la cadena.",
    mensaje: true,
  },
  {
    para: ["dinero", "tarjeta", "codigo", "clave", "clic", "datos"],
    minuto: 5,
    titulo: "Guarda las pruebas y reporta",
    detalle: "Toma capturas del mensaje, el número y cualquier comprobante antes de borrar nada. En Colombia el phishing se reporta en el CAI Virtual de la Policía Nacional (caivirtual.policia.gov.co).",
  },
  {
    para: ["datos"],
    minuto: 5,
    titulo: "Vigila tu identidad",
    detalle: "Con tu cédula pueden intentar abrir productos a tu nombre. Revisa tus centrales de riesgo en las siguientes semanas y desconfía de llamadas que ya «saben» tus datos.",
  },
];

export const MENSAJE_AVISO =
  "Ojo: mi cuenta fue comprometida por un mensaje falso. Si te llega algo raro de mi parte " +
  "pidiendo plata, códigos o datos, NO respondas. Confírmame por otro medio antes de hacer nada. " +
  "Ya estoy recuperando la cuenta.";

export const NO_HACER = [
  "No respondas el mensaje ni les digas que te diste cuenta: solo confirmas que tu número está activo.",
  "No llames al número que te escribieron, ni siquiera para reclamar. Usa siempre el número oficial.",
  "No borres las conversaciones todavía: son la prueba del reporte.",
  "No pagues nada más «para recuperar lo perdido». Esa es la segunda estafa, y es muy común.",
];

// Devuelve los pasos que aplican a las acciones marcadas, ordenados por minuto.
export function planPara(acciones) {
  if (!acciones.length) return [];
  return PASOS
    .filter((p) => p.para.some((a) => acciones.includes(a)))
    .sort((a, b) => a.minuto - b.minuto);
}
