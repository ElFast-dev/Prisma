# Espectro

Espectro es el análisis cinematográfico personal de Prisma. Se ejecuta en el dispositivo, utiliza datos locales ya guardados y conserva sus instantáneas en IndexedDB. La información cinematográfica que falta se puede consultar directamente a TMDB por identificador, sin tener que abrir una ficha.

## Versión del algoritmo

La versión activa es **2.3.0** (`SPECTRO_ALGORITHM_VERSION`). Todo cambio de lógica que pueda alterar los resultados debe incrementar esta versión. Las instantáneas se identifican por versión y huella de entrada; las versiones anteriores nunca sustituyen un cálculo 2.3.0.

## Información que utiliza

Espectro combina señales que Prisma puede verificar:

- Calificaciones, fechas y revisionados de visionados.
- Géneros TMDB (identificadores y nombres).
- Directores y reparto principal.
- Palabras clave temáticas de TMDB, como memoria, identidad o viajes en el tiempo.
- Países de producción y década de estreno.
- Idioma original y duración.
- Favoritos marcados explícitamente en Biblioteca.
- Películas candidatas del catálogo local, incluidas las que el propietario ha marcado como Pendientes. Las Vistas y cualquier título con un visionado registrado quedan excluidos.

Los comentarios y textos libres no se interpretan mediante un modelo lingüístico: no se les atribuye un sentimiento o preferencia que Prisma no pueda verificar. Tampoco se envían el historial, el perfil o sus inferencias a terceros.

Cuando existen visionados sin calificación, Espectro puede hacer una pregunta contextual en la propia vista: pide una nota del 1 al 10 para una experiencia registrada, sin abrir la ficha. La respuesta actualiza solo el campo de calificación de ese visionado y vuelve a calcular el perfil. Se formula como máximo una pregunta cada 24 horas y se puede posponer; no se crean experiencias nuevas ni se alteran fechas, revisionados o comentarios.

## Obtención automática de metadatos

Cuando Espectro detecta campos cinematográficos que faltan, solicita a TMDB los detalles, créditos y palabras clave temáticas usando el identificador TMDB local. Los tres recursos se guardan en la caché local; no es necesario abrir la ficha.

- Prioriza las películas Pendientes, después los favoritos y los visionados, además de candidatas locales no guardadas. Las Pendientes permanecen elegibles para recomendaciones cuando sus metadatos son suficientes.
- Consulta detalles, créditos y palabras clave; no descarga proveedores ni recomendaciones solo para construir el perfil.
- Reutiliza la caché local de TMDB antes de hacer una solicitud nueva.
- Limita el ritmo de consultas, reintenta errores temporales y respeta el tiempo indicado por TMDB ante HTTP 429.
- Los errores repetidos quedan en pausa automática durante 12 horas, pero Espectro mantiene visibles esas películas pendientes y permite forzar un reintento manual desde la misma vista.
- Registra películas no encontradas (404) para no repetir consultas inútiles.
- Si falta la credencial TMDB, no hace solicitudes y muestra cómo configurarla.
- Si se pierde la conexión, conserva el progreso y continúa cuando vuelve la conexión.
- La cola no borra datos ni crea películas duplicadas: solo completa metadatos de registros que ya existen.

El proceso actualiza exclusivamente campos cinematográficos del registro de película: títulos, sinopsis, estreno, duración, géneros, países, idioma, palabras clave, póster, fondo, dirección y reparto. No modifica visionados, secuencias, calificaciones, fechas, comentarios, favoritos, estados de Biblioteca, colecciones, perfil ni preferencias.

## Afinidades y respaldo

- El promedio personal y cada afinidad se calculan por película distinta. Los revisionados se promedian dentro de cada título y no multiplican la muestra.
- Una afinidad aparece con un mínimo de dos películas distintas. Con dos títulos se etiqueta como inicial y no se usa para recomendar.
- La diferencia observada se reduce hacia el promedio personal mediante `diferencia × n / (n + 3)`. Es una regularización explícita, no una probabilidad ni un intervalo de confianza.
- El respaldo combina cantidad de títulos distintos y dispersión de sus valoraciones.
- Las afinidades moderadas y sólidas pueden intervenir en recomendaciones. Las señales iniciales o variables no sostienen por sí solas una recomendación.
- Un favorito es una señal declarada explícitamente. No se transforma en una calificación ni aumenta el promedio de notas.
- Las señales ausentes no se inventan.

