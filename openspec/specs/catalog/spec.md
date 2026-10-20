# Catálogo de películas

## Contexto de la referencia

Describe el catálogo local, su normalización y las fuentes observadas. No afirma que el catálogo de muestra sea exhaustivo.

## Requirements

### Requirement: Normalización de registros

Prisma DEBE normalizar los registros de película disponibles a una estructura común, conservando título, año, géneros, etiquetas y metadatos presentes sin inventar valores que la fuente no proporcione.

#### Scenario: Importación de una fila CSV con metadatos parciales

- DADO un CSV con una columna de título obligatoria y algunas columnas opcionales
- CUANDO se importa el archivo
- ENTONCES las filas con título se pueden normalizar y los campos ausentes permanecen vacíos o desconocidos

#### Scenario: CSV con títulos sin género

- DADO un CSV que usa el valor de MovieLens para indicar que no hay géneros listados
- CUANDO se importa el catálogo
- ENTONCES ese marcador no se presenta como un género real

### Requirement: Fuentes del catálogo

Prisma DEBE poder combinar el catálogo incluido, el catálogo personalizado importado y registros personales enriquecidos, manteniendo la procedencia necesaria para no tratar un dato de historial como descubrimiento nuevo.

#### Scenario: Catálogo personalizado

- DADO un catálogo de usuario importado correctamente
- CUANDO se vuelve a renderizar la aplicación
- ENTONCES sus títulos forman parte del catálogo disponible en ese navegador

### Requirement: Identidad de películas con ID TMDB disponible

Cuando dos registros normalizados tienen IDs TMDB positivos diferentes, Prisma DEBE tratarlos como películas distintas y no fusionarlos solo porque compartan un título normalizado. La importación CSV DEBE conservar los IDs TMDB de los encabezados explícitos `tmdb_id` y `tmdbid` y usarlos como identidad al deduplicar e integrar los registros.

#### Scenario: Remakes con identificadores TMDB diferentes en un CSV

- DADO un CSV con dos filas del mismo título y dos IDs TMDB positivos diferentes
- CUANDO se importa el catálogo y se renderizan los resultados locales
- ENTONCES las dos identidades permanecen guardadas y se muestran como películas separadas

#### Scenario: Reimportación de una identidad TMDB existente

- DADO un catálogo personalizado que contiene el ID TMDB 990001
- CUANDO se importa otra fila con ese mismo ID y metadatos adicionales
- ENTONCES se actualiza esa identidad sin crear otra entrada para el mismo ID

#### Scenario: Identificador genérico de una fuente externa

- DADO un CSV con `id`, `movieId` o `movie_id` pero sin un encabezado TMDB explícito y un valor válido
- CUANDO se importa el catálogo
- ENTONCES el identificador se conserva como ID de origen y no se interpreta como `tmdbId`

#### Scenario: Ocultar solo una identidad TMDB

- DADO que el catálogo tiene dos películas del mismo título e IDs TMDB 990001 y 990002, y se oculta la película 990001
- CUANDO se vuelve a consultar el catálogo local
- ENTONCES la película 990001 no aparece y la película 990002 continúa visible

## Limitaciones conocidas

Las filas CSV sin un ID TMDB explícito y válido continúan usando el título normalizado como fallback de deduplicación. Por ello, no se garantiza distinguir todos los remakes u homónimos cuando la fuente no proporciona una identidad TMDB fiable. Los IDs genéricos de origen no deben interpretarse como IDs TMDB.
