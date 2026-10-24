# Privacidad y almacenamiento durante la sincronización

## MODIFIED Requirements

### Requirement: Perfil local por defecto

Prisma DEBE conservar el almacenamiento local como modo funcional predeterminado y NO DEBE exigir cuenta para abrir o usar funciones locales. La sincronización remota es opcional y solo se activa tras autorización inicial autenticada y explícita. Después de autorizar, la sincronización puede operar automáticamente según los permisos concedidos, sin confirmar cada cambio rutinario.

#### Scenario: Uso sin cuenta

- DADO que la persona no conecta una cuenta
- CUANDO valora una película o modifica una colección
- ENTONCES el cambio se guarda localmente y no se envía al backend

#### Scenario: Uso tras autorización inicial

- DADO que la persona ha iniciado sesión y autorizado la sincronización
- CUANDO cambia una valoración o colección
- ENTONCES Prisma sincroniza el cambio según reglas versionadas y muestra el estado real

### Requirement: Protección de datos privados en desarrollo

El proceso de desarrollo y CI DEBE usar datos sintéticos y no requerir historiales reales, respaldos privados o credenciales para las pruebas ordinarias. Las evaluaciones con historial real DEBEN ejecutarse en un worker privado aislado y nunca adjuntar ese historial a artefactos, logs ni issues.

#### Scenario: Ejecución de quality gates

- DADO que GitHub Actions ejecuta los checks del repositorio
- CUANDO se valida el proyecto
- ENTONCES los checks funcionan sin leer datos privados, usar copias de seguridad reales ni llamar a TMDB con credenciales reales

#### Scenario: Evaluación privada

- DADO que una evaluación requiere el historial real
- CUANDO se ejecuta mediante el servicio autorizado
- ENTONCES el worker mantiene los datos dentro del perímetro privado y devuelve agregados sanitizados sin registros individuales

### Requirement: Compartir diagnósticos agregados de forma consciente

Prisma DEBE distinguir la copia manual del informe y el envío automático autorizado al backend. La copia manual permanece local hasta una acción explícita. El envío automático solo puede activarse mediante autorización específica y revocable, y DEBE usar una lista permitida que excluya títulos, IDs de películas, valoraciones individuales, fechas exactas y texto libre. Los agregados por género o tema pueden revelar preferencias y deben identificarse como datos personales inferibles.

#### Scenario: Sin autorización automática

- DADO que se genera un diagnóstico y no hay permiso vigente de envío automático
- CUANDO termina el cálculo
- ENTONCES el informe permanece local y no se transmite

#### Scenario: Envío autorizado

- DADO que la persona autorizó el diagnóstico automático y la sesión es válida
- CUANDO se genera un informe con esquema compatible
- ENTONCES solo se transmiten campos agregados permitidos y queda un evento técnico sin contenido del informe

#### Scenario: Revocación de autorización

- DADO que la persona revoca la sincronización o el diagnóstico automático
- CUANDO Prisma procesa la revocación
- ENTONCES detiene nuevos envíos y conserva localmente los cambios pendientes, comunicando el estado real del servidor


### Requirement: Persistencia local de la racha confirmada

Prisma DEBE conservar localmente la racha confirmada y sus metadatos. La sincronización remota de esta categoría SOLO puede ocurrir después de que la vista previa de migración la identifique como parte del perfil que se va a copiar y la persona autorice esa sincronización. La sincronización NO DEBE crear filas de películas ni registros de visionado para rellenar días ausentes.

#### Scenario: Perfil sin sincronización autorizada

- DADO que existe una racha confirmada y la sincronización no está autorizada
- CUANDO Prisma guarda o abre el perfil
- ENTONCES la racha permanece local y no se envía al backend

#### Scenario: Racha incluida en una sincronización autorizada

- DADO que la vista previa indica que se copiarán los metadatos de la racha y la persona autoriza esa migración
- CUANDO Prisma sincroniza el perfil
- ENTONCES copia solo los metadatos confirmados necesarios y conserva el intervalo, objetivo y procedencia sin generar películas ni visionados

#### Scenario: Días ausentes

- DADO que la racha incluye días sin películas registradas
- CUANDO se sincroniza o restaura la racha
- ENTONCES Prisma conserva su declaración sin inventar registros de películas para completar el calendario
