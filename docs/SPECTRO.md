# Espectro

Espectro es el análisis cinematográfico personal de Prisma. Se ejecuta en el dispositivo, utiliza datos locales ya guardados y conserva sus instantáneas en IndexedDB. La información cinematográfica que falta se puede consultar directamente a TMDB por identificador, sin tener que abrir una ficha.

## Versión del algoritmo

La versión activa es **2.5.0** (`SPECTRO_ALGORITHM_VERSION`). Todo cambio de lógica que pueda alterar los resultados debe incrementar esta versión. Las instantáneas se identifican por versión y huella de entrada; las versiones anteriores nunca sustituyen un cálculo 2.5.0.

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

Las sinopsis se utilizan en el detector de interacciones mediante términos y expresiones léxicas, no como comprensión semántica: no se infieren emociones, atmósferas ni temas filosóficos. Los comentarios personales no se interpretan como señales. Tampoco se envían el historial, el perfil o sus inferencias a terceros.

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

## Interacciones cinematográficas

La versión 2.5.0 sustituye la lista fija de combinaciones por una búsqueda general de parejas entre características presentes en películas distintas. Explora todas las parejas de categorías diferentes disponibles en los datos, sin limitarse a una lista escrita a mano como género + dirección o género + tema.

Las señales disponibles incluyen:

- Datos estructurados existentes: género, dirección, reparto, país, época, idioma, duración y palabras clave de TMDB.
- Términos y expresiones consecutivas extraídos de la sinopsis. Se etiquetan como señales léxicas, no como temas confirmados ni como embeddings semánticos.

Cada película aporta una sola observación a cada pareja. Los revisionados se promedian dentro del título, por lo que no aumentan el tamaño de muestra.

### Cómo se calcula

1. Espectro ajusta un perfil aditivo de efectos individuales.
2. Divide los títulos en cinco bloques deterministas. Para cada bloque, estima la expectativa de las películas excluidas sin utilizar sus valoraciones para ajustar ese perfil.
3. Calcula el residuo de cada título: nota observada menos nota esperada por el modelo aditivo.
4. Agrupa esos residuos para todas las parejas de características cuyos rasgos aparecen en al menos cuatro películas distintas.
5. Calcula diferencia media, dispersión, número de títulos, prueba t bilateral y consistencia de la dirección entre bloques.
6. Corrige conjuntamente los valores p mediante Benjamini–Yekutieli, un procedimiento conservador ante dependencias entre las comparaciones.

Solo se presentan parejas con al menos cuatro películas distintas, q ajustado ≤ 0,05, al menos dos películas de soporte en cada uno de tres o más bloques y consistencia de dirección ≥ 0,75. Se muestran hasta ocho resultados ordenados por evidencia corregida. Estos límites sirven para descartar patrones que no pueden replicarse en diferentes bloques; no convierten una asociación en causalidad.

### Qué muestra cada hallazgo

- Características y categorías que forman la interacción.
- Nota media observada y expectativa estimada por separado.
- Diferencia residual, dispersión y número de películas distintas que respaldan el patrón.
- Valor p y valor q después de corregir las comparaciones múltiples.
- Cantidad de bloques donde aparece y consistencia de su dirección.
- Hasta tres películas de evidencia, con su nota y desviación respecto de la expectativa.

El valor q es una medida de evidencia estadística corregida, no la probabilidad de que te guste una película. La consistencia entre bloques indica estabilidad interna, no validación temporal ni causalidad. Las pruebas t son una aproximación sobre residuos y siguen dependiendo de la calidad, independencia y distribución de las observaciones. La ausencia de patrones que superen los controles es un resultado válido.

La versión 2.5.0 ya sustituye la nota prevista anterior por Kernel Ridge RBF. No incorpora aún árboles, boosting, Factorization Machines ni redes neuronales. Se compararán en evaluaciones temporales separadas; el orden principal sigue basándose en el encaje hasta que un modelo de ranking demuestre una mejora reproducible.


## Encaje y nota prevista

Cada candidata local puede mostrar dos estimaciones distintas:

**Encaje (0–100 %).** Es una puntuación relativa que resume señales positivas y negativas de ocho familias: género, dirección, reparto, temas, país, época, idioma y duración. Las coincidencias se limitan dentro de cada familia para que muchos actores, géneros o palabras clave no multipliquen artificialmente su peso. Las afinidades negativas restan encaje. Los favoritos añaden un refuerzo explícito moderado a las familias coincidentes.

