# Prisma · motor de recomendaciones para Showly

Motor Kotlin local, determinista y sin dependencia de servicios de IA remotos. Se integra con **Showly para Android** mediante feeds personalizados de descubrimiento para películas y series.

> Estado: el motor y el adaptador son independientes de Android. Los scripts conectan el módulo Gradle y aplican los casos de uso a un checkout local del submódulo Showly fijado por Prisma.

## Aprende de las calificaciones existentes

La señal personal procede de las valoraciones de Trakt que la persona ya registra en Showly:

- Las puntuaciones altas refuerzan atributos que comparten esos títulos.
- Las puntuaciones bajas penalizan atributos similares.
- La nota se interpreta de forma absoluta y en relación con la media personal, adaptándose a distintos hábitos de puntuación.
- La fecha original aplica decaimiento temporal para que el gusto reciente tenga más peso.
- Cambiar o borrar una calificación se refleja en el siguiente cálculo porque el perfil se reconstruye desde el repositorio local de ratings.

No hay “me gusta”, “no me gusta”, “no me interesa”, encuestas ni tareas adicionales. La persona usa la app como siempre: registra una calificación y el sistema aprende.

## Dos feeds personalizados

**Películas — PersonalizedMoviesCase**
- Lee las calificaciones de MoviesRatingsRepository.
- Reconstruye hasta 100 títulos recientes con Room y usa MovieDetailsRepository para un número limitado de elementos que falten.
- Enriquece metadatos con géneros, idioma, país, año, nota comunitaria y créditos cacheados de PeopleRepository.

**Series — PersonalizedShowsCase**
- Lee las calificaciones existentes de ShowsRatingsRepository.
- Reconstruye el historial desde Room y usa ShowDetailsRepository como alternativa limitada.
- Aprende de géneros, cadena/plataforma, país, año, nota comunitaria y créditos de dirección, guion y reparto mediante PeopleRepository.

Ambos casos limitan la reconstrucción de títulos faltantes y las solicitudes concurrentes para evitar bloquear la interfaz o multiplicar llamadas de red. Los créditos no disponibles simplemente no aportan una señal; no se inventan.

Los dos feeds conservan las tarjetas y navegación nativas de Showly. Se excluyen los títulos ya calificados y ocultos; colección y watchlist se excluyen cuando está activo el filtro nativo hideCollection.

## Ampliación de candidatos y ranking híbrido

El motor combina afinidad de características, similitud con títulos calificados, calidad comunitaria suavizada por la cantidad de votos, popularidad, novedad y diversidad. Para evitar que una cuenta nueva reciba falsas afirmaciones de personalización, el arranque en frío usa señales comunitarias con confianza baja.

La integración amplía el catálogo de cada feed consultando títulos relacionados de Trakt a partir de hasta cuatro títulos con nota 8/10 o superior. Se usa el límite normal de Trakt configurado por Showly (30 relacionados por título); se eligen hasta 40 resultados únicos intercalando las respuestas de las semillas y con un máximo de dos solicitudes concurrentes. Esos resultados se unen a los candidatos de Descubrir, se deduplican y se reordenan localmente. Las notas altas eligen semillas; las notas bajas participan en el perfil y reducen la puntuación de atributos similares. Si falla una consulta relacionada, no se interrumpe el feed normal.

El motor en sí no hace llamadas de red. La capa Android usa los endpoints existentes de Trakt para ampliar los candidatos y los repositorios Showly para leer calificaciones y metadatos; el perfil de gusto y el orden se calculan localmente. Las notas numéricas no se envían a un modelo remoto ni al servicio de Prisma.

## Configuración

Clona con submódulos:

    git clone --recurse-submodules https://github.com/ElFast-dev/Prisma.git
    cd Prisma
    python3 scripts/configure_showly_recommender.py
    python3 scripts/apply_showly_recommender.py

En un clon ya existente:

    git submodule update --init --recursive
    python3 scripts/configure_showly_recommender.py
    python3 scripts/apply_showly_recommender.py

Los scripts son idempotentes. El primero registra el módulo de recomendaciones; el segundo conecta el feed PERSONALIZED en películas y series. No crean commits ni envían cambios al upstream.

## Ejecutar pruebas

Requiere JDK 21 y Gradle:

    gradle -p showly-recommendation-engine check

Las pruebas JVM cubren normalización de atributos, mapeo de géneros, créditos y cadenas/plataformas, ranking desde notas, cambios de calificación, exclusiones, arranque en frío, diversidad y escenarios sintéticos. Las simulaciones no utilizan datos privados ni una cuenta real.

GitHub Actions aplica los scripts dos veces sobre el commit fijado de Showly, compila Kotlin Android y ejecuta los tests configurados. La evaluación de precisión con un historial real sigue pendiente; las simulaciones comprueban propiedades del algoritmo pero no prueban la calidad real de recomendaciones para una cuenta concreta.

## Métricas y evaluación

RecommendationMetrics calcula Precision@K, Recall@K, HitRate@K, NDCG@K, cobertura del catálogo y diversidad intra-lista. La evaluación de una cuenta real debe usar separación temporal: entrenar con calificaciones anteriores y medir contra valoraciones posteriores, sin reutilizar las mismas notas entre entrenamiento y prueba.

## Límites

- El feed ordena los candidatos que Showly ya entrega; no puede recomendar títulos que no estén en ese conjunto.
- El enriquecimiento de créditos y la reconstrucción de títulos faltantes tienen límites de concurrencia y cantidad.
- Un perfil sin calificaciones no aporta evidencia de gustos personales.
- Las recomendaciones no sustituyen el criterio de la persona ni son una garantía de afinidad.

## Licencia

Showly está publicado bajo GNU GPL versión 3. Se deben conservar los avisos de autoría y cumplir las obligaciones de distribución de la GPL-3.0. Ver el archivo LICENSE del repositorio upstream: https://github.com/trakt/showly/blob/master/LICENSE
