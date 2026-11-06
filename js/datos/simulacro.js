// Mensajes del simulacro cronometrado (pilar de prevención).
// NO se usan en la prueba técnica de 30 mensajes: ese conjunto es independiente.
// Cada caso tiene la respuesta correcta y una explicación corta.

export const SIMULACRO = [
  {
    texto: "Bancolombia: detectamos un acceso no autorizado. Valida tu identidad en bancolombia-seguro.co antes de 2 horas o tu cuenta será bloqueada.",
    trampa: true,
    senal: "Dirección que imita la marca + urgencia",
    explicacion: "El dominio real es bancolombia.com. «bancolombia-seguro.co» solo se parece. Además te presiona con un plazo de 2 horas.",
  },
  {
    texto: "Hola, soy Cami del grupo de cálculo. ¿Mañana nos vemos a las 3 en la biblioteca para el taller?",
    trampa: false,
    senal: "Sin señales de alerta",
    explicacion: "No pide dinero, ni datos, ni tiene enlaces, ni te presiona. Es una conversación normal.",
  },
  {
    texto: "¡FELICIDADES! Ganaste $2.000.000 en nuestro sorteo. Para reclamar tu premio consigna $80.000 por concepto de impuesto a Nequi 320*****12.",
    trampa: true,
    senal: "Premio que exige pagar",
    explicacion: "Un premio real nunca te cobra para entregártelo. Si tienes que pagar primero, es estafa.",
  },
  {
    texto: "Tu código de verificación de WhatsApp es 482-913. No lo compartas con nadie.",
    trampa: false,
    senal: "Mensaje legítimo del servicio",
    explicacion: "El servicio te está enviando tu propio código y te advierte que no lo compartas. El peligro es quien te lo pida después, no este mensaje.",
  },
  {
    texto: "hola hijo, cambié de número, este es el nuevo. necesito que me hagas un favor urgente, préstame 10k que luego te los devuelvo",
    trampa: true,
    senal: "Suplantación de familiar",
    explicacion: "Número nuevo + urgencia + dinero es el patrón clásico. Llama al número viejo que ya tienes guardado antes de enviar nada.",
  },
  {
    texto: "Tu pedido #88213 fue despachado y llega hoy. Sigue el envío desde la app.",
    trampa: false,
    senal: "Sin enlace ni petición",
    explicacion: "Te remite a la app oficial, no a un enlace, y no te pide ningún dato. Si no esperabas un pedido, revisa en la app directamente.",
  },
  {
    texto: "DIAN: usted presenta una obligación pendiente. Descargue el documento aquí: bit.ly/dian-pago-co",
    trampa: true,
    senal: "Enlace acortado + entidad suplantada",
    explicacion: "Un enlace acortado esconde a dónde te lleva. Las entidades públicas no te mandan tu información por un bit.ly.",
  },
  {
    texto: "Profe, le escribo del correo personal porque el institucional no me carga. ¿Alcanzo a entregar el taller mañana?",
    trampa: false,
    senal: "Sin señales de alerta",
    explicacion: "Cambiar de correo es raro pero no pide dinero, datos ni clics. Verificar por otro medio basta.",
  },
];
