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
