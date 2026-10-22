# Importación y exportación local

## Requirements

### Requirement: Importación de historial personal

Prisma DEBE procesar en el navegador archivos JSON que coincidan con los formatos de historial admitidos, extraer los registros reconocibles y mostrar un error comprensible cuando no encuentre películas o valoraciones compatibles.

#### Scenario: Archivo sin registros reconocibles

- DADO un archivo JSON válido sintácticamente pero sin registros de película admitidos
- CUANDO se importa el archivo
- ENTONCES la aplicación informa que no encontró registros reconocibles

#### Scenario: Importación de colecciones y notas

- DADO un historial que incluye valoraciones y colecciones de películas admitidas
- CUANDO se importa el historial
- ENTONCES las películas reconocibles pasan al perfil local y no se modifica el archivo original

### Requirement: Copia de seguridad restaurable

Prisma DEBE permitir exportar el estado personal y el catálogo personalizado y restaurarlos desde un archivo que identifique el formato de copia de seguridad de Prisma.

#### Scenario: Restauración de un archivo válido

- DADO un archivo con la marca de copia de seguridad de Prisma y un estado presente
- CUANDO se restaura
- ENTONCES se normaliza el estado y se guarda en el navegador

#### Scenario: Rechazo de un archivo de copia desconocido

- DADO un archivo que no tiene el formato de copia de Prisma
- CUANDO se intenta restaurar
- ENTONCES se informa del error sin presentarlo como una restauración correcta

### Requirement: Exclusión de credenciales

La copia de seguridad DEBE excluir la credencial de TMDB para no propagar secretos al exportar, compartir o respaldar datos personales.

#### Scenario: Exportación de una copia

- DADO que hay una credencial de TMDB guardada en el navegador
- CUANDO se exporta una copia de seguridad
- ENTONCES la credencial no aparece en el archivo exportado


### Requirement: Importación con procedencia del reto de visionado

Prisma DEBE detectar el formato Android v2 del historial personal y distinguir las marcas de visionado verificables del reto diario de las marcas anteriores añadidas retrospectivamente. La importación DEBE mantener el campo `a` original en `addedAt`, guardar la procedencia del visionado por separado y NO DEBE modificar el archivo JSON fuente. Al reimportar, Prisma DEBE actualizar los marcadores del estado local de forma idempotente, sin duplicar películas y sin eliminar fechas confirmadas manualmente.

#### Scenario: Importar el historial del reto

- DADO un archivo Android v2 que contiene `Source Code` (TMDB 45612) el 15 de enero de 2026 en la fecha local de Panamá
- CUANDO se importa el JSON
- ENTONCES las marcas desde esa fecha se enlazan como visionados verificables, el instante UTC se conserva y `addedAt` sigue disponible por separado

#### Scenario: Importar marcas anteriores al reto

- DADO una película cuya marca del historial pertenece a un día anterior al 15 de enero de 2026
- CUANDO se importa el JSON reconocido
- ENTONCES la fecha se conserva como metadato original, pero no se usa como fecha real de visionado sin confirmación manual

#### Scenario: Corregir fechas obsoletas dentro del reto confirmado

- DADO un estado local cuya fecha para una película contradice la marca original de una exportación reconocida y fiable del reto
- CUANDO se vuelve a importar esa exportación y la entrada recibe `watchDateConfidence=streak-confirmed`
- ENTONCES prevalece la marca temporal del archivo de origen, se conserva su instante UTC, la interfaz calcula el día calendario en `America/Panama` y la película no se duplica
- Y las entradas `pre-streak-unverified` siguen sin sobrescribir las fechas confirmadas manualmente

#### Scenario: No confundir la fecha de valoración con la fecha de visionado

- DADO un registro que contiene una fecha de valoración (`rA` o `updatedAt`) distinta de la fecha explícita del visionado
- CUANDO Prisma muestra la fecha dentro de la ficha o el historial
- ENTONCES usa solo `watchedAt` explícito convertido al día local de Panamá y no sustituye una fecha ausente por la valoración o la incorporación


### Requirement: Importación que preserva identidades homónimas

La importación de valoraciones, historial, listas y catálogo DEBE aplicar el fallback compartido de identidad por título y año cuando no existe ID TMDB. NO DEBE fusionar remakes con años conocidos distintos ni asignar arbitrariamente registros sin año a una película homónima.

#### Scenario: Reimportar remakes sin ID TMDB

- DADO que un archivo de importación contiene dos películas con el mismo título pero años distintos y sin ID TMDB
- CUANDO se importa el archivo por segunda vez
- ENTONCES ambas identidades permanecen separadas y no se duplican las filas del mismo título y año

### Requirement: Procedencia de fecha visible en el historial

Prisma NO DEBE presentar una marca temporal creada automáticamente al guardar una valoración como fecha de visionado. La acción explícita «Marcar como vista» DEBE registrar su propio instante como fecha confirmada si no hay una fecha fiable existente que preservar. Las fechas importadas explícitamente o confirmadas por la persona DEBEN conservarse.

#### Scenario: Momento de puntuación no equivale a visionado

- DADO que un registro tiene `watchedAtSource=action-time`
- CUANDO se muestra la ficha o la colección
- ENTONCES Prisma no presenta ese instante como fecha de visionado

#### Scenario: Marcar explícitamente una película como vista

- DADO que la película no dispone de una fecha de visionado fiable
- CUANDO la persona usa «Marcar como vista»
- ENTONCES Prisma guarda la hora de esa acción con procedencia `user-confirmed` y la presenta según el calendario de Panamá
