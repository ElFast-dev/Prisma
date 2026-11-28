# Integración Android con Showly

Este documento describe la integración que ya aplica Prisma al submódulo Showly y los límites que todavía deben validarse. Las rutas se contrastaron con el commit de upstream fijado en `.gitmodules`.

## Estado

Implementado en esta rama:

- Motor Kotlin puro con perfil de gusto aprendido desde valoraciones, ranking híbrido, diversidad, explicaciones y métricas.
- Adaptador `ShowlyRecommendationAdapter` para traducir modelos y calificaciones al motor.
- `PersonalizedMoviesCase`, que obtiene valoraciones existentes, las une con Room y enriquece datos con repositorios de Showly.
- Feed `PERSONALIZED` (“Para ti”) en el selector de descubrimiento de películas.
- Integración en las rutas de carga desde caché y carga remota de `DiscoverMoviesCase`.
- Exclusiones de películas calificadas u ocultas; colección y watchlist se excluyen cuando el filtro nativo `hideCollection` está activo.
- Scripts idempotentes para añadir el motor y aplicar el feed al submódulo sin hacer commits en upstream.

Pendiente de validación:

- Pruebas Android completas de los módulos afectados y CodeQL en el último commit.
- Evaluar la calidad del ranking con un historial real, usando separación temporal entre entrenamiento y evaluación.
- Pruebas instrumentadas de sincronización, cambios/borrado de calificaciones, estados sin conexión y experiencia de usuario.

## 1. La calificación existente es el único feedback personal

Showly sincroniza las valoraciones de Trakt mediante `MoviesRatingsRepository.loadMoviesRatings()`. Cada registro aporta ID Trakt, puntuación y fecha original.

El recomendador interpreta esos datos automáticamente:

- Puntuaciones altas aportan evidencia positiva sobre géneros, dirección, reparto y demás rasgos disponibles.
- Puntuaciones bajas aportan evidencia negativa sobre esos mismos rasgos.
- La señal combina el valor de la nota con la relación respecto a la media personal.
- La fecha de valoración aplica decaimiento temporal para que los gustos recientes tengan más peso.

No se añaden controles “me gusta”, “no me gusta” o “no me interesa”. Tampoco hay encuestas, pasos de configuración ni tareas de entrenamiento. La persona sigue calificando películas como siempre y el feed aprende de ese historial.

## 2. Reconstrucción del historial y metadatos

`TraktRating` contiene el ID, la calificación y la fecha, pero no todo el perfil cinematográfico. `PersonalizedMoviesCase`:

1. Lee como máximo las 100 calificaciones más recientes.
2. Busca los registros de película en Room mediante `LocalDataSource.movies.getAllChunked(...)`.
3. Resuelve un número acotado de películas faltantes con `MovieDetailsRepository.load(IdTrakt(...))`, usando concurrencia limitada.
4. Enriquece metadatos desde el modelo `ui_model.Movie` y los créditos de `PeopleRepository.loadAllForMovie(...)`.
5. Convierte cada película y su nota original a `ShowlyMovieMetadata` y `ShowlyRatingRecord`.

Los créditos de dirección, guion y reparto se usan cuando están disponibles. Si TMDB falla o no hay datos, se conserva la película con los metadatos restantes; no se inventan atributos. El enriquecimiento de créditos está acotado a 40 títulos del historial y 24 candidatos, con un máximo de cuatro solicitudes concurrentes.

En este commit, popularidad, keywords, estudios y franquicias no se fabrican cuando el modelo o los repositorios usados no los proporcionan. Los valores no disponibles simplemente no aportan señal.

## 3. Ranking y exclusiones

El adaptador llama a `RecommendationEngine` con los candidatos y el historial enriquecido. El motor:

- Omite películas incluidas en las calificaciones existentes.
- Construye preferencias positivas y negativas a partir de las notas.
- Combina afinidad personal, similitud con películas calificadas, calidad comunitaria, popularidad, novedad y diversidad.
- Devuelve IDs y explicaciones; no reconstruye ni reemplaza las tarjetas de Showly.

Showly pasa las películas ocultas como exclusiones siempre. Cuando `filters.hideCollection` está activo, también excluye las películas de la colección y la watchlist. El resto de filtros y el flujo de tarjetas nativas se mantienen.

## 4. Feed “Para ti” en DiscoverMoviesCase

El script `scripts/apply_showly_recommender.py` aplica el cableado de manera repetible:

- Añade `PERSONALIZED` al enum `DiscoverFeed`.
- Muestra la opción “For you” en el selector de feeds de películas.
- En la ruta de carga desde caché, ordena los candidatos con `PersonalizedMoviesCase.rank(...)` antes de `prepareItems(...)`.
- En la ruta remota, hace el mismo ranking antes de preparar las tarjetas.
- Mantiene el tratamiento nativo de Showly para imágenes, traducciones, watchlist, navegación y demás estados visuales.

El feed usa los candidatos que Showly ya proporciona; no sustituye los feeds generales Trending, Popular o Anticipated. Si el historial está vacío, usa el comportamiento de arranque en frío basado en señales comunitarias con confianza baja.

## 5. Configuración y verificación

Desde la raíz de Prisma:

```bash
git submodule update --init --recursive
python3 scripts/configure_showly_recommender.py
python3 scripts/apply_showly_recommender.py
```

Los scripts están diseñados para ejecutarse más de una vez sin duplicar cambios. La CI los ejecuta dos veces sobre el commit real del submódulo y después compila Kotlin de la aplicación Android y ejecuta las pruebas JVM configuradas.

La simulación sintética verifica propiedades del algoritmo —incluido que películas de géneros bien calificados superen a opciones asociadas a géneros con notas bajas, incluso frente a mejores señales comunitarias—, pero no demuestra por sí sola la precisión sobre una cuenta real. La evaluación real debe usar un historial consentido y separado temporalmente entre entrenamiento y conjunto de prueba.

## 6. Límites conocidos

- El recomendador ordena el conjunto de candidatos recibido de Showly; no puede recomendar una película que no esté presente en ese conjunto.
- Los créditos adicionales y la reconstrucción de títulos faltantes están acotados para controlar coste, latencia y concurrencia.
- El arranque en frío no puede adivinar gustos personales sin calificaciones.
- La integración no añade feedback manual ni cambia la forma de calificar películas.
- El motor ejecuta el cálculo en el dispositivo. La carga/sincronización de datos sigue usando los repositorios y servicios que Showly ya tiene.

La rama permanece en borrador hasta completar las verificaciones de CI y evaluar la experiencia con datos reales, sin fusionar estos cambios a `main` antes de esa validación.
