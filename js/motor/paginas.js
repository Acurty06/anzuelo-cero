// Análisis de enlaces y dominios. Funciones puras, sin dependencias.

export function normalizar(texto) {
  return (texto || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

// Letras que se parecen a las latinas y se usan para evadir los diccionarios.
const HOMOGLIFOS = {
  "а": "a", "е": "e", "о": "o", "с": "c", "р": "p", "х": "x", "у": "y", "ѕ": "s",
  "і": "i", "ј": "j", "ԁ": "d", "һ": "h", "ɡ": "g", "ⅼ": "l", "α": "a", "ε": "e",
  "ο": "o", "ρ": "p", "τ": "t", "ν": "v", "κ": "k",
  "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "@": "a", "$": "s",
};

// Runs de letras sueltas separadas por signos, espacios o emoji: "c.l.a.v.e".
// Los anclajes impiden que el run se coma letras de las palabras vecinas:
// en "tu c.l.a.v.e ahora" solo debe capturar "c.l.a.v.e".
const PATRON_SEPARADO = /(?<![a-z0-9ñ])(?:[a-z0-9ñ][^a-z0-9ñ]{1,3}){2,}[a-z0-9ñ](?![a-z0-9ñ])/gu;

/**
 * Versión del texto pensada SOLO para los detectores, nunca para mostrar.
 * Deshace dos evasiones: separadores entre letras y homóglifos unicode.
 * Devuelve el texto compactado y el mapa de tramos que se colapsaron, para
 * poder resaltar en pantalla el fragmento original y no el reconstruido.
 */
export function compactar(textoNorm) {
  // El plegado de homóglifos se aplica palabra por palabra y solo donde ya hay
  // una letra, para no destrozar cifras y montos ("482913" queda intacto,
  // "cl@ve" se convierte en "clave").
  const base = (textoNorm || "").replace(/\S+/gu, (palabra) => {
    if (!/\p{L}/u.test(palabra)) return palabra;
    return palabra.replace(/./gu, (c) => HOMOGLIFOS[c] ?? c);
  });
  const tramos = [];
  const texto = base.replace(PATRON_SEPARADO, (run) => {
    const unido = run.replace(/[^a-z0-9ñ]/gu, "");
    // Solo vale la pena si queda una palabra de longitud razonable.
    if (unido.length < 4) return run;
    tramos.push({ original: run.trim(), compacto: unido });
    return unido;
  });
  return { texto, tramos };
}

// Extrae hosts de URLs escritas en el texto o en el campo de URL.
export function extraerHosts(texto, url) {
  const candidatos = [];
  const patron = /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|co|net|org|gov|edu|info|xyz|site|online|me|ly|io|app)(?:\.co)?(?:\/[^\s]*)?)/gi;
  const texto_ = (texto || "");
  for (const m of texto_.matchAll(patron)) candidatos.push(m[0]);
  if (url) candidatos.push(url);

  const hosts = new Set();
  for (const c of candidatos) {
    try {
      const conProtocolo = /^https?:\/\//i.test(c) ? c : "http://" + c;
      const host = new URL(conProtocolo).hostname.toLowerCase().replace(/^www\./, "");
      if (host.includes(".")) hosts.add(host);
    } catch (_) {
      // Entrada que no es una URL válida: se ignora.
    }
  }
  return [...hosts];
}

// Distancia de Levenshtein entre dos cadenas.
export function levenshtein(a, b) {
  const filas = b.length + 1;
  let previa = Array.from({ length: filas }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const actual = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      actual[j] = Math.min(previa[j] + 1, actual[j - 1] + 1, previa[j - 1] + costo);
    }
    previa = actual;
  }
  return previa[b.length];
}

// Clasifica un host como acortado, oficial, imitación de marca o desconocido.
export function clasificarHost(host, config) {
  if (config.acortadores.includes(host)) return "acortado";

  // Oficial por límite DNS: el dominio exacto o cualquier subdominio suyo.
  // Debe evaluarse ANTES de buscar marcas, o "pagos.bancolombia.com" se
  // confundiría con una imitación. "bancolombia.com.atacante.co" no termina
  // en ".bancolombia.com", así que sigue sin ser oficial.
  for (const oficial of config.dominiosOficiales) {
    if (host === oficial || host.endsWith("." + oficial)) return "oficial";
  }

  const base = host.split(".")[0];
  for (const marca of config.marcas) {
    if (host.includes(marca)) return "imitacion";
    const tolerancia = marca.length >= 6 ? 2 : 1;
    if (base !== marca && levenshtein(base, marca) <= tolerancia) return "imitacion";
  }
  return "desconocido";
}
