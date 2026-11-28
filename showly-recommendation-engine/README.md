# Prisma · motor de recomendaciones para Showly

Motor Kotlin independiente, determinista y ejecutable localmente. Está pensado para incorporarse a una versión derivada de **Showly para Android**, conservando la atribución y cumpliendo la GPL-3.0 de Showly.

> Estado: motor y simulación implementados. Este directorio aún no es un fork completo de Showly ni está conectado a sus pantallas, base Room o servicios. La integración requiere importar primero el repositorio upstream completo y adaptar los puntos descritos abajo.

## Qué aprende

- Calificaciones personales de Trakt (1–10), usando una combinación de señal absoluta y relativa a la media del usuario.
- Antigüedad de cada calificación, con decaimiento temporal configurable.
- Gustos y rechazos explícitos: LIKE, DISLIKE, NOT_INTERESTED y HIDE.
- Preferencias ponderadas por género, dirección, reparto, guion, palabras clave, franquicia, estudio, idioma, país y década.
- Similitud ponderada con películas que gustaron y no gustaron.
- Calidad comunitaria ajustada por cantidad de votos, popularidad y novedad.
- Diversidad de la lista con reordenamiento tipo MMR.
- Explicaciones por película y una confianza conservadora cuando hay poco historial.

El motor no necesita conexión de red, no llama a un modelo remoto y no envía las calificaciones a ningún servidor. La app que lo integre será responsable de obtener candidatos y metadatos.

## Ejecución

Requiere JDK 21 y Gradle:

```bash
gradle -p showly-recommendation-engine simulateRecommendations
gradle -p showly-recommendation-engine check
```

La simulación determinista usa perfiles sintéticos y un reloj fijo. No usa ni necesita datos privados del usuario.

## Integración prevista en Showly

1. Mantener Showly como base Android. Añadir este código como módulo Kotlin puro o incorporarlo a un módulo de dominio dedicado.
2. Convertir `ui_model.Movie` a `MovieProfile`: ID Trakt, título, año, géneros, idioma, país, década, rating y votos comunitarios. Enriquecer director, guionistas, reparto, keywords, franquicias y estudio con TMDB cuando estén disponibles.
3. Leer el historial desde `MoviesRatingsRepository.loadMoviesRatings()`. Showly ya sincroniza `sync/ratings/movies` y guarda puntuaciones en Room mediante `Rating` y `RatingsDao`.
4. Persistir el feedback explícito por usuario en Room. HIDE debe ser un bloqueo; NOT_INTERESTED y DISLIKE enseñan al perfil qué evitar; LIKE sirve como señal positiva.
5. Construir `excludedMovieIds` con películas ya vistas/calificadas, bloqueadas u ocultas, además de cualquier exclusión de producto que decida la app.
6. Integrar el motor en `ui-discover-movies/.../cases/DiscoverMoviesCase.kt`: después de obtener candidatos de `MoviesRepository.discoverMovies.loadAllRemote(...)` y antes de `prepareItems(...)`, añadir una opción de feed personalizado que ordene mediante `RecommendationEngine.recommend(...)`.
7. Añadir pruebas de integración para sincronización, borrado/actualización de puntuaciones, persistencia, migración Room y funcionamiento sin conexión.

### Puntos de extensión confirmados en upstream

- `repository/.../movies/ratings/MoviesRatingsRepository.kt`: `preloadRatings()`, `loadMoviesRatings()`, `addRating()`, `deleteRating()`.
- `data-local/.../database/model/Rating.kt` y `RatingsDao.kt`: puntuación, fecha, tipo e ID Trakt.
- `ui-discover-movies/.../cases/DiscoverMoviesCase.kt`: ensamblado de candidatos y orden de feed.
- `repository/.../movies/DiscoverMoviesRepository.kt`: catálogo Trending, Popular, Anticipated y caché.
- `data-remote/.../tmdb/api/TmdbService.kt`: créditos de película disponibles vía `fetchMoviePeople(tmdbId)`.

El algoritmo no inventa créditos que no estén disponibles: las características ausentes simplemente no puntúan. No debe sustituirse la pantalla o los repositorios de Showly; el motor solo devuelve un orden y explicaciones para los candidatos suministrados.

## Métricas

`RecommendationMetrics` calcula Precision@K, Recall@K, HitRate@K, NDCG@K, cobertura del catálogo y diversidad intra-lista. La evaluación real debe usar un corte temporal: entrenar con calificaciones antiguas y medir contra las posteriores, evitando evaluar con datos que el modelo ya vio.

## Privacidad y límites

El motor es local y no comparte historial. No realiza filtrado colaborativo multiusuario porque no hay un conjunto de datos común ni un servicio de perfiles consentido en esta implementación. Para un usuario nuevo usa calidad comunitaria y popularidad con baja confianza; conforme llegan puntuaciones propias, la personalización gana peso.

## Licencia

Showly está publicado bajo GNU GPL versión 3. Este módulo mantiene separado su código nuevo; al incorporarlo al derivado Android, conservar los avisos de copyright/licencia upstream y cumplir las obligaciones de distribución de la GPL-3.0. Ver el archivo LICENSE del repositorio upstream: https://github.com/trakt/showly/blob/master/LICENSE