La escala se centra en 50 y transforma la diferencia ponderada mediante `50 + 12,5 × diferencia`, limitada al intervalo 0–100. Un valor superior a 50 indica un encaje neto positivo. **No es una probabilidad de que la película guste ni una garantía.**

**Nota prevista (0–10).** Es un modelo local de regresión Kernel Ridge con kernel RBF. Entrena sobre la media de las calificaciones de cada película distinta y representa géneros, países, dirección, reparto, palabras clave, idioma, década, duración y términos de las sinopsis. El vocabulario TF‑IDF se ajusta solo con películas calificadas; las candidatas no intervienen en el entrenamiento. La solución del sistema regularizado usa Cholesky. Si faltan rasgos, hay menos de tres títulos o el sistema no puede resolverse de forma estable, utiliza el promedio personal como respaldo.

La nota prevista ya no se obtiene sumando las afinidades individuales. El encaje, en cambio, conserva el cálculo relativo anterior. Por prudencia, el orden principal de las recomendaciones sigue priorizando el encaje; la nota prevista desempata candidatas con encaje similar hasta que una evaluación de ranking independiente justifique otra política.

Cada candidata puede mostrar hasta tres películas similares del historial. La similitud se calcula por coseno entre características estructuradas y términos de sinopsis normalizados. El porcentaje es una medida de cercanía descriptiva, no la probabilidad de que te guste ni una valoración prevista.

Los hiperparámetros actuales (gamma 0,5 y regularización 0,25) son una configuración inicial de un modelo candidato. La evaluación exploratoria temporal mostró una mejora pequeña frente a Ridge en MAE, pero no una superioridad concluyente en NDCG ni una comparación externa definitiva con el estimador histórico. Por eso no se interpreta todavía como un predictor calibrado.

Los niveles de respaldo (Inicial, Moderada, Sólida, Variable y Explícita) describen las señales que justifican el encaje; no son la confianza calibrada de Kernel Ridge ni probabilidades o intervalos de confianza estadísticos.

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

La huella incluye visionados, calificaciones, fechas, sinopsis, metadatos utilizados (incluidas las palabras clave), identificadores de candidatas y favoritos. Los cambios de metadatos o de películas elegibles invalidan la instantánea. El identificador utiliza dos hashes ligeros concatenados; no es una firma criptográfica. La versión 2.5.0 usa una clave de instantánea distinta de las versiones anteriores, sin migrar ni eliminar registros Dexie. Las instantáneas antiguas se conservan, pero no se reutilizan para el nuevo contrato que incluye interacciones generales y términos de sinopsis.

Antes de calcular, el repositorio comprueba si ya existe una instantánea de la versión y huella actuales. Así evita repetir el análisis cuando la entrada no ha cambiado.

## Límites conocidos

- La precisión depende de la diversidad de las valoraciones y de los metadatos disponibles en el dispositivo.
- El encaje es un orden relativo, no una probabilidad calibrada.
- La nota prevista es una proyección de las valoraciones conocidas, no una promesa sobre la reacción futura del usuario.
- Las recomendaciones solo pueden salir de candidatas que Prisma ya tenga localmente. Las películas Pendientes se incluyen cuando disponen de metadatos suficientes; las Vistas y los títulos con visionados quedan excluidos. Espectro no realiza búsquedas ilimitadas por su cuenta.
- Una afinidad es una asociación en los datos registrados, no una relación causal ni una preferencia permanente.
- Los comentarios escritos todavía no se interpretan como señales semánticas.

La arquitectura de evolución, evaluación de modelos, semántica local y ejecución Android se describe en [Arquitectura de inteligencia cinematográfica](./SPECTRO-INTELLIGENCE-ARCHITECTURE.md).

## Principios

- Local-first y privacidad por diseño.
- Diferenciar observaciones, preferencias declaradas e inferencias.
- No presentar preferencias concluyentes con muestras pequeñas.
- Explicar recomendaciones con datos verificables y evidencia visible.
- Preservar compatibilidad mediante versionado y huellas.
- Enriquecer solo metadatos cinematográficos; no alterar experiencias personales.
