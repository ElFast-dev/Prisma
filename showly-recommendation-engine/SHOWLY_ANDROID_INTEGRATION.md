# Integración Android con Showly

Este documento registra el cableado que falta para convertir el motor independiente en el feed personalizado de la aplicación. Las rutas se contrastaron con el repositorio upstream `trakt/showly`.

## Estado

Implementado en este PR:
- Motor Kotlin puro, scoring híbrido y diversidad.
- Métricas de ranking y simulaciones con perfiles sintéticos.
- `ShowlyRecommendationAdapter`, `ShowlyRecommendationDataSource` y `PersonalizedMovieDiscovery`.
- Tests de mapeo de metadatos, calificaciones, feedback y exclusiones.

Pendiente:
- Importar el repositorio Android upstream como base de la app derivada.
- Implementar el `ShowlyRecommendationDataSource` real sobre Room, Trakt y TMDB.
- Añadir persistencia de feedback explícito y su migración Room.
- Conectar el feed "Para ti" a `DiscoverMoviesCase` y añadir pruebas instrumentadas Android.

## 1. Construir el historial del usuario

Showly ya tiene:
- `MoviesRatingsRepository.loadMoviesRatings()` → `TraktRating(idTrakt, rating, ratedAt)`.
- `RatingsDao` / `Rating` → registros locales de calificaciones.
- `MoviesLocalDataSource.getAll(ids)` → filas de películas Room.
- `Mappers.movie.fromDatabase(...)` → `ui_model.Movie`.

`TraktRating` no contiene el título, género ni créditos. No se debe crear un perfil solo con el ID. Primero hay que unir las calificaciones con las películas locales y resolver los IDs que falten con `MovieDetailsRepository.load(IdTrakt(id))`.

Pseudocódigo del repositorio Android:

```kotlin
val traktRatings = moviesRatingsRepository.loadMoviesRatings()
val ids = traktRatings.map { it.idTrakt.id }.distinct()
val localRows = localDataSource.movies.getAll(ids)
val localMovies = localRows.associate { row ->
  val movie = mappers.movie.fromDatabase(row)
  movie.traktId to movie
}

val ratingRecords = traktRatings.mapNotNull { rating ->
  val movie = localMovies[rating.idTrakt.id] ?: return@mapNotNull null
  ShowlyRatingRecord(
    movie = metadataMapper.toMetadata(movie),
    rating = rating.rating,
    ratedAtEpochMillis = rating.ratedAt.toInstant().toEpochMilli(),
  )
}
```

En producción, completa los registros que no aparezcan en Room con `MovieDetailsRepository.load(IdTrakt(id))`; conserva la fecha original de Trakt. No uses la fecha de sincronización como si fuera la fecha en que el usuario valoró la película.

## 2. Construir metadatos de la película

Los campos que ya están en `ui_model.Movie` y se pueden mapear directamente:
- `traktId`, `title`, `year`
- `genres`, `language`, `country`
- `rating`, `votes`

Los valores centinela de Showly (`year <= 0`, `rating < 0`, `votes < 0`, IDs TMDB no válidos) deben convertirse en `null` o en valores vacíos, no en preferencias reales. `popularity` no forma parte del `ui_model.Movie` actual: mantenerlo en 0 hasta obtener un valor real de una fuente externa.

### Créditos TMDB que ya existen en Showly

`RemoteDataSource.tmdb.fetchMoviePeople(tmdbId)` devuelve un mapa de `TmdbPerson.Type.CAST` y `CREW`. `TmdbPerson` expone `name`, `job` y `jobs`. Con ese resultado se pueden mapear:
- reparto: nombres de CAST
- dirección: equipo con job "Director"
- guion: equipo con job "Writer", "Screenplay" o roles equivalentes disponibles

Utiliza la caché de créditos existente o añade una antes de consultar TMDB en lote para cada candidato. Si TMDB falla o un ID no existe, conserva géneros y datos de Trakt; no descartes la película ni inventes créditos.

