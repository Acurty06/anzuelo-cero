// Detección de señales. Cada detector devuelve una lista de señales con su puntaje.
// Las señales con puntos 0 no suman riesgo, pero sí marcan el caso como ambiguo.

import { clasificarHost, compactar, extraerHosts } from "./paginas.js";

const MONTO = /(\$\s?\d[\d.,]*)|(\b\d+(?:[.,]\d+)?\s?(?:k|mil|millones)\b)|(\b\d{1,3}(?:[.,]\d{3})+\b)/;

// Plantilla de "aquí tienes tu código": una credencial seguida de un verbo ser.
// Es el único contexto en que una negación puede anular la señal de datos.
const ENTREGA_CREDENCIAL = /\b(codigo|clave|pin|token|contrasena)\b[^.!?]{0,60}?\bes\b/;

/**
 * Busca palabras del diccionario en el texto normal y en el compactado.
 * Si solo aparece en el compactado (porque venía con separadores o
 * homóglifos), devuelve el fragmento ORIGINAL para poder resaltarlo.
 */
function buscar(textoNorm, compacto, palabras) {
  const encontrados = [];
  for (const p of palabras) {
    if (textoNorm.includes(p)) {
      encontrados.push(p);
    } else if (compacto.texto.includes(p)) {
      const tramo = compacto.tramos.find((t) => t.compacto.includes(p));
      encontrados.push(tramo ? tramo.original : p);
    }
  }
  return encontrados;
}

/**
 * ¿La negación debe anular la señal de datos?
 * Solo cuando el mensaje ENTREGA una credencial y advierte no compartirla,
 * que es el patrón legítimo de los códigos de un solo uso. Si además aparece
 * un verbo de entrega ("escríbela aquí", "envíamelo"), la petición manda y la
 * negación no anula nada: ese es el truco de "no la compartas... conmigo sí".
 */
function negacionAnula(textoNorm, compacto, config) {
  const hayNegacion = buscar(textoNorm, compacto, config.palabras.negacion_datos).length > 0;
  if (!hayNegacion) return false;

  const pideEntrega = buscar(textoNorm, compacto, config.palabras.verbos_entrega).length > 0;
  if (pideEntrega) return false;

  return ENTREGA_CREDENCIAL.test(textoNorm) || ENTREGA_CREDENCIAL.test(compacto.texto);
}

export function detectarSenales(textoNorm, url, config) {
  const p = config.puntos;
  const compacto = compactar(textoNorm);
  const senales = [];
  const hallar = (palabras) => buscar(textoNorm, compacto, palabras);

  const urgencia = hallar(config.palabras.urgencia);
  if (urgencia.length) {
    senales.push({ tipo: "urgencia", puntos: p.urgencia, fragmentos: urgencia });
  }

  const pagos = hallar(config.palabras.pide_pago);
  const premio = hallar(config.palabras.premio);
  if (pagos.length) {
    senales.push({ tipo: "pide_pago", puntos: p.pide_pago, fragmentos: pagos });
  }
  if (premio.length && pagos.length) {
    senales.push({ tipo: "premio_con_pago", puntos: p.premio_con_pago, fragmentos: premio });
  }

  // Datos sensibles: la negación solo anula en el patrón de entrega de código.
  const datos = negacionAnula(textoNorm, compacto, config)
    ? []
    : hallar(config.palabras.pide_datos);
  if (datos.length) {
    senales.push({ tipo: "pide_datos", puntos: p.pide_datos, fragmentos: datos });
  }

  // Solicitud de dinero sin instrucciones de pago: 0 puntos, pero marca ambigüedad.
  const pideDinero = hallar(config.palabras.solicitud_dinero);
  const montoMatch = textoNorm.match(MONTO);
  if (!pagos.length && (pideDinero.length || montoMatch)) {
    const fragmentos = [...pideDinero];
    if (montoMatch) fragmentos.push(montoMatch[0].trim());
    senales.push({ tipo: "solicitud_dinero_sin_pago", puntos: 0, fragmentos });
  }

  // Enlaces: solo el texto del mensaje y la URL del campo.
  const llamadoEnlace = hallar(config.palabras.llamado_enlace);
  const hosts = extraerHosts(textoNorm, url);
  if (llamadoEnlace.length && urgencia.length) {
    senales.push({ tipo: "llamado_clic_urgente", puntos: p.llamado_clic_urgente, fragmentos: llamadoEnlace });
  } else if (llamadoEnlace.length && hosts.length === 0) {
    senales.push({ tipo: "menciona_enlace", puntos: 0, fragmentos: llamadoEnlace });
  }

  for (const host of hosts) {
    const clase = clasificarHost(host, config);
    if (clase === "acortado") {
      senales.push({ tipo: "enlace_acortado", puntos: p.enlace_acortado, fragmentos: [host] });
    } else if (clase === "imitacion") {
      senales.push({ tipo: "dominio_imitacion", puntos: p.dominio_imitacion, fragmentos: [host] });
    } else if (clase === "desconocido") {
      senales.push({ tipo: "dominio_desconocido", puntos: p.dominio_desconocido, fragmentos: [host] });
    }
    // "oficial" no suma riesgo.
  }

  return senales;
}
