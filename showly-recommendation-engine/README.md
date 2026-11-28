# Prisma · motor de recomendaciones para Showly

Motor Kotlin independiente, determinista y ejecutable localmente. Está pensado para incorporarse a una versión derivada de **Showly para Android**, conservando la atribución y cumpliendo la GPL-3.0 de Showly.

> Estado: motor, adaptador Showly, simulaciones y referencia submódulo a Showly implementados. El código Android upstream está disponible en `showly-android/` al clonar con submódulos. El feed personalizado todavía no está conectado a sus pantallas, base Room o servicios.

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

El puente `ShowlyRecommendationAdapter` convierte snapshots del modelo `ui_model.Movie`, los registros de `TraktRating` unidos con sus películas y las señales de feedback en perfiles tipados para el motor. `PersonalizedMovieDiscovery` añade un caso de uso y el contrato `ShowlyRecommendationDataSource`, que la capa Android debe implementar con los repositorios de Showly. Ninguna de estas clases depende de Android; por eso sus pruebas se ejecutan en JVM.

## Obtener la base Android de Showly

La rama incluye `showly-android` como submódulo, fijado a un commit concreto de `trakt/showly`. Clona incluyendo submódulos:

```bash
git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
```

En clones existentes:

```bash
git submodule update --init --recursive
```

El submódulo apunta al upstream original en modo solo lectura desde este proyecto. Para modificar el código Android y publicar una versión derivada, crea un fork de `trakt/showly` bajo tu cuenta y cambia la URL de `.gitmodules` a ese fork; no se deben enviar cambios al repositorio upstream.

## Ejecución

Requiere JDK 21 y Gradle:

```bash
gradle -p showly-recommendation-engine simulateRecommendations
gradle -p showly-recommendation-engine check
```

La simulación determinista usa perfiles sintéticos y un reloj fijo. Las pruebas también validan el adaptador Showly: normalización, deduplicación de atributos y traducción de puntuaciones en recomendaciones. No usa ni necesita datos privados del usuario.

## Integración prevista en Showly

1. Mantener Showly como base Android. Añadir este código como módulo Kotlin puro o incorporarlo a un módulo de dominio dedicado.
2. Convertir `ui_model.Movie` a `MovieProfile`: ID Trakt, título, año, géneros, idioma, país, década, rating y votos comunitarios. Enriquecer director, guionistas, reparto, keywords, franquicias y estudio con TMDB cuando estén disponibles.
3. Leer el historial desde `MoviesRatingsRepository.loadMoviesRatings()`. Showly ya sincroniza `sync/ratings/movies` y guarda puntuaciones en Room mediante `Rating` y `RatingsDao`. Como `TraktRating` solo contiene ID Trakt, nota y fecha, unir esos registros con `MoviesLocalDataSource.getAll(ids)` o `MovieDetailsRepository.load(IdTrakt(...))` antes de crear `ShowlyRatingRecord`.
4. Persistir el feedback explícito por usuario en Room. HIDE debe ser un bloqueo; NOT_INTERESTED y DISLIKE enseñan al perfil qué evitar; LIKE sirve como señal positiva.
5. Construir `excludedMovieIds` con películas ya vistas/calificadas, bloqueadas u ocultas, además de cualquier exclusión de producto que decida la app.
6. Integrar el adaptador en `ui-discover-movies/.../cases/DiscoverMoviesCase.kt`: después de obtener candidatos de `MoviesRepository.discoverMovies.loadAllRemote(...)` y antes de `prepareItems(...)`, mapearlos a `ShowlyMovieMetadata`, completar créditos TMDB disponibles y ordenar mediante `ShowlyRecommendationAdapter.recommend(...)`.
7. Implementar `ShowlyRecommendationDataSource` con `MoviesRepository`, `MoviesRatingsRepository`, `LocalDataSource` y los datos de feedback persistidos en Room.
8. Añadir pruebas de integración para sincronización, borrado/actualización de puntuaciones, persistencia, migración Room y funcionamiento sin conexión.

### Puntos de extensión confirmados en upstream

- `repository/.../movies/ratings/MoviesRatingsRepository.kt`: `preloadRatings()`, `loadMoviesRatings()`, `addRating()`, `deleteRating()`.
- `data-local/.../database/model/Rating.kt` y `RatingsDao.kt`: puntuación, fecha, tipo e ID Trakt.
- `ui-discover-movies/.../cases/DiscoverMoviesCase.kt`: ensamblado de candidatos y orden de feed.
- `repository/.../movies/DiscoverMoviesRepository.kt`: catálogo Trending, Popular, Anticipated y caché.
- `data-remote/.../tmdb/api/TmdbService.kt`: créditos de película disponibles vía `fetchMoviePeople(tmdbId)`.

El algoritmo no inventa créditos que no estén disponibles: las características ausentes simplemente no puntúan. No debe sustituirse la pantalla o los repositorios de Showly; el motor solo devuelve un orden y explicaciones para los candidatos suministrados. El adaptador y el caso de uso esperan que el código Android les entregue candidatos, historial enriquecido y exclusiones; todavía falta implementar el origen concreto basado en Room/Trakt/TMDB y conectar el feed a la pantalla.

## Métricas

`RecommendationMetrics` calcula Precision@K, Recall@K, HitRate@K, NDCG@K, cobertura del catálogo y diversidad intra-lista. La evaluación real debe usar un corte temporal: entrenar con calificaciones antiguas y medir contra las posteriores, evitando evaluar con datos que el modelo ya vio.

## Privacidad y límites

El motor es local y no comparte historial. No realiza filtrado colaborativo multiusuario porque no hay un conjunto de datos común ni un servicio de perfiles consentido en esta implementación. Para un usuario nuevo usa calidad comunitaria y popularidad con baja confianza; conforme llegan puntuaciones propias, la personalización gana peso.

## Licencia

Showly está publicado bajo GNU GPL versión 3. Este módulo mantiene separado su código nuevo; al incorporarlo al derivado Android, conservar los avisos de copyright/licencia upstream y cumplir las obligaciones de distribución de la GPL-3.0. Ver el archivo LICENSE del repositorio upstream: https://github.com/trakt/showly/blob/master/LICENSE
