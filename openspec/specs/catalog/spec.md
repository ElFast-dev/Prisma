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

Cuando dos registros normalizados tienen IDs TMDB positivos diferentes, Prisma DEBE tratarlos como películas distintas y no fusionarlos solo porque compartan un título normalizado.

#### Scenario: Remakes con identificadores diferentes

- DADO que dos registros llegan a la capa de catálogo con IDs TMDB distintos
- CUANDO se combinan los registros
- ENTONCES cada ID conserva una identidad independiente

## Limitaciones conocidas

Algunas rutas de importación deduplican por título normalizado y no todas las columnas genéricas de ID se convierten en un ID TMDB. La cobertura de remakes y homónimos por cada formato de importación debe mejorarse con casos sintéticos antes de prometer la misma garantía en todos los formatos.
