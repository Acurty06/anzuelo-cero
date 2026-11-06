// Contenido educativo del pilar de prevención.

// Biblioteca de señales: qué es, cómo se ve y qué hacer.
export const SENALES_EDU = [
  {
    id: "urgencia",
    titulo: "Te apuran",
    que: "Plazos cortos, amenazas de bloqueo o «último aviso». El objetivo es que no te dé tiempo de pensar.",
    ejemplo: "«Tu cuenta será bloqueada en 2 horas»",
    accion: "La prisa es la señal. Si te apuran, es justo cuando debes parar.",
  },
  {
    id: "datos",
    titulo: "Te piden clave o código",
    que: "Piden contraseña, código de un solo uso, cédula, número de tarjeta o datos bancarios.",
    ejemplo: "«Confirma tu clave para validar tu identidad»",
    accion: "Ningún banco ni servicio real te pide la clave ni el código por mensaje. Nunca.",
  },
  {
    id: "pago",
    titulo: "Te piden plata por adelantado",
    que: "Consignaciones, transferencias a Nequi o Daviplata, «impuestos» o cargos para liberar algo.",
    ejemplo: "«Consigna $80.000 para reclamar tu premio»",
    accion: "Si tienes que pagar para recibir algo, es estafa. Sin excepción.",
  },
  {
    id: "dominio",
    titulo: "La dirección se parece pero no es",
    que: "Cambian una letra, agregan un guion o cambian el final del dominio para imitar una marca.",
    ejemplo: "bancolombla.com · nequi-seguro.co",
    accion: "No hagas clic. Escribe tú mismo la dirección oficial en el navegador o entra desde la app.",
  },
  {
    id: "acortado",
    titulo: "El enlace está acortado",
    que: "bit.ly, tinyurl y similares esconden a dónde te llevan hasta que ya entraste.",
    ejemplo: "bit.ly/dian-pago-co",
    accion: "Si no sabes a dónde va, no entres. Busca la página oficial por tu cuenta.",
  },
  {
    id: "familiar",
    titulo: "Dice ser alguien que conoces",
    que: "Un número nuevo dice ser tu mamá, tu hijo o un amigo, y pide un favor urgente con dinero.",
    ejemplo: "«Hola, cambié de número, préstame 10k»",
    accion: "Llama al número viejo que ya tienes guardado. Nunca respondas solo por el chat nuevo.",
  },
];

// Canales por donde llegan los mensajes, según la encuesta propia (70 respuestas).
export const CANALES = [
  { nombre: "SMS", porcentaje: 80 },
  { nombre: "Llamadas", porcentaje: 67 },
  { nombre: "WhatsApp", porcentaje: 44 },
];

export const MITOS = [
  {
    mito: "«A mí no me pasa, yo sí me doy cuenta»",
    realidad: "En nuestra encuesta, quienes hicieron clic sacaron 4.28 de 5 en el quiz y quienes no, 4.42. Casi lo mismo. Saber reconocerlo no te protege en el momento.",
  },
  {
    mito: "«Si no tiene enlace, no es peligroso»",
    realidad: "Las estafas de suplantación de familiares no usan enlaces. Solo texto y urgencia.",
  },
  {
    mito: "«El banco me va a avisar si algo pasa»",
    realidad: "El banco nunca te pide la clave ni el código por mensaje. Si alguien te los pide diciendo ser el banco, es la estafa.",
  },
  {
    mito: "«Ya hice clic, ya no hay nada que hacer»",
    realidad: "Los primeros minutos importan muchísimo. Cambiar la clave y cerrar sesiones a tiempo evita la mayoría del daño.",
  },
];
