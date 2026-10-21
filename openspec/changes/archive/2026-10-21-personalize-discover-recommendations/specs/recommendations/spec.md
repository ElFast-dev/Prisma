## MODIFIED Requirements

### Requirement: Recomendaciones equilibradas y personalizables

Prisma DEBE ofrecer un modo equilibrado de recomendaciones por defecto y permitir cambiar entre afinidad y variedad. La selección DEBE conservar las puntuaciones estimadas y las restricciones de identidad/colección existentes. La preferencia DEBE persistir solo en el dispositivo y no formar parte del perfil cinematográfico exportado.

#### Scenario: Modo equilibrado predeterminado

- DADO que el navegador no tiene un modo de recomendación válido guardado
- CUANDO se abre Descubrir
- ENTONCES el ranking usa Equilibrado y comunica visualmente qué opción está activa

#### Scenario: Priorizar afinidad

- DADO que hay candidatas con puntuaciones estimadas distintas
- CUANDO se selecciona Más afines
- ENTONCES se ordenan por puntuación estimada y señales coincidentes sin penalización por repetición de género

#### Scenario: Favorecer variedad

- DADO que varias candidatas tienen puntuaciones estimadas comparables y géneros diferentes
- CUANDO se selecciona Más variedad
- ENTONCES el ranking favorece géneros menos representados con una penalización moderada a las repeticiones, sin ignorar la nota estimada

#### Scenario: Persistencia local de preferencia

- DADO que el usuario elige Más variedad y localStorage está disponible
- CUANDO recarga Prisma y vuelve a Descubrir
- ENTONCES Más variedad sigue activa en este navegador sin subir datos personales a un servidor

#### Scenario: Almacenamiento local bloqueado

- DADO que localStorage no está disponible o contiene un modo desconocido
- CUANDO Prisma inicia o elige un modo
- ENTONCES la aplicación continúa usando el último modo válido disponible o Equilibrado sin fallar

#### Scenario: Exclusión e identidad preservadas en cada modo

- DADO que el catálogo contiene duplicados, remakes e items de la colección
- CUANDO se genera una mezcla de recomendaciones con cualquiera de los modos
- ENTONCES cada identidad aparece una sola vez y quedan excluidas las películas vistas, valoradas, pendientes u ocultas
