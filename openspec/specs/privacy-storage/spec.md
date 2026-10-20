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
