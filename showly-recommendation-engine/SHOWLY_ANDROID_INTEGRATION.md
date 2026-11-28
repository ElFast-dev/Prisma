# Integración Android con Showly

Este documento describe la conexión del motor Prisma con el submódulo Showly. Las rutas y APIs de integración se contrastaron con el commit de upstream fijado en .gitmodules.

## Estado

- Motor Kotlin puro que aprende un perfil desde valoraciones y calcula un ranking híbrido.
- Adaptador de metadatos genérico para películas y series.
- Feed PERSONALIZED (“Para ti”) en los descubrimientos de películas y series.
- PersonalizedMoviesCase conectado a DiscoverMoviesCase.
- PersonalizedShowsCase conectado a DiscoverShowsCase.
- Lectura de ratings existentes, unión con Room y enriquecimiento de créditos a través de los repositorios de Showly.
- «Para ti» queda como feed predeterminado en instalaciones nuevas para películas y series; las selecciones ya guardadas se respetan.
- Aplicación de cambios repetible; los scripts modifican únicamente el working tree local del submódulo.

## 1. La calificación normal es el único feedback personal

El usuario sigue calificando títulos como siempre en Showly. Prisma lee esas valoraciones de Trakt desde los repositorios que ya utiliza la aplicación:

- Películas: MoviesRatingsRepository.loadMoviesRatings().
- Series: ShowsRatingsRepository.loadShowsRatings().

Cada registro aporta ID Trakt, nota de 1 a 10 y fecha. No se muestran preguntas, botones de “me gusta/no me gusta” ni controles adicionales para entrenar el recomendador.

El motor combina:
- Señal absoluta de la nota.
- Diferencia respecto a la media personal (65 % del peso de la señal), combinada con la escala absoluta (35 %).
- Decaimiento temporal según cuándo se registró la calificación.

Así, una nota alta refuerza los rasgos de ese título y una nota baja resta afinidad a rasgos similares. El perfil se reconstruye al calcular el feed desde el repositorio local actualizado, de modo que corregir o eliminar una calificación cambia el resultado sin un registro paralelo de preferencias.

## 2. Historial y metadatos de películas

PersonalizedMoviesCase lee el historial de MoviesRatingsRepository, reconstruye hasta 100 calificaciones recientes con LocalDataSource.movies.getAllChunked(...) y resuelve una cantidad limitada de datos faltantes con MovieDetailsRepository.load(IdTrakt(...)).

El modelo ui_model.Movie aporta géneros, año, idioma, país, nota comunitaria y votos. PeopleRepository.loadAllForMovie(...) aporta dirección, guion y reparto cuando está disponible. Se enriquecen hasta 40 títulos del historial y 24 candidatos, con un máximo de cuatro solicitudes simultáneas.

## 3. Historial y metadatos de series

PersonalizedShowsCase realiza el mismo proceso con ShowsRatingsRepository, LocalDataSource.shows.getAllChunked(...) y ShowDetailsRepository.load(IdTrakt(...)) para recuperar las series calificadas.

El modelo ui_model.Show aporta géneros, año, país, cadena/plataforma, nota comunitaria y votos. PeopleRepository.loadAllForShow(...) proporciona dirección, guion y reparto desde los datos cacheados de TMDB. El enriquecimiento está acotado a 40 títulos del historial y 24 candidatos, con un máximo de cuatro solicitudes simultáneas.

Cuando no hay créditos o metadatos suficientes, el motor continúa con los atributos disponibles. No inventa características ni trata los datos ausentes como preferencias.

## 4. Ranking, exclusiones y presentación

Los dos casos de uso llaman al mismo ShowlyRecommendationAdapter y al mismo motor Kotlin. El adaptador transforma las características disponibles en atributos tipados: género, dirección, guion, reparto, estudio, cadena/plataforma, idioma, país y década.

El motor:
- Construye preferencias positivas y negativas según las calificaciones.
- Combina afinidad, similitud con títulos valorados, calidad comunitaria ajustada por votos, popularidad disponible, novedad y diversidad.
- Omite los títulos ya calificados.
- Devuelve los IDs en orden recomendado junto con puntuación, confianza y explicación.

Antes del ranking, cada caso consulta los relacionados de hasta cuatro títulos calificados con 8/10 o superior, usa el límite normal de Trakt configurado por Showly (30 por semilla), intercala las respuestas para seleccionar hasta 40 títulos únicos y limita a dos peticiones concurrentes. Se combinan con los candidatos habituales de Descubrir y se deduplican. Las notas bajas no crean consultas separadas: ya penalizan los rasgos coincidentes en el perfil.

Showly conserva sus tarjetas, imágenes, navegación y estados de colección/watchlist. Los títulos ocultos se excluyen siempre; colección y watchlist se excluyen cuando el filtro nativo hideCollection está activo.

## 5. Cableado en el proyecto Android

scripts/apply_showly_recommender.py aplica el feed en las rutas de carga desde caché y carga remota de ambas pantallas. Añade el valor PERSONALIZED al enum compartido, la opción “For you” a los selectores y las dependencias del módulo Gradle.

Desde la raíz de Prisma:

    git submodule update --init --recursive
    python3 scripts/configure_showly_recommender.py
    python3 scripts/apply_showly_recommender.py

Ambos scripts pueden ejecutarse varias veces sin duplicar cambios. El primero fija «Para ti» como valor inicial solo si el usuario aún no había guardado un feed; nunca sobrescribe una selección existente. No crean commits ni escriben en el repositorio upstream de Showly.

## 6. Verificación y límites

Las pruebas sintéticas comprueban que cambiar una nota puede cambiar el orden recomendado sin introducir nuevas acciones de usuario. La CI debe aplicar los scripts dos veces sobre el commit exacto de Showly, compilar Kotlin Android y ejecutar tests.

La precisión real debe validarse con un historial real y una separación temporal entre entrenamiento y evaluación. Las simulaciones no se presentan como evidencia de calidad para una cuenta concreta.

Los feeds solo pueden ordenar el conjunto de candidatos que Showly ya entrega. Si una película o serie no está en ese conjunto, no aparecerá hasta que el sistema de descubrimiento de Showly la incluya. El motor calcula el perfil y el ranking localmente; la carga y sincronización de datos sigue usando los servicios normales de Showly.

La rama permanece en borrador hasta completar las validaciones y la revisión de la experiencia Android. No se debe fusionar en main antes de ese punto.
