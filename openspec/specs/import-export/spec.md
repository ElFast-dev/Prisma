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


### Requirement: Fechas de visionado en el historial Android v2 reconocido

Prisma DEBE conservar la procedencia de las fechas y NO DEBE interpretar un campo de fecha ambiguo como visionado para formatos desconocidos. Para la exportación Android v2 reconocida (platform=android, version=2, movies.cH como colección de vistas), el campo "a" de cada fila de movies.cH DEBE importarse también como watchedAt explícito, sin restringirlo a la racha personal. Prisma DEBE conservar el instante original, mantener la compatibilidad del dato fuente en addedAt y NO DEBE modificar el JSON original. En movies.cW y movies.cHid, el campo "a" mantiene su significado propio de cada colección, no el de fecha de visionado. Al reimportar, Prisma DEBE combinar por identidad de película y actualizar las fechas explícitas de forma idempotente, sin duplicados ni pérdida de fechas confirmadas manualmente.

#### Scenario: Reconocer la racha personal

- DADO un archivo Android v2 que contiene Source Code (TMDB 45612) el 15 de enero de 2026 en el día local de Panamá
- CUANDO se importa el JSON
- ENTONCES se crea el registro de racha personal confirmada del 15 de enero al 21 de octubre de 2026, con 280 días consecutivos y una meta diaria

#### Scenario: Importar fechas para todo el historial visto

- DADO que movies.cH contiene películas con marcas "a" válidas anteriores, dentro o posteriores al intervalo de la racha
- CUANDO se importa la exportación Android v2 reconocida
- ENTONCES cada marca válida se guarda como watchedAt con su instante original y procedencia explícita; solo las marcas del intervalo de la racha reciben la etiqueta streak-confirmed

#### Scenario: No extender la racha con otras fechas

- DADO que una película tiene una marca explícita antes del 15 de enero o después del 21 de octubre de 2026
- CUANDO Prisma presenta el historial y calcula los días de la racha
- ENTONCES muestra su fecha de visionado y puede usarla como fecha explícita del historial, pero no amplía ni modifica el registro de 280 días confirmados

#### Scenario: Mantener la fecha independiente en otras colecciones y formatos

- DADO que un JSON no corresponde al historial Android v2 reconocido, o que la fila pertenece a pendientes u ocultos
- CUANDO se importa una marca "a"
- ENTONCES Prisma no convierte ese campo en fecha de visionado, salvo que el registro incluya watchedAt o watched_at explícito

#### Scenario: Corregir una fecha local obsoleta en la racha confirmada

- DADO un estado local cuya fecha contradice la marca explícita del archivo Android v2 reconocido dentro de la racha
- CUANDO se vuelve a importar el archivo
- ENTONCES prevalece la fecha de la exportación para ese día confirmado, se conserva el instante UTC y la película no se duplica

#### Scenario: No confundir la fecha de valoración con la fecha de visionado

- DADO un registro que contiene una fecha de valoración (rA o updatedAt) distinta de la fecha explícita del visionado
- CUANDO Prisma muestra la fecha dentro de la ficha o el historial
- ENTONCES usa solo watchedAt explícito convertido al día local de Panamá y no sustituye una fecha ausente por la valoración
