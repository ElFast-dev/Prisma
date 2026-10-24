# Operaciones del agente autónomo

## ADDED Requirements

### Requirement: Diagnósticos automáticos agregados

Prisma DEBE poder publicar al servicio privado autorizado estados técnicos y diagnósticos agregados cuando la persona habilite la integración correspondiente. Los informes destinados al agente NO DEBEN incluir notas individuales, títulos relacionados con el historial, IDs de películas, fechas personales exactas, respaldos ni credenciales.

#### Scenario: Informe para el agente

- DADO que el perfil tiene valoraciones y la integración automática está autorizada
- CUANDO termina un diagnóstico
- ENTONCES el backend recibe únicamente los campos agregados previstos por un esquema versionado y no recibe registros individuales

#### Scenario: Integración no autorizada

- DADO que la integración automática no está autorizada o no hay sesión válida
- CUANDO se genera un diagnóstico
- ENTONCES el informe permanece local y no se intenta transmitir

### Requirement: Trabajos autorizados, trazables y acotados

Cada trabajo automático DEBE tener un ID, tipo permitido, versión de esquema/código, estado, límites, resultado y motivo de fallo. El backend DEBE validar origen, propietario y tipo; el agente NO DEBE construir una ejecución arbitraria a partir de texto importado del perfil.

#### Scenario: Solicitud repetida

- DADO que el mismo trabajo se entrega dos veces por reintento
- CUANDO el coordinador recibe ambas solicitudes
- ENTONCES las deduplica mediante una clave de idempotencia o mecanismo equivalente

#### Scenario: Trabajo desconocido o fuera de límites

- DADO que una solicitud supera los límites o contiene un tipo no permitido
- CUANDO el worker la valida
- ENTONCES la rechaza con un error explícito y no ejecuta comandos

#### Scenario: Fallo durante la ejecución

- DADO que un trabajo falla, se cancela o supera su plazo
- CUANDO se publica el estado final
- ENTONCES indica el estado real, registra evidencia técnica no sensible y no se presenta como completado

### Requirement: Separación entre acceso a datos y modificación del código

La IA que edita el repositorio DEBE usar permisos de GitHub acotados y datos agregados; el worker con acceso al perfil personal DEBE operar sin capacidad de modificar el repositorio o desplegar código. Ambos componentes se comunican mediante contrato versionado y resultados sanitizados.

#### Scenario: Agente revisa código

- DADO que el agente analiza un fallo de recomendación
- CUANDO solicita contexto técnico
- ENTONCES obtiene código, especificaciones, estado de trabajos y métricas autorizadas, pero no credenciales administrativas ni acceso SQL genérico

#### Scenario: Experimento con historial personal

- DADO que un experimento necesita las notas y características reales
- CUANDO se ejecuta
- ENTONCES los cálculos ocurren en el worker privado autorizado y el agente recibe resultados agregados, cobertura, versión y errores sanitizados

### Requirement: Publicación automática subordinada a las compuertas

Los cambios del agente DEBEN pasar SDD, calidad, pruebas pertinentes y Playwright antes de entrar en el despliegue existente. El agente NO DEBE crear una ruta que omita esas compuertas ni tratar tests sintéticos como prueba personalizada real.

#### Scenario: Un gate falla

- DADO que una prueba obligatoria falla
- CUANDO el agente termina una corrección
- ENTONCES el cambio no se fusiona ni publica y queda bloqueado o fallido

#### Scenario: Falta evidencia personal

- DADO que un cambio necesita evaluación con el historial real
- CUANDO solo hay resultados sintéticos o revisión estática
- ENTONCES la tarea permanece pendiente y el modelo activo no cambia

### Requirement: Operaciones críticas limitadas

El agente DEBE tener bloqueadas, salvo por un mecanismo de autorización separado, las operaciones que alteran permisos/secrets, crean gastos no acotados, eliminan datos personales, ejecutan migraciones irreversibles o sustituyen el modelo activo. Las tareas rutinarias y reversibles pueden automatizarse una vez configurados los permisos.

#### Scenario: Acción de alto impacto

- DADO que un trabajo intenta borrar datos personales, modificar credenciales, aumentar costes o ejecutar una migración irreversible
- CUANDO se aplica la política de autorización
- ENTONCES se detiene y requiere el mecanismo de autorización definido, con registro auditable
