# Delta: identidad en la importación de catálogos CSV

## MODIFIED Requirements

### Requirement: Identidad de películas con ID TMDB disponible

Cuando dos registros normalizados tienen IDs TMDB positivos diferentes, Prisma DEBE tratarlos como películas distintas y no fusionarlos solo porque compartan un título normalizado. La importación CSV DEBE conservar los identificadores TMDB provenientes de los encabezados explícitos `tmdb_id` o `tmdbid` y DEBE usar esa identidad al deduplicar filas importadas.

#### Scenario: Remakes con identificadores TMDB diferentes en un CSV

- DADO un CSV con dos filas del mismo título y dos IDs TMDB positivos diferentes
- CUANDO se importa el catálogo
- ENTONCES las dos identidades se conservan en el catálogo personalizado y en la combinación del catálogo

#### Scenario: Reimportación de la misma identidad TMDB

- DADO un catálogo personalizado que ya contiene un registro con ID TMDB 990001
- CUANDO se importa otra fila con ID TMDB 990001 y el mismo título
- ENTONCES se actualiza la entrada de esa identidad en vez de crear un duplicado

#### Scenario: No confundir el ID de MovieLens con TMDB

- DADO un CSV con la columna genérica `movieId` pero sin `tmdb_id` ni `tmdbid`
- CUANDO se importa el archivo
- ENTONCES `movieId` permanece como identificador de origen y no se convierte en `tmdbId`

#### Scenario: Identificador TMDB no válido

- DADO una fila cuyo campo `tmdb_id` no es un entero positivo válido
- CUANDO se importa el archivo
- ENTONCES Prisma no inventa un identificador TMDB a partir de ese valor
