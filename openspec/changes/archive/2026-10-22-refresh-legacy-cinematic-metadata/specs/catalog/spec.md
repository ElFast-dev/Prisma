## ADDED Requirements

### Requirement: Completar el enriquecimiento de registros existentes

Prisma DEBE distinguir los metadatos básicos de TMDB de los créditos y palabras clave obtenidos. Un registro con datos básicos recientes PERO sin marcadores actuales de créditos o palabras clave DEBE seguir siendo elegible para enriquecimiento. La actualización DEBE preservar nota, fechas, listas e identidad TMDB.

#### Scenario: Metadatos básicos recientes

- DADO un registro con póster TMDB reciente y sin marcador de créditos o palabras clave
- CUANDO Prisma prepara la cola de sincronización
- ENTONCES vuelve a incluirlo para completar los metadatos cinematográficos

#### Scenario: Metadatos completos

- DADO un registro con créditos y palabras clave marcados como obtenidos dentro de la vigencia
- CUANDO Prisma prepara la cola de sincronización
- ENTONCES no repite la solicitud de detalles innecesariamente

#### Scenario: Refresco seguro

- DADO que el registro tiene nota personal, fecha de visionado e identidad TMDB
- CUANDO llegan créditos y palabras clave
- ENTONCES se amplían los metadatos sin cambiar esos datos personales