# Espectro

Espectro es el algoritmo cinematográfico propio de Prisma. La versión 1.0 se ejecuta enteramente en el dispositivo y mantiene sus resultados en IndexedDB.

## Datos de entrada locales

- Géneros TMDB (identificadores y nombres).
- Directores y hasta doce integrantes principales del reparto, guardados al abrir una ficha.
- Países de producción y década de estreno.
- Cada calificación individual, fecha y repetición de visionado.
- Películas candidatas almacenadas desde recomendaciones relacionadas de fichas que ya se consultaron.

## Versión 1.0

- Calcula el promedio general usando todas las valoraciones individuales.
- Para cada afinidad, promedia primero las valoraciones de cada película; así una repetición no cuenta como varias películas distintas.
- Solo muestra afinidades respaldadas por al menos dos películas y activa el análisis con tres películas distintas valoradas.
- Ordena géneros, directores, reparto, países y décadas por diferencia frente al promedio personal.
- Construye evolución mensual solo con meses que tienen visionados reales.
- Puntúa candidatas locales por afinidades positivas de género y explica cada coincidencia.
- Excluye de las candidatas todas las películas con visionados registrados.
- Guarda instantáneas identificadas por versión y huella de entrada para no mezclar cálculos con los datos originales.

## Principios

- No inventar preferencias con datos insuficientes.
- Diferenciar una preferencia declarada de una inferencia estadística.
- Explicar las recomendaciones con los rasgos que coinciden.
- No presentar datos de directores o reparto si no están disponibles localmente.
- No enviar el historial ni el perfil derivado a servicios externos de IA.
- Cambiar `SPECTRO_ALGORITHM_VERSION` cuando cambie la lógica para preservar la trazabilidad de resultados.

## Límites de esta versión

- Las recomendaciones se extraen de películas sugeridas por fichas abiertas anteriormente y guardadas en el catálogo local; no consulta ni envía preferencias a un servicio externo.
- El análisis de afinidades de directores y reparto aparece cuando hay al menos dos películas valoradas con esos nombres disponibles.
- La evolución muestra el promedio de las calificaciones por mes, no supone tendencias en meses sin actividad.

## Evolución prevista

1. Perfil cinematográfico y afinidades: versión 1.0.
2. Puntuación de candidatos con más señales verificadas y controles de validación.
3. Comparación temporal de afinidades y versiones futuras.

Los gráficos representan únicamente relaciones respaldadas por datos reales.
