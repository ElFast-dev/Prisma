# Privacidad y almacenamiento local

## Requirements

### Requirement: Perfil local por defecto

Prisma DEBE mantener el perfil personal en el navegador y no enviarlo a un servidor de perfil, porque la arquitectura actual no incluye un backend de usuarios.

#### Scenario: Uso sin sincronización

- DADO que el usuario valora una película o cambia una colección
- CUANDO se guarda el cambio
- ENTONCES el perfil se persiste en el almacenamiento del navegador

### Requirement: Respaldo frente a límites del almacenamiento

Prisma DEBE permitir exportar el perfil local y explicar que borrar los datos del sitio puede eliminarlo.

#### Scenario: Eliminación de datos del navegador

- DADO que el navegador borra el almacenamiento del sitio
- CUANDO se vuelve a abrir Prisma
- ENTONCES la aplicación no promete recuperar un perfil que ya no existe en el almacenamiento

### Requirement: Protección de datos privados en desarrollo

El proceso de desarrollo y CI DEBE usar datos sintéticos y no debe requerir historiales personales reales, copias de seguridad privadas o credenciales para ejecutar las comprobaciones ordinarias.

#### Scenario: Ejecución del workflow de calidad

- DADO que GitHub Actions ejecuta los checks del repositorio
- CUANDO se valida el proyecto
- ENTONCES los checks funcionan sin leer datos privados ni llamar a TMDB con credenciales reales


### Requirement: Solicitud explícita de persistencia del almacenamiento local

Prisma DEBE informar del estado de persistencia del almacenamiento cuando el navegador permita consultarlo y DEBE ofrecer una solicitud explícita cuando sea compatible. Prisma NO DEBE solicitar persistencia automáticamente al arrancar. La interfaz DEBE indicar que esta protección no sustituye las copias de seguridad ni evita el borrado explícito de los datos del sitio.

#### Scenario: Inicio de Prisma

- DADO que Prisma se abre con datos personales almacenados localmente
- CUANDO se inicializa la aplicación
- ENTONCES puede comprobar el estado y la cuota estimada, pero no llama a `persist()`

#### Scenario: Solicitud iniciada por la persona usuaria

- DADO que el navegador admite `navigator.storage.persist()` y el estado aún no indica persistencia concedida
- CUANDO la persona pulsa el botón de protección en Ajustes
- ENTONCES Prisma solicita persistencia y muestra el resultado real devuelto por el navegador

#### Scenario: API no disponible, denegación o error

- DADO que el navegador no admite la solicitud, la deniega o lanza un error
- CUANDO la persona consulta o intenta proteger el almacenamiento
- ENTONCES Prisma continúa funcionando, comunica el estado sin inventar una concesión y mantiene visible la recomendación de exportar una copia de seguridad

#### Scenario: Persistencia ya concedida

- DADO que el navegador informa de que el almacenamiento ya es persistente
- CUANDO se muestran los ajustes
- ENTONCES Prisma informa de ese estado y no solicita de nuevo la concesión


### Requirement: Compartir diagnósticos agregados de forma consciente

Prisma DEBE ejecutar la generación del diagnóstico localmente y solo poner su texto en el portapapeles tras una acción explícita. El informe DEBE excluir registros individuales y los identificadores directos de películas; la UI DEBE advertir de que las estadísticas agregadas por género o tema pueden revelar preferencias. Prisma NO DEBE enviar el informe a ninguna red ni añadirlo a las copias de seguridad o a la persistencia del perfil.

#### Scenario: Generación local sin envío

- DADO que hay valoraciones en el navegador
- CUANDO se genera un informe diagnóstico
- ENTONCES las métricas se calculan en el dispositivo y no se envía ninguna petición de red con esos datos

#### Scenario: Revisión antes de compartir

- DADO que la persona va a copiar el informe para compartirlo en otra conversación
- CUANDO consulta la explicación de privacidad
- ENTONCES Prisma identifica los datos que incluye y excluye, y avisa de que las estadísticas de géneros y temas aún pueden revelar gustos personales
