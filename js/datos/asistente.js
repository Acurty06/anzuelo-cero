// Conocimiento del asistente guiado de mitigación.
// No es un modelo de lenguaje: es un conjunto de patrones explícitos sobre el
// texto que escribe la persona. Cada respuesta se puede rastrear a un patrón.

// Qué alcanzó a hacer. El orden importa: lo más específico primero.
export const PATRONES_ACCION = [
  {
    id: "dinero",
    patrones: ["envie plata", "envie dinero", "mande plata", "mande dinero", "le transferi", "transferi",
      "consigne", "hice la transferencia", "le gire", "ya pague", "ya le pague", "le deposite", "deposite",
      "le mande", "envie la plata", "pague el impuesto", "pague para reclamar"],
  },
  {
    id: "tarjeta",
    patrones: ["numero de la tarjeta", "datos de la tarjeta", "puse la tarjeta", "di mi tarjeta",
      "escribi la tarjeta", "cvv", "codigo de seguridad de la tarjeta", "mi tarjeta de credito",
      "mi tarjeta debito", "los datos de mi tarjeta"],
  },
  {
    id: "codigo",
    patrones: ["codigo de verificacion", "codigo que me llego", "le di el codigo", "pase el codigo",
      "clave de un solo uso", "codigo de seis digitos", "codigo de 6 digitos", "otp", "token",
      "le mande el codigo", "di el codigo"],
  },
  {
    id: "clave",
    patrones: ["mi contrasena", "la contrasena", "puse mi clave", "escribi mi clave", "ingrese mi clave",
      "metí mi clave", "meti mi clave", "puse la clave", "ingrese mis datos", "inicie sesion",
      "me logue", "puse usuario y contrasena", "password"],
  },
  {
    id: "clic",
    patrones: ["hice clic", "le di clic", "abri el enlace", "abri el link", "entre al enlace",
      "entre al link", "toque el enlace", "abri la pagina", "entre a la pagina", "segui el link",
      "me metí al link", "me meti al link"],
  },
  {
    id: "datos",
    patrones: ["mi cedula", "numero de cedula", "mis datos personales", "mi documento",
      "fecha de nacimiento", "mi direccion", "datos personales"],
  },
];

// Situaciones que cambian el consejo. Se suman al plan como avisos.
export const CONTEXTOS = [
  {
    id: "sin_acceso",
    patrones: ["no puedo entrar", "no me deja entrar", "me sacaron", "cambiaron mi contrasena",
      "cambiaron la contrasena", "perdi la cuenta", "perdi acceso", "me robaron la cuenta",
      "ya no puedo acceder"],
    aviso: "Si ya no puedes entrar, la cuenta está tomada. Usa «olvidé mi contraseña» desde la app o página oficial y, si el correo también lo cambiaron, recupera primero el correo. Ese es el paso que destraba todo lo demás.",
  },
  {
    id: "whatsapp",
    patrones: ["whatsapp", "wasap", "wpp", "guasap"],
    aviso: "En WhatsApp: vuelve a registrar tu número en la app. Eso saca de inmediato a quien lo esté usando. Después activa la verificación en dos pasos con un PIN, en Ajustes → Cuenta.",
  },
  {
    id: "banco",
    patrones: ["banco", "bancolombia", "davivienda", "nequi", "daviplata", "bbva", "cuenta de ahorros",
      "mi cuenta bancaria"],
    aviso: "Llama a tu banco por la línea que aparece en el respaldo de tu tarjeta o dentro de la app oficial. Nunca por un número que te hayan escrito.",
  },
  {
    id: "contactos",
    patrones: ["le escribieron a mis contactos", "estan escribiendo a mis amigos", "se hacen pasar por mi",
      "les escribieron a mis", "mandaron mensajes desde mi", "estan usando mi cuenta"],
    aviso: "Ya están usando tu cuenta contra tus contactos. Avisa en tus grupos ahora mismo, incluso antes de terminar de recuperar la cuenta: cada minuto es alguien más que puede caer.",
  },
  {
    id: "segunda_estafa",
    patrones: ["me pidieron mas plata", "me piden mas plata", "me piden mas dinero", "me pidieron mas dinero",
      "pagar para recuperar", "me volvieron a pedir", "para devolverme", "para devolver el dinero",
      "recuperar lo perdido", "mas plata para", "mas dinero para"],
    aviso: "Cuidado: pedirte más dinero «para recuperar lo perdido» es la segunda estafa, y es muy común. No pagues nada. Nadie legítimo te cobra por devolverte tu propia plata.",
  },
  {
    id: "menor_o_familiar",
    patrones: ["mi mama", "mi papa", "mi abuela", "mi abuelo", "mi tia", "mi tio", "mi hermana", "mi hermano",
      "un familiar", "mi novia", "mi novio"],
    aviso: "Si quien cayó fue un familiar, acompáñalo a hacer los pasos en vez de solo reenviarle esto. La vergüenza hace que mucha gente no reporte, y perder tiempo es lo que más cuesta.",
  },
];

// Preguntas de triaje cuando el relato no deja claro qué pasó.
export const TRIAJE = [
  { id: "dinero", texto: "¿Alcanzaste a enviar dinero, hacer una transferencia o una consignación?" },
  { id: "clave", texto: "¿Escribiste tu contraseña o un código en alguna página o se lo pasaste a alguien?" },
  { id: "clic", texto: "¿Abriste el enlace, aunque no hayas escrito nada?" },
];

export const TIEMPOS = [
  { id: "minutos", etiqueta: "Hace minutos", aviso: "Estás a tiempo. En los primeros minutos una transferencia todavía se puede intentar reversar y una sesión abierta se puede cerrar antes de que hagan daño. Llama al banco ya." },
  { id: "horas", etiqueta: "Hoy", aviso: "Todavía sirve actuar. Haz los pasos en orden y revisa movimientos de las últimas horas, no solo el saldo." },
  { id: "dias", etiqueta: "Hace días o más", aviso: "Aunque haya pasado tiempo, los pasos siguen sirviendo: cambiar claves y cerrar sesiones corta cualquier acceso que siga abierto. Revisa además tus movimientos del período completo." },
];

// Quita tildes y pasa a minúsculas para comparar.
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Devuelve { acciones: [...], contextos: [...] } a partir del relato.
export function interpretar(texto) {
  const t = normalizar(texto);
  const acciones = [];
  for (const grupo of PATRONES_ACCION) {
    if (grupo.patrones.some((p) => t.includes(normalizar(p)))) acciones.push(grupo.id);
  }
  const contextos = CONTEXTOS.filter((c) => c.patrones.some((p) => t.includes(normalizar(p))));
  return { acciones, contextos };
}
