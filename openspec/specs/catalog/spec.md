# Catálogo de películas

## Contexto de la referencia

Describe la normalización de registros personales y el origen de los metadatos. Prisma no incluye un catálogo de películas predeterminado; los resultados remotos de TMDB se mantienen como contenido de exploración hasta que la persona realice una acción explícita.

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

Prisma DEBE combinar registros personales, historial y catálogos que la persona haya incorporado explícitamente, manteniendo su procedencia para no tratar un dato del historial como descubrimiento nuevo. Los resultados consultados en TMDB DEBEN mantenerse separados del catálogo personal hasta que la persona guarde uno mediante una acción explícita.

#### Scenario: Catálogo personalizado

- DADO un catálogo de usuario importado correctamente
- CUANDO se vuelve a renderizar la aplicación
- ENTONCES sus títulos forman parte del catálogo disponible en ese navegador

#### Scenario: Resultados remotos de TMDB

- DADO que TMDB devuelve películas para explorar
- CUANDO se muestran en Descubrir
- ENTONCES esas películas no se agregan automáticamente a valoraciones, historial, pendientes, ocultos ni catálogo personal

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


### Requirement: Inicio sin películas predeterminadas

Prisma DEBE empezar con el perfil personal y el catálogo local vacíos cuando no haya datos guardados, y NO DEBE cargar títulos de muestra desde archivos publicados.

#### Scenario: Instalación nueva

- DADO un navegador sin estado ni catálogo personalizados
- CUANDO Prisma inicia
- ENTONCES el catálogo combinado contiene cero títulos y el perfil sigue vacío

#### Scenario: Usuario existente tras actualizar

- DADO un navegador con valoraciones o un catálogo importado guardados
- CUANDO se actualiza la aplicación
- ENTONCES los datos existentes se conservan y no se mezclan películas de muestra

### Requirement: Completitud del enriquecimiento cinematográfico

Prisma DEBE distinguir entre los metadatos básicos de TMDB y la obtención confirmada de créditos y palabras clave. Un registro antiguo con metadatos básicos recientes PERO sin marcadores actuales de créditos y palabras clave DEBE seguir siendo elegible para enriquecimiento. Al completar la actualización, Prisma DEBE preservar notas personales, fechas, listas y la identidad TMDB.

#### Scenario: Carátula reciente pero sin créditos

- DADO un registro con carátula TMDB reciente que no registra créditos o palabras clave obtenidos
- CUANDO Prisma calcula la cola de enriquecimiento del historial
- ENTONCES vuelve a incluir ese registro para obtener los datos que faltan

#### Scenario: Detalles completos y recientes

- DADO un registro que marca créditos y palabras clave como obtenidos dentro de la ventana de vigencia
- CUANDO Prisma calcula la cola de enriquecimiento
- ENTONCES no solicita repetidamente los mismos detalles

#### Scenario: Actualizar metadatos sin alterar datos personales

- DADO un registro antiguo con nota personal y fecha de visionado
- CUANDO se cargan los créditos y las palabras clave que faltaban
- ENTONCES se amplían los metadatos cinematográficos y se mantienen la nota, la fecha y la identidad de la película

### Requirement: Candidatas remotas temporales

Prisma DEBE poder usar como candidatas los resultados populares consultados de TMDB y DEBE mantenerlos separados del catálogo personalizado persistente. El uso de una película para puntuarla NO DEBE guardarla por sí mismo en las valoraciones, historial, pendientes, ocultas, catálogo ni copias de seguridad.

#### Scenario: Película remota usada solo para recomendar

- DADO que una película popular de TMDB no pertenece a ninguna lista personal
- CUANDO el ranking la considera una recomendación
- ENTONCES puede mostrarse sin guardarla automáticamente en el navegador como parte de la colección

#### Scenario: Eliminar la credencial

- DADO que hay candidatas de TMDB guardadas solo en memoria
- CUANDO la persona elimina la credencial
- ENTONCES Prisma vacía tanto los resultados de exploración como las candidatas remotas temporales


### Requirement: Géneros de catálogo equivalentes

Prisma DEBE convertir los alias reconocidos de género a una etiqueta española canónica y eliminar repeticiones tras la conversión.

#### Scenario: Alias entre fuentes

- DADO que la misma película contiene versiones inglesas, españolas o sin acentos de un género conocido
- CUANDO se normaliza el catálogo
- ENTONCES los alias reconocidos se guardan como una sola etiqueta canónica.


### Requirement: Identidad de fallback por título y año

Prisma DEBE priorizar un ID TMDB positivo y, cuando falte, usar el título normalizado y el año fiable para resolver identidad. Prisma NO DEBE fusionar registros con el mismo título y años conocidos diferentes. Un registro sin ID o año solo DEBE reconciliarse con otra identidad si existe una única correspondencia posible y no hay conflicto con los años o IDs conocidos.

#### Scenario: Registros sin ID de años distintos

- DADO que el catálogo contiene dos registros con el mismo título y sin ID TMDB, uno de 1998 y otro de 2024
- CUANDO Prisma normaliza y combina el catálogo
- ENTONCES conserva ambos registros como películas distintas

#### Scenario: Registro legado sin ID ni año con una sola candidata

- DADO que existe una única película TMDB con un título normalizado y un registro legado homónimo sin ID ni año
- CUANDO se combinan las fuentes del catálogo
- ENTONCES Prisma puede reconciliar el registro legado con esa identidad y aprovechar los metadatos verificados

#### Scenario: Registro legado ambiguo entre remakes

- DADO que existen dos IDs TMDB distintos para el mismo título y un registro legado sin ID ni año
- CUANDO Prisma combina o importa los registros
- ENTONCES conserva el registro legado separado en vez de asignarlo arbitrariamente a un remake
