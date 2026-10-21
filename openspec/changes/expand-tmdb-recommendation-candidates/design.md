# Diseño: fuentes de candidatas remotas de recomendación

## Arquitectura
Añadir `js/recommendations/candidate-sources.js` como coordinador independiente. Recibe las funciones `request`, `ensureGenres` y `fromTMDB` mediante dependencias explícitas; no conoce el DOM, el almacenamiento personal ni la lógica de ranking. Consultas iniciales, generales y compartidas para cualquier usuario:
- `/movie/popular?page=1`
- `/movie/popular?page=2`
- `/trending/movie/week`
- `/movie/top_rated?page=1`

Todas usan idioma español y no incluyen ningún parámetro derivado del perfil personal. La extracción de etiquetas puede estar limitada si falla la consulta de géneros; el resto de la respuesta sigue siendo aprovechable.

## Cache y fallos
Guardar resultados únicamente en memoria durante 15 minutos. Reutilizar una petición en curso para evitar ráfagas de solicitudes. Todas las fuentes se consultan con tolerancia a fallos parciales; si ninguna aporta resultados, mostrar el error sin borrar las últimas candidatas válidas mientras la credencial siga configurada. Eliminar la caché y descartar peticiones tardías al quitar la credencial. No persistir resultados ni añadirlos a la colección.

## Integración
`app.js` compone el nuevo servicio y publica una función de carga. `js/app/lifecycle.js` lo inicia solo al entrar en Descubrir con credencial disponible. `js/recommendations/ranking.js` une candidatos remotos y el catálogo mediante la utilidad de identidad existente, después aplica las exclusiones actuales y puntúa con `predictRating`. La UI comunica carga, cobertura parcial, resultados o error y permite actualizar manualmente. Abrir una ficha desde una recomendación remota no añade la película a la colección; solo una acción deliberada puede hacerlo.

## Privacidad
TMDB recibe únicamente solicitudes genéricas de catálogo más la credencial que la persona configuró. No se envían las 348 valoraciones, los IDs de las películas valoradas, los temas aprendidos ni el ranking personal. Los resultados de esta función permanecen en memoria y no entran en exportaciones, respaldos ni estado persistido.

## Riesgos y verificación
- La lista pública de popularidad puede sesgar la exposición; mezclar varias fuentes reduce la dependencia de un solo orden, pero no elimina el sesgo.
- Algunos resultados pueden no tener etiquetas; la puntuación debe continuar usando las características disponibles y comunicar baja confianza, sin errores.
- Las respuestas duplicadas entre fuentes deben colapsar por ID TMDB y los remakes con IDs diferentes deben conservarse.
- Verificar con fixtures: éxito completo, error parcial, error total, caché, deduplicación, exclusión de películas de colección y que ningún registro personal se serializa o persiste.
