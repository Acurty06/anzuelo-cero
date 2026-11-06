# Anzuelo Cero

Herramienta web contra el phishing dirigida a estudiantes universitarios jóvenes.
Proyecto del hackathon «No Muerdas el Anzuelo» — IEEE Computer Society,
Universidad de La Sabana, noviembre de 2026.

**Reflejo, pausa y plan.** La aplicación cubre los tres momentos en que todavía
se puede intervenir el problema:

| Pilar | Momento | Qué hace |
|---|---|---|
| **Prevención** | Antes | Simulacro cronometrado de 10 segundos, biblioteca de señales, canales de llegada, mitos y palabra clave familiar. |
| **Detección** | Durante | Pegas el mensaje o el enlace. Si el caso es ambiguo pregunta **antes** de dar un veredicto, y muestra las razones subrayadas sobre el texto. |
| **Mitigación** | Después | Asistente guiado que interpreta tu relato y arma un plan de 5 minutos ordenado por urgencia, con cronómetro y aviso listo para enviar. |

---

## El hallazgo que define el producto

Encuestamos a 70 estudiantes. Quienes **sí** habían hecho clic en un enlace
falso sacaron **4.28 de 5** en el quiz de reconocimiento de phishing; quienes
**no** habían hecho clic sacaron **4.42**. Catorce centésimas de diferencia.

Saber reconocer el phishing no evita caer. Por eso el simulacro es
**cronometrado**: entrena la decisión bajo presión, que es donde falla la
gente, en vez de repetir una teoría que ya se sabe.

Dos reglas que la aplicación nunca rompe:

- **Nunca dice que un mensaje es seguro.** Como mucho dice «Sin señales de
  alerta», que es una afirmación sobre lo que no encontró.
- **Nunca cambia un veredicto ya mostrado.** Las preguntas de seguimiento se
  hacen antes de emitirlo, no después.

---

## Cómo ejecutarla

La aplicación lee sus archivos de configuración con `fetch`, así que **no
funciona abriendo `index.html` con doble clic**. Necesita un servidor local.

```bash
cd anzuelo-cero
python3 -m http.server 8000
```

Luego abre <http://localhost:8000>. Deja la terminal abierta mientras la usas;
`Ctrl+C` detiene el servidor.

> En Windows, si `python3` no funciona, usa `python -m http.server 8000`.
> Si ya habías servido una versión anterior en el mismo puerto, recarga con
> `Ctrl+F5` para saltarte la caché del navegador.

### Publicar en GitHub Pages

1. Sube el contenido de esta carpeta a la raíz del repositorio.
2. En *Settings → Pages*, elige la rama `main` y la carpeta raíz.
3. El sitio queda en `https://<usuario>.github.io/<repo>/`.

El repositorio debe ser público para que Pages funcione sin plan pago.

---

## Arquitectura

Sitio estático sin backend. JavaScript moderno con módulos ES nativos, sin
framework ni dependencias de ejecución. Alrededor de 2.100 líneas entre lógica
y configuración.

La decisión de no tener servidor es deliberada y responde a tres razones: si no
hay servidor el mensaje que la persona pega no puede viajar a ninguna parte y
eso es verificable leyendo el código; el costo marginal por usuario es cero; y
no hay despliegue que se caiga durante una demostración.

