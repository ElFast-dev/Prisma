# Espectro

Espectro es el análisis cinematográfico personal de Prisma. Se ejecuta en el dispositivo, utiliza únicamente datos locales ya guardados y conserva sus resultados en IndexedDB.

## Versión del algoritmo

La versión activa es **2.0.0** (`SPECTRO_ALGORITHM_VERSION`). Cada cambio de lógica que altere el resultado debe incrementar esta versión. Las instantáneas se identifican por versión y huella de entrada; una instantánea 1.1.0 nunca sustituye un cálculo 2.0.0.

## Datos de entrada

Se utilizan los visionados y las películas que ya existen en Prisma:

- Calificaciones, fechas y repeticiones de visionado.
- Géneros TMDB (identificadores y nombres).
- Directores y reparto principal almacenados al abrir una ficha.
- Países de producción y década de estreno.
- Idioma original y duración, cuando esos metadatos están disponibles localmente.
- Candidatas guardadas previamente en el catálogo local desde fichas consultadas.

Espectro no solicita datos nuevos a TMDB para construir el perfil, ni envía el historial o sus inferencias a servicios externos.

## Afinidades y respaldo

- El promedio personal utilizado para comparar rasgos se calcula primero por película; los revisionados se promedian dentro de su título y no multiplican su peso.
- Una afinidad necesita al menos dos películas distintas para aparecer. Con dos títulos se etiqueta como inicial y no se utiliza para recomendar.
- La diferencia observada se reduce hacia el promedio personal mediante un encogimiento conservador: `diferencia × n / (n + 3)`. Es una regularización explícita, no una probabilidad ni un intervalo de confianza.
- El respaldo combina el número de películas distintas y la dispersión de sus valoraciones. Las señales variables se muestran, pero no alimentan recomendaciones.
- Se analizan géneros, directores, reparto, países, décadas, idioma original y franjas de duración.
- Las señales ausentes no se inventan ni se completan por inferencia.

## Recomendaciones

- Las candidatas proceden exclusivamente de películas ya almacenadas en el dispositivo.
- Se excluye cualquier película con un visionado registrado.
- Se utilizan señales positivas con respaldo moderado o sólido; una señal inicial no basta.
- La puntuación combina siete familias de rasgos con pesos limitados por categoría. Varios actores o géneros de una misma familia no multiplican artificialmente su influencia.
- Cada coincidencia explica el rasgo, la diferencia ajustada y el número de títulos distintos que la respaldan.
- La puntuación es un orden relativo dentro de las candidatas locales, no una probabilidad de que guste al propietario.

## Evolución temporal

- La evolución mensual conserva las calificaciones de visionados reales y muestra solo meses con actividad.
- Los cambios de afinidad comparan los últimos doce meses disponibles con los doce anteriores, tomando como referencia la fecha de calificación más reciente.
- Cada película aporta como máximo una observación por periodo; sus revisionados se promedian dentro de ese periodo.
- Solo se muestra un cambio para un rasgo con al menos tres películas distintas en cada periodo.
- Si no existe muestra suficiente, Espectro indica que no hay periodos comparables en vez de dibujar una tendencia ficticia.

## Huella e instantáneas

La huella incluye los campos que intervienen en el cálculo: visionados, calificaciones, fechas y los metadatos usados por las señales. Si cambia el idioma o la duración de una película, la entrada se considera distinta. La versión 2.0.0 utiliza un identificador de instantánea separado de las versiones anteriores sin necesidad de migrar ni eliminar registros Dexie.

## Límites conocidos

- La precisión depende de los metadatos disponibles localmente y de la diversidad del historial.
- Las etiquetas de respaldo son niveles descriptivos basados en soporte y dispersión; no son intervalos de confianza estadísticos ni garantías.
- Las recomendaciones no buscan películas en la red. Si el catálogo local de candidatas es pequeño, el resultado también lo será.
- Una afinidad representa una asociación en las valoraciones registradas, no una relación causal ni una preferencia permanente.

## Principios

- Local-first y privacidad por diseño.
- Diferenciar observaciones de inferencias.
- No presentar preferencias concluyentes con muestras pequeñas.
- Explicar cada recomendación con datos verificables.
- Preservar compatibilidad de datos e instantáneas mediante versionado.
