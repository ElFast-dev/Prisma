# Integración opcional con TMDB

## MODIFIED Requirements

### Requirement: Credencial opcional configurada por el usuario

Prisma DEBE poder funcionar sin credencial de TMDB. Cuando el usuario configura una, se guarda localmente y se usa para las solicitudes que requieren autenticación. La prueba de conexión DEBE reflejar el resultado real de `/configuration` y, si tiene éxito mientras está abierta la sección Descubrir, DEBE refrescar sus resultados sin generar un error de JavaScript por dependencias no inyectadas.

#### Scenario: Verificación correcta fuera del catálogo

- DADO que se introduce una credencial válida y TMDB responde correctamente a `/configuration`
- CUANDO se comprueba la conexión desde Ajustes
- ENTONCES Prisma guarda la credencial localmente, muestra el éxito y no presenta un error posterior causado por el propio módulo

#### Scenario: Verificación correcta desde Descubrir

- DADO que se introduce una credencial válida y la sección Descubrir está abierta
- CUANDO TMDB responde correctamente a `/configuration`
- ENTONCES Prisma muestra el éxito y recarga la búsqueda actual o la lista de películas populares

#### Scenario: Credencial rechazada por TMDB

- DADO que TMDB responde con un error de autenticación
- CUANDO se comprueba la conexión
- ENTONCES Prisma muestra el error real y no afirma que la conexión sea correcta

#### Scenario: Desconexión confirmada

- DADO que existe una credencial de TMDB guardada y la persona confirma eliminarla
- CUANDO se ejecuta la acción de desconexión
- ENTONCES Prisma elimina la credencial local, limpia los resultados remotos, reinicia la caché de géneros y muestra el estado desconectado

#### Scenario: Desconexión cancelada

- DADO que existe una credencial de TMDB guardada y la persona cancela la confirmación
- CUANDO se inicia la acción de desconexión
- ENTONCES Prisma conserva la credencial, los resultados en caché y la configuración actual