## Patrones combinados

La versión 2.3.0 detecta algunas combinaciones de rasgos que se asocian con notas distintas de lo que explicarían sus componentes por separado. Por ejemplo, puede estudiar si un género unido a un tema presenta un resultado diferente del efecto individual del género y del tema.

- Se comparan familias acotadas: género con temas, dirección, país, época, duración o idioma; además, dirección con temas y país con temas.
- Cada película aporta una sola observación por combinación. Los revisionados se promedian dentro de cada título y no multiplican el tamaño de la muestra.
- Se calcula primero la nota media observada en la combinación y se compara con una expectativa aditiva construida a partir del promedio personal y de las diferencias individuales de cada rasgo.
- La diferencia adicional se modera mediante `n / (n + 5)`. Es una regularización para reducir extremos cuando hay pocas películas, no una probabilidad ni una prueba de significación.
- Solo se muestran combinaciones respaldadas por al menos cuatro películas distintas y cuya diferencia adicional ajustada alcanza 0,35 puntos en valor absoluto.
- Cada resultado incluye categoría, combinación, nota observada, expectativa aditiva, diferencia ajustada, dispersión, número de películas y hasta tres títulos de evidencia. El tamaño de muestra corresponde a todas las películas que respaldan la combinación, no solo a los ejemplos visibles.
- Se muestran asociaciones positivas y negativas. Una asociación no demuestra que la combinación cause una mejor o peor valoración.
- Las combinaciones se calculan con características verificables de TMDB; si faltan datos o la muestra es insuficiente, no se inventa un hallazgo.
## Encaje y nota prevista

Cada candidata local puede mostrar dos estimaciones distintas:

**Encaje (0–100 %).** Es una puntuación relativa que resume señales positivas y negativas de ocho familias: género, dirección, reparto, temas, país, época, idioma y duración. Las coincidencias se limitan dentro de cada familia para que muchos actores, géneros o palabras clave no multipliquen artificialmente su peso. Las afinidades negativas restan encaje. Los favoritos añaden un refuerzo explícito moderado a las familias coincidentes.

La escala se centra en 50 y transforma la diferencia ponderada mediante `50 + 12,5 × diferencia`, limitada al intervalo 0–100. Un valor superior a 50 indica un encaje neto positivo. **No es una probabilidad de que la película guste ni una garantía.**

**Nota prevista (0–10).** Parte del promedio personal por película y suma la diferencia ajustada ponderada de las señales que proceden de calificaciones. Se limita al intervalo 0–10. Los favoritos no cambian esta predicción. Cuando no hay respaldo suficiente para proyectar una diferencia, la estimación se mantiene en el promedio personal.

Los niveles de respaldo (Inicial, Moderada, Sólida, Variable y Explícita) son etiquetas descriptivas; no son probabilidades ni intervalos de confianza estadísticos.

## Grafo cinematográfico y trazabilidad

El apartado «Mapa cinematográfico» representa una red calculada desde las películas locales y sus metadatos. No es una ilustración prediseñada ni un algoritmo de recomendaciones oculto detrás de ella: cada nodo y cada vínculo corresponden a datos que Prisma puede señalar.

- Cada película es un nodo; los otros nodos representan géneros, directores, actores y palabras clave temáticas procedentes de TMDB.
- Cada arista conecta una película con uno de sus rasgos. Su fuerza está entre 0 y 1 y se expresa visualmente mediante grosor y brillo. Una señal positiva, negativa, explícita (favorito) o neutral determina su color.
- El tamaño de las películas y los rasgos representa influencia relativa dentro de su tipo de nodo. Para una película combina sus conexiones ponderadas y cuántas recomendaciones locales alcanza; para un rasgo combina la fuerza de sus conexiones y cuántas recomendaciones lo utilizan. No es una probabilidad.
- La fuerza de una conexión respaldada por una candidata utiliza la magnitud de su contribución. En una película sin motivo de recomendación directo, utiliza la diferencia ajustada de su afinidad y el tamaño de la muestra. Si todavía no hay señales aprendidas, la conexión se dibuja tenue.
- Los favoritos permanecen como declaración explícita de Biblioteca. Se distinguen con una marca en el nodo de película y nunca se convierten en una calificación inventada.
- Las candidatas recomendadas también aparecen como películas locales en el mapa. El apartado Recomendaciones expone por separado su encaje, nota prevista y contribuciones que explican cada resultado.

