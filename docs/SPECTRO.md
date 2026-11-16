# Espectro

Espectro es el análisis cinematográfico personal de Prisma. Se ejecuta en el dispositivo, utiliza datos locales ya guardados y conserva sus instantáneas en IndexedDB. La información cinematográfica que falta se puede consultar directamente a TMDB por identificador, sin tener que abrir una ficha.

## Versión del algoritmo

La versión activa es **2.2.0** (`SPECTRO_ALGORITHM_VERSION`). Todo cambio de lógica que pueda alterar los resultados debe incrementar esta versión. Las instantáneas se identifican por versión y huella de entrada; las versiones anteriores nunca sustituyen un cálculo 2.2.0.

## Información que utiliza

Espectro combina señales que Prisma puede verificar:

- Calificaciones, fechas y revisionados de visionados.
- Géneros TMDB (identificadores y nombres).
- Directores y reparto principal.
- Palabras clave temáticas de TMDB, como memoria, identidad o viajes en el tiempo.
- Países de producción y década de estreno.
- Idioma original y duración.
- Favoritos marcados explícitamente en Biblioteca.
- Películas candidatas que ya están guardadas en el catálogo local.

Los comentarios y textos libres no se interpretan mediante un modelo lingüístico: no se les atribuye un sentimiento o preferencia que Prisma no pueda verificar. Tampoco se envían el historial, el perfil o sus inferencias a terceros.

Cuando existen visionados sin calificación, Espectro puede hacer una pregunta contextual en la propia vista: pide una nota del 1 al 10 para una experiencia registrada, sin abrir la ficha. La respuesta actualiza solo el campo de calificación de ese visionado y vuelve a calcular el perfil. Se formula como máximo una pregunta cada 24 horas y se puede posponer; no se crean experiencias nuevas ni se alteran fechas, revisionados o comentarios.

## Obtención automática de metadatos

Cuando Espectro detecta campos cinematográficos que faltan, solicita a TMDB los detalles, créditos y palabras clave temáticas usando el identificador TMDB local. Los tres recursos se guardan en la caché local; no es necesario abrir la ficha.

- Prioriza películas con visionados y favoritos, además de candidatas locales no vistas.
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

## Encaje y nota prevista

Cada candidata local puede mostrar dos estimaciones distintas:

**Encaje (0–100 %).** Es una puntuación relativa que resume señales positivas y negativas de ocho familias: género, dirección, reparto, temas, país, época, idioma y duración. Las coincidencias se limitan dentro de cada familia para que muchos actores, géneros o palabras clave no multipliquen artificialmente su peso. Las afinidades negativas restan encaje. Los favoritos añaden un refuerzo explícito moderado a las familias coincidentes.

La escala se centra en 50 y transforma la diferencia ponderada mediante `50 + 12,5 × diferencia`, limitada al intervalo 0–100. Un valor superior a 50 indica un encaje neto positivo. **No es una probabilidad de que la película guste ni una garantía.**

**Nota prevista (0–10).** Parte del promedio personal por película y suma la diferencia ajustada ponderada de las señales que proceden de calificaciones. Se limita al intervalo 0–10. Los favoritos no cambian esta predicción. Cuando no hay respaldo suficiente para proyectar una diferencia, la estimación se mantiene en el promedio personal.

Los niveles de respaldo (Inicial, Moderada, Sólida, Variable y Explícita) son etiquetas descriptivas; no son probabilidades ni intervalos de confianza estadísticos.

## Grafo de decisiones

«Cómo piensa Espectro» representa el recorrido usado por el cálculo:

1. El perfil aporta el promedio y las valoraciones registradas.
2. Las señales muestran qué rasgos reciben notas por encima o por debajo del promedio, cuántos títulos los respaldan y su dispersión.
3. Los favoritos aparecen separados como señales explícitas, sin calificaciones inventadas.
4. Las conexiones hacia cada candidata muestran contribuciones positivas o negativas al encaje.
5. Cada señal expone los títulos que la respaldan y, cuando procede, su calificación individual.

El grafo no inventa conexiones con películas no evaluadas. Cuando no existen candidatas con coincidencias suficientes, muestra las señales respaldadas disponibles. El ancho de las conexiones representa la magnitud de la contribución; el color distingue su dirección.

## Mapa cinematográfico

La vista principal «Mapa cinematográfico» construye una red con las películas ya almacenadas en Prisma. No es una ilustración fija: nodos y vínculos salen de metadatos y del historial local.

- Cada película es un nodo circular con su póster cuando existe. Géneros, directores, actores y temas también son nodos y se conectan a las películas que comparten ese rasgo.
- El grosor y el brillo de una línea representan la fuerza relativa del vínculo. La dirección del color distingue señales positivas, negativas, favoritas explícitas y conexiones neutrales.
- El radio de cada nodo representa su influencia relativa dentro de la red: combina vínculos ponderados, respaldo de las afinidades y alcance en las recomendaciones locales. Es una escala comparativa del mapa, no un porcentaje de probabilidad.
- Las películas se agrupan mediante similitud ponderada entre las cuatro familias de rasgos del mapa (géneros, dirección, actores y temas). El cálculo utiliza solapamiento tipo Jaccard y unión de componentes con un límite por grupo para que una cadena larga de coincidencias no absorba todo el catálogo.
- Películas aún no vistas y rasgos conectados únicamente a ellas aparecen atenuados. Así se distingue el catálogo por explorar de las conexiones que ya has experimentado.
- El buscador resalta nodos y vínculos relacionados; al seleccionar un nodo se muestran sus conexiones, influencia y películas relacionadas. El mapa dispone de zoom y desplazamiento aptos para pantallas táctiles.

La red solo representa títulos locales. Una zona atenuada significa «todavía no explorado en tu Prisma», no que TMDB no tenga películas de ese tipo. Si un registro aún no tiene palabras clave descargadas, no se inventan temas para completarlo.

## Organización de Espectro

La portada de Espectro sigue el patrón de Personal y enlaza a cuatro apartados: Mapa cinematográfico, Afinidades, Evolución y Recomendaciones. Cada apartado tiene su propio encabezado de regreso. La navegación principal permanece en las tres secciones de Prisma; las subsecciones de Espectro se recorren desde su portada.

## Evolución temporal

- La evolución mensual conserva las calificaciones de visionados reales y muestra solo meses con actividad.
- Los cambios de afinidad comparan los últimos doce meses disponibles con los doce anteriores, tomando como referencia la fecha de calificación más reciente.
- Cada película aporta como máximo una observación por periodo; los revisionados se promedian dentro de ese periodo.
- Solo se muestra un cambio para un rasgo con al menos tres películas distintas en cada periodo.
- Si no existe muestra suficiente, Espectro indica que no hay periodos comparables en lugar de dibujar una tendencia ficticia.

## Huella e instantáneas

La huella incluye visionados, calificaciones, fechas, metadatos utilizados (incluidas las palabras clave), identificadores de candidatas y favoritos. Los cambios de metadatos o de películas elegibles invalidan la instantánea. El identificador utiliza dos hashes ligeros concatenados; no es una firma criptográfica. La versión 2.2.0 usa una clave de instantánea distinta de las versiones anteriores, sin migrar ni eliminar registros Dexie.

Antes de calcular, el repositorio comprueba si ya existe una instantánea de la versión y huella actuales. Así evita repetir el análisis cuando la entrada no ha cambiado.

## Límites conocidos

- La precisión depende de la diversidad de las valoraciones y de los metadatos disponibles en el dispositivo.
- El encaje es un orden relativo, no una probabilidad calibrada.
- La nota prevista es una proyección de las valoraciones conocidas, no una promesa sobre la reacción futura del usuario.
- Las recomendaciones solo pueden salir de candidatas que Prisma ya tenga localmente. Espectro no realiza búsquedas ilimitadas por su cuenta.
- Una afinidad es una asociación en los datos registrados, no una relación causal ni una preferencia permanente.
- Los comentarios escritos todavía no se interpretan como señales semánticas.

## Principios

- Local-first y privacidad por diseño.
- Diferenciar observaciones, preferencias declaradas e inferencias.
- No presentar preferencias concluyentes con muestras pequeñas.
- Explicar recomendaciones con datos verificables y evidencia visible.
- Preservar compatibilidad mediante versionado y huellas.
- Enriquecer solo metadatos cinematográficos; no alterar experiencias personales.