### Datos que no expone actualmente el servicio TMDB de Showly

El `TmdbService` actual tiene imágenes, créditos, traducciones y proveedores de streaming, pero no una consulta de detalle de película ni keywords. Por tanto `keywords`, `franchises`, `studios` y `popularity` son atributos opcionales del motor, no datos que el adaptador pueda asumir. Para enriquecerlos habría que añadir y probar las consultas TMDB de detalle de película y keywords, mapear `production_companies` y `belongs_to_collection`, y respetar su caché y límites.

## 3. Excluir lo que no debe recomendarse

Antes de construir `ShowlyRecommendationData`, combinar:
- `MoviesRepository.myMovies.loadAllIds()` (vistas / colección)
- `MoviesRepository.watchlistMovies.loadAllIds()`
- `MoviesRepository.hiddenMovies.loadAllIds()`
- IDs guardados como `HIDE`, además de las películas ya calificadas

El motor también excluye automáticamente los IDs presentes en las calificaciones y feedback que recibe. Aun así, pasa todas las listas de exclusión de Showly para cubrir películas vistas que el usuario no haya puntuado.

## 4. Guardar feedback explícito

El historial de Trakt no contiene el motivo por el que una sugerencia se rechazó. Para que el usuario pueda enseñar al algoritmo sin tener que calificar cada película, el derivado Android debe guardar un registro propio en Room para:
- `LIKE`
- `DISLIKE`
- `NOT_INTERESTED`
- `HIDE`

Cada evento necesita `id_trakt`, tipo, fecha y los índices adecuados. Define una migración de Room, operaciones upsert/delete y pruebas para el cambio de opinión: el evento más reciente debe prevalecer. `HIDE` debe ser además una exclusión dura.

## 5. Conectar "Para ti" con DiscoverMoviesCase

El punto de integración confirmado es:
`ui-discover-movies/src/main/java/com/michaldrabik/ui_discover_movies/cases/DiscoverMoviesCase.kt`.

El flujo actual hace:
1. `MoviesRepository.discoverMovies.loadAllRemote(feedOrder, ...)` para obtener candidatos Trending/Popular/Anticipated.
2. Lee IDs de colección, watchlist y elementos ocultos.
3. Cachea los candidatos.
4. `prepareItems(...)` monta imágenes y modelos de la lista.

Añade un feed propio en vez de reemplazar todos los feeds. Para ese feed:
1. Obtén un conjunto suficientemente amplio de candidatos.
2. Carga una sola vez el historial unido y feedback.
3. Enriquece metadatos desde Room/TMDB con caché y concurrencia limitada.
4. Construye `ShowlyRecommendationData` y llama a `PersonalizedMovieDiscovery.recommend(...)`.
5. Reordena los modelos originales usando los IDs Trakt de `RecommendedMovie.movie.id`.
6. Pasa el resultado a `prepareItems(...)` para conservar el flujo existente de pósteres, traducciones, estados de watchlist y navegación.

No hagas peticiones de TMDB secuenciales dentro del renderizado de cada tarjeta. El feed debe poder mostrar caché mientras se refresca y funcionar con perfiles parciales si la red no está disponible.

## 6. Validación que falta en Android

Antes de dar la integración por terminada, añadir:
- Test de unión de calificaciones Trakt con filas Room y fallback de detalles.
- Test de sync incremental, borrado de calificaciones y timestamps.
- Migration test de la tabla de feedback.
- Test de exclusión de vistas, watchlist, ocultas y feedback.
- Test de fallo de TMDB y de caché offline.
- Test de integración de `DiscoverMoviesCase` para que el feed personalizado ordene por score sin romper imágenes o navegación.
- Evaluación temporal con datos del propio usuario, entrenando solo con calificaciones anteriores al corte. No uses las mismas puntuaciones como entrenamiento y verdad-terreno.

La simulación sintética del módulo es una comprobación de comportamiento; no sustituye estas pruebas Android ni demuestra todavía precisión con el historial real de un usuario.
