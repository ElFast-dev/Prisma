# Sincronización privada del perfil

## ADDED Requirements

### Requirement: Sincronización autenticada y optativa

Prisma DEBE conservar el funcionamiento local sin cuenta y SOLO DEBE copiar datos personales a un backend después de una autorización inicial clara, autenticada y específica para sincronizar el perfil. Una vez autorizado, los cambios pueden sincronizarse automáticamente cuando la aplicación y la conectividad estén disponibles.

#### Scenario: Perfil nuevo no conectado

- DADO que la persona abre Prisma sin conectarse a una cuenta
- CUANDO se inicializa y usa la aplicación
- ENTONCES el perfil y el catálogo personal comienzan vacíos y los datos se guardan localmente sin crear registros remotos

#### Scenario: Primera sincronización autorizada

- DADO que existe un perfil local y la persona ha iniciado sesión y autorizado la sincronización
- CUANDO empieza la migración inicial
- ENTONCES Prisma valida el esquema, muestra recuentos y resultado, y no elimina ni sobrescribe el estado local hasta que la reconciliación termina correctamente

#### Scenario: Conectividad no disponible

- DADO que el backend no está disponible o el dispositivo está sin conexión
- CUANDO se modifica una valoración o colección
- ENTONCES Prisma conserva el cambio local, marca la sincronización pendiente y no bloquea el uso básico

### Requirement: Aislamiento de perfiles en el servidor

El backend DEBE autenticar cada petición privada y aplicar autorización por propietario en todas las operaciones. Las políticas de base de datos y permisos de API DEBEN aplicar mínimo privilegio conjuntamente.

#### Scenario: Lectura cruzada de otra cuenta

- DADO que una petición autenticada de la cuenta A intenta leer registros de la cuenta B
- CUANDO el backend procesa la petición
- ENTONCES la operación se deniega sin revelar si existen esos registros

#### Scenario: Escritura con propietario falsificado

- DADO que una petición intenta asignar una fila a un propietario distinto de la identidad autenticada
- CUANDO se valida la operación
- ENTONCES el servidor deriva el propietario de la identidad autenticada y rechaza la asignación falsificada

### Requirement: Sincronización idempotente y reconciliación segura

Prisma DEBE usar identidades estables, versiones de esquema y revisión o mecanismo equivalente para hacer idempotentes los reintentos y resolver conflictos según reglas de dominio. No DEBE aplicar último escritor ciego cuando pueda sobrescribir notas, fechas confirmadas o identidades de película.

#### Scenario: Reintento de una operación

- DADO que una operación se guardó pero el cliente no recibió confirmación
- CUANDO Prisma repite la operación
- ENTONCES el servidor no crea duplicados ni aplica dos veces el cambio

#### Scenario: Conflicto en una nota o fecha personal

- DADO que el mismo registro cambió local y remotamente desde revisiones diferentes
- CUANDO se sincronizan ambos estados
- ENTONCES se aplica una regla verificable, se preservan valores personales no vacíos y los conflictos no reconciliables no se resuelven por conjetura

### Requirement: Recuperación, exportación y borrado remoto

La arquitectura sincronizada DEBE proporcionar una ruta documentada para exportar datos, restaurarlos y solicitar borrado remoto. Las migraciones DEBEN poder validarse y revertirse antes de eliminar la única copia válida.

#### Scenario: Migración incompleta

- DADO que falla la migración de un perfil local
- CUANDO el sistema detecta recuentos o validaciones incompatibles
- ENTONCES conserva el origen, detiene la eliminación y presenta un estado recuperable

#### Scenario: Exportar y borrar datos remotos

- DADO que una persona autenticada solicita exportar o borrar su perfil remoto
- CUANDO el backend procesa la solicitud
- ENTONCES verifica identidad, realiza la operación autorizada y deja un resultado auditable sin registrar el contenido personal en logs