### Agrupación por similitud

Las películas se agrupan a partir de cuatro familias que existen en el mapa: género, dirección, reparto y temas. Para cada par de películas se calcula el solapamiento Jaccard en cada familia y se combina con estos pesos: género 0,30; dirección 0,20; actores 0,18; temas 0,32.

Dos títulos se conectan cuando alcanzan similitud de 0,31 y comparten al menos dos rasgos, o cuando alcanzan 0,55 con un rasgo compartido. Los grupos se construyen uniendo componentes y se limitan a 24 películas por grupo para evitar que una cadena de similitudes arrastre todo el catálogo. Las posiciones se distribuyen de forma determinista dentro de cada zona.

- Para proteger la lectura del mapa, los títulos sin conexiones similares suficientes se distribuyen en zonas deterministas de hasta ocho películas; no se les atribuye una similitud inventada.
- La generación de parejas depende de cuántas películas comparten cada rasgo: un rasgo muy frecuente produce más combinaciones que evaluar. La prueba de escala utiliza un catálogo ficticio de 821 títulos y no sustituye una comprobación visual con datos reales.

Las películas con visionados aparecen como exploradas. Los títulos locales sin visionados y los rasgos conectados únicamente con títulos no vistos se atenúan. Esto describe lo que todavía no has explorado en Prisma, no el catálogo mundial de TMDB. Cuando faltan palabras clave, el mapa no inventa temas.

El buscador resalta nodos y conexiones; al seleccionar una película se muestran sus rasgos, la fuerza de cada vínculo y sus estimaciones disponibles. Al seleccionar un rasgo se enumeran las películas que lo comparten. Así es posible recorrer la red sin abrir cada ficha.


## Evolución temporal

- La evolución mensual conserva las calificaciones de visionados reales y muestra solo meses con actividad.
- Los cambios de afinidad comparan los últimos doce meses disponibles con los doce anteriores, tomando como referencia la fecha de calificación más reciente.
- Cada película aporta como máximo una observación por periodo; los revisionados se promedian dentro de ese periodo.
- Solo se muestra un cambio para un rasgo con al menos tres películas distintas en cada periodo.
- Si no existe muestra suficiente, Espectro indica que no hay periodos comparables en lugar de dibujar una tendencia ficticia.

## Huella e instantáneas

La huella incluye visionados, calificaciones, fechas, metadatos utilizados (incluidas las palabras clave), identificadores de candidatas y favoritos. Los cambios de metadatos o de películas elegibles invalidan la instantánea. El identificador utiliza dos hashes ligeros concatenados; no es una firma criptográfica. La versión 2.3.0 usa una clave de instantánea distinta de las versiones anteriores, sin migrar ni eliminar registros Dexie. Las instantáneas antiguas se conservan, pero no se reutilizan para el nuevo contrato que incluye patrones combinados.

Antes de calcular, el repositorio comprueba si ya existe una instantánea de la versión y huella actuales. Así evita repetir el análisis cuando la entrada no ha cambiado.

## Límites conocidos

- La precisión depende de la diversidad de las valoraciones y de los metadatos disponibles en el dispositivo.
- El encaje es un orden relativo, no una probabilidad calibrada.
- La nota prevista es una proyección de las valoraciones conocidas, no una promesa sobre la reacción futura del usuario.
- Las recomendaciones solo pueden salir de candidatas que Prisma ya tenga localmente. Las películas Pendientes se incluyen cuando disponen de metadatos suficientes; las Vistas y los títulos con visionados quedan excluidos. Espectro no realiza búsquedas ilimitadas por su cuenta.
- Una afinidad es una asociación en los datos registrados, no una relación causal ni una preferencia permanente.
- Los comentarios escritos todavía no se interpretan como señales semánticas.

## Principios

- Local-first y privacidad por diseño.
- Diferenciar observaciones, preferencias declaradas e inferencias.
- No presentar preferencias concluyentes con muestras pequeñas.
- Explicar recomendaciones con datos verificables y evidencia visible.
- Preservar compatibilidad mediante versionado y huellas.
- Enriquecer solo metadatos cinematográficos; no alterar experiencias personales.