```
index.html                  App completa (los tres pilares en una página)
registro.html               Registro de la prueba técnica (uso interno)
ya-hice-clic.html           Redirección a la sección de Mitigación
css/estilos.css             Estilos (paleta compartida con el pitch deck)

js/app.js                   Navegación y pantalla de detección
js/prevencion.js            Simulacro, palabra clave y contenido educativo
js/mitigacion.js            Plan de 5 minutos y cronómetro
js/asistente.js             Asistente guiado de mitigación (conversación)
js/aprendizaje.js           Carga del corpus, decisión del modelo y correcciones
js/registro.js              Registro anónimo de la prueba técnica

js/motor/analizar.js        Orquestador: decide si preguntar o dar veredicto
js/motor/senales.js         Detectores de señales sobre texto y URL
js/motor/paginas.js         Normalización, dominios y distancia de Levenshtein
js/motor/veredicto.js       Umbrales, categorías y reglas de seguridad
js/motor/recomendaciones.js Texto de acción por señal
js/motor/modelo.js          Clasificador Naive Bayes entrenable
js/motor/decision.js        Contrato: el modelo decide, las reglas ponen piso

js/datos/simulacro.js       Mensajes del simulacro cronometrado
js/datos/educacion.js       Biblioteca de señales, canales y mitos
js/datos/plan.js            Acciones y pasos del plan de mitigación
js/datos/asistente.js       Patrones de interpretación del relato

config/reglas.json          Umbrales, puntajes, palabras, marcas y dominios
config/corpus-semilla.json  Corpus de entrenamiento inicial (sintético)
tests/lib/evaluacion.mjs    Biblioteca compartida de métricas (fuente única)
tests/                      Pruebas (64) y scripts de evaluación reproducibles
```

Todo lo que está bajo `js/motor/` son funciones puras: no tocan el DOM ni la
red, y son las únicas con pruebas unitarias.

---

## El motor de reglas

El texto se normaliza y se contrasta contra diccionarios configurables. Cada
señal aporta un puntaje y los fragmentos que la activaron, que son los que
después se resaltan en pantalla.

| Señal | Puntos |
|---|---:|
| Pide pagar o consignar | 3 |
| Pide clave, código o datos | 3 |
| Premio que exige pagar | 3 |
| Urgencia | 2 |
| Enlace acortado | 2 |
| Dominio que imita una marca | 2 |
| Dominio desconocido | 1 |
| Presiona a hacer clic | 1 |
| Pide dinero sin instrucciones de pago | 0 |
| Menciona un enlace sin URL visible | 0 |

Las señales de **cero puntos** son intencionales. «hola hijo necesito 10k» no
tiene urgencia explícita, ni enlace, ni petición de clave: un motor puramente
aditivo lo declararía inofensivo. Al marcarlo como ambiguo sin sumarle riesgo,
el sistema puede pedir contexto en lugar de inventarse una certeza.

**Veredictos:** `Peligroso` desde 6 puntos, `Sospechoso` desde 3,
`No concluyente` ante señales ambiguas, y `Sin señales de alerta` en el resto.

**Regla de seguridad:** si el mensaje contiene cualquier señal de solicitud de
dinero o de datos, el resultado **nunca** puede ser «Sin señales de alerta»,
ni siquiera cuando las respuestas de seguimiento bajen el puntaje a cero.

La detección de dominios que imitan marcas usa distancia de Levenshtein con
umbral de una edición, ampliado a dos para marcas de seis caracteres o más.
Así `bancolombla.com` se marca como imitación de `bancolombia.com`.

---

## El modelo entrenable

Además del motor de reglas hay un **clasificador Naive Bayes multinomial** que
sí aprende, en `js/motor/modelo.js`.

- Arranca entrenado con `config/corpus-semilla.json`.
- Cada corrección del usuario («sí era phishing» / «no, era legítimo») se suma
  al modelo y surte efecto de inmediato.
- **No es caja negra:** muestra qué palabras empujaron la decisión, en qué
  dirección y con qué peso.
- **El clasificador decide la etiqueta.** Las reglas solo aportan un piso de
  cautela y nunca pueden bajar el nivel que fijó el modelo. El contrato está en
  `js/motor/decision.js` y probado en `tests/decision.test.js`.

La tokenización descarta palabras cortas y vacías, y agrega cuatro tokens
construidos que capturan formato más que vocabulario: `«cifra»`, `«monto»`,
`«enlace»` y `«corto»`. Agrupar las cifras evita que el modelo memorice
números concretos del corpus.

## El contrato de decisión

Una versión anterior llamaba al sistema «híbrido» sin serlo: la interfaz usaba
siempre el veredicto de reglas. Una auditoría externa lo señaló y la
arquitectura se rehízo. El contrato actual, en `js/motor/decision.js`:

1. El **clasificador decide** la etiqueta phishing o legítimo. Esa decisión
   gobierna el veredicto que ve el usuario.
2. Las **reglas aportan un piso** de cautela, basado solo en evidencia dura que
   el modelo no puede ver: peticiones de dinero o datos, enlaces acortados y
   dominios que imitan una marca. El modelo solo lee palabras; no sabe leer una
   URL.
3. El veredicto final es el **máximo** entre ambos niveles. Las reglas pueden
   hacer la respuesta más cautelosa, nunca más tranquilizadora.

Ante desacuerdo la etiqueta final es la del modelo, y cuando las reglas elevan
el nivel la aplicación lo dice en pantalla. El umbral es **0.5**, el punto
neutro del clasificador; no se movió para ajustar métricas.

## Desempeño

```bash
node tests/evaluar-sistema.mjs    # métricas del sistema
node tests/evaluar-auditoria.mjs  # + calibración y desglose por pliegue
```

Ambos scripts importan `tests/lib/evaluacion.mjs`, que es la única fuente de
las métricas: no pueden reportar cifras distintas para la misma medición.
**Los dos corpus son sintéticos**, así que ninguna cifra estima desempeño
frente a phishing real.

Sobre el corpus semilla, con validación cruzada estratificada de 5 pliegues:
**88.0% ± 5.3 pp** de exactitud, con el peor pliegue en 81.3% y el mejor en
96.8%. La desviación no es un defecto del informe sino del tamaño del corpus:
con unos treinta mensajes por pliegue, un puñado de errores mueve el resultado
varios puntos.

Sobre el conjunto externo de 40 mensajes que escribió la auditoría:

| Configuración | Exactitud | Sensibilidad | Precisión | FP | FN |
|---|---:|---:|---:|---:|---:|
| Solo el modelo | 90.0% | 80.0% | 100.0% | 0 | 4 |
| Solo las reglas | 77.5% | 75.0% | 78.9% | 4 | 5 |
| **Sistema completo** | **90.0%** | **95.0%** | 86.4% | 3 | **1** |

La última fila es lo que ve el usuario. Combinar baja los falsos negativos de
cuatro a uno a cambio de tres falsas alarmas: para phishing ese intercambio es
favorable, porque una falsa alarma cuesta una verificación innecesaria y un
falso negativo cuesta la cuenta.

### Advertencias que hay que decir en voz alta

1. **El corpus semilla es SINTÉTICO.** Los 158 mensajes (80 phishing, 78
   legítimos) fueron redactados por el equipo; no se recolectaron de usuarios
   reales. El archivo lo declara en su campo `origen` y hay una prueba
   automática que falla si esa declaración se pierde.
2. **El desempeño medido no predice el mundo real.** Ese 90% mide coherencia
   interna del corpus, es decir si el modelo aprendió los patrones de quien
   escribió los mensajes. No mide desempeño frente a phishing real colombiano.
3. **El aprendizaje es local.** Cada persona entrena su propia copia en su
   navegador. Lo que tú le enseñas no le llega a nadie más. Un modelo que
   mejore para todos necesitaría servidor, base de datos y consentimiento
   explícito, y eso está en la hoja de ruta.

---

## El asistente guiado de mitigación

**No es un modelo de lenguaje.** Es un intérprete de patrones explícitos sobre
el relato que escribe la persona. Las razones: un sitio estático no puede
invocar un modelo externo sin exponer una clave de API, el funcionamiento sin
conexión es deseable en una emergencia, y la explicabilidad es coherente con el
resto del producto. La interfaz lo dice así para no inducir a error.

El intérprete extrae **acciones** (qué alcanzó a hacer la persona, entre seis
categorías ordenadas por urgencia) y **contextos** (situaciones que modifican
el consejo: pérdida de acceso, WhatsApp, banco de por medio, suplantación hacia
los contactos, patrón de segunda estafa). Si no identifica ninguna acción,
cambia a un triaje de preguntas cerradas.

---

## Pruebas

```bash
npm test
```

Son **64 pruebas**, todas pasando y ninguna marcada como pendiente:

- **16 sobre el motor de reglas:** detección de cada señal, umbrales, la regla
  de seguridad sobre dinero y datos, la negación «no la compartas», la
  imitación de dominios y el orden del flujo de preguntas.
- **14 sobre el modelo:** tokenización, declaración del corpus como sintético,
  balance de clases, modelo vacío, clasificación en ambas direcciones, el caso
  difícil del código legítimo, explicaciones, aprendizaje incremental,
  confianza y reproducibilidad.
- **21 adversarias** (`tests/auditoria-adversaria.test.js`): las evasiones que
  encontró la auditoría y sus regresiones.
- **13 del contrato de decisión** (`tests/decision.test.js`): que el modelo
  gobierna la etiqueta y que las reglas solo suben.

### Lo que encontró la auditoría

Una auditoría adversaria independiente halló cuatro fallos, todos corregidos y
todos con prueba de regresión. El más grave: la regla de «no la compartas»
anulaba **toda** la detección de datos, así que «No compartas tu clave conmigo;
escríbela aquí para validar» salía como *Sin señales de alerta*. También
burlaban los diccionarios los separadores y emoji entre letras («c.l.a.v.e»),
y los subdominios legítimos como `pagos.bancolombia.com` se marcaban como
imitación. Se añadieron además un límite de entrada y un tope de dos
correcciones por mensaje contra el envenenamiento del modelo local.

La evaluación del modelo también se puede correr desde la interfaz, con el
botón «Ver qué tan bien le va».

### Registro para la prueba técnica

Añade `?prueba=1` a la URL para activar el registro anónimo. Guarda señales,
respuestas, puntaje y veredicto en el navegador, y **nunca** el texto original
ni el enlace. `registro.html` permite verlo, exportarlo en CSV o borrarlo.

---

## Privacidad

Todo ocurre en el navegador. No hay servidor, no hay base de datos y nada se
envía a ningún lado.

El análisis **no guarda** el texto que la persona pega. La única excepción es
explícita y bajo su control: si pulsa el botón para corregir al modelo, ese
mensaje queda en `localStorage` de su propio navegador para que el clasificador
lo use, y hay un botón «Borrar lo que le enseñé» que lo elimina todo. La
palabra clave familiar, la mejor marca del simulacro y el progreso del plan se
guardan igual: solo en el dispositivo de cada persona.

---

## Limitaciones conocidas

- El corpus de entrenamiento es sintético y lo escribió el mismo equipo que
  diseñó el clasificador, con el riesgo evidente de que el modelo esté
  aprendiendo nuestro estilo de redacción.
- La lista de marcas y dominios oficiales es corta; cualquier marca ausente
  produce la señal de dominio desconocido.
- El motor no resuelve el destino real de los enlaces acortados, porque eso
  exigiría una petición de red que rompería la arquitectura sin servidor.
- El aprendizaje del modelo es estrictamente local.
- El canal de llamadas telefónicas, que el 67% de la muestra reporta recibir,
  queda fuera del alcance de una herramienta basada en texto.
- El puntaje del clasificador **no está calibrado** y tiende a valores
  extremos, por eso se muestra como similitud con el corpus y nunca como
  probabilidad de fraude.
- La detección de homóglifos cubre una tabla acotada: una sustitución fuera de
  ella seguiría evadiendo los diccionarios.
- La encuesta base es una muestra de conveniencia de 70 estudiantes, en su
  mayoría de 18 a 20 años de una sola universidad.
- No se alcanzó a ejecutar la prueba con 30 mensajes reales etiquetados de
  forma independiente ni la prueba con usuarios observados. Sin ellas no
  podemos afirmar que la herramienta mejore la decisión de nadie, solo que
  funciona como fue especificada.

## Hoja de ruta

1. Construir un conjunto de prueba con mensajes reales etiquetados de forma
   independiente del equipo, y correr la prueba con usuarios observados.
2. Ampliar la lista de marcas y dominios oficiales.
3. Sustituir el corpus sintético por uno recolectado con consentimiento.
4. Entrenamiento fuera de línea sobre ese corpus real, con despliegue de los
   pesos aprendidos como archivo estático; conserva la arquitectura sin
   servidor y la promesa de privacidad.
5. Aprendizaje compartido entre usuarios, con la infraestructura y el diseño de
   consentimiento que hoy no tenemos.
