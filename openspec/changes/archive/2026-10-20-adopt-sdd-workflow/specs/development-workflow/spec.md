# Delta de especificación: flujo de desarrollo

## ADDED Requirements

### Requirement: Expediente versionado por cambio

Todo cambio que afecte el comportamiento DEBE tener un expediente versionado con propuesta, requisitos afectados, diseño apropiado al riesgo y tareas antes de implementar.

#### Scenario: Nueva funcionalidad

- DADO que se propone una funcionalidad nueva
- CUANDO comienza la implementación
- ENTONCES existe un expediente revisable que explica motivación, alcance y criterios de aceptación

### Requirement: Trazabilidad entre tareas y requisitos

Las tareas DEBEN ser pequeñas, estar ordenadas por dependencia y referirse a los requisitos que satisfacen o protegen.

#### Scenario: Un requisito sin tarea

- DADO un requisito obligatorio dentro del alcance
- CUANDO se revisa el plan de implementación
- ENTONCES existe al menos una tarea que lo implementa o verifica

### Requirement: Evidencia honesta de verificación

Un cambio NO DEBE declararse completado si hay criterios obligatorios sin verificar. Los checks estáticos no se consideran evidencia suficiente para un comportamiento que requiera interacción real.

#### Scenario: Prueba no ejecutada

- DADO que una prueba necesaria no pudo ejecutarse
- CUANDO se informa el estado del cambio
- ENTONCES la prueba queda como pendiente o bloqueada y no se declara convergencia completa

### Requirement: Protección de datos en desarrollo

La CI y las pruebas automatizadas DEBEN funcionar con datos sintéticos y no requerir historiales personales reales, credenciales TMDB ni servicios remotos.

#### Scenario: Ejecución del workflow de calidad

- DADO un pull request para Prisma
- CUANDO se ejecuta la validación ordinaria
- ENTONCES los checks corren sin secretos ni archivos personales

### Requirement: Especificaciones al día

Al cerrar un cambio, las especificaciones vigentes DEBEN describir el comportamiento aceptado, y el expediente histórico debe conservar una constancia clara de la verificación.

#### Scenario: Cambio aceptado

- DADO que se completan las tareas y pasan los criterios de aceptación
- CUANDO se prepara el cierre
- ENTONCES las specs vigentes se actualizan y el expediente queda listo para archivar
