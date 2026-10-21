# Integración opcional con TMDB

## Requirements

### Requirement: Credencial opcional configurada por el usuario

Prisma DEBE poder funcionar sin credencial de TMDB. Cuando el usuario configura una, se guarda localmente y se usa para las solicitudes que requieren autenticación. La prueba de conexión DEBE reflejar el resultado real de `/configuration` y no generar un error de aplicación después de una respuesta correcta.

#### Scenario: Uso sin credencial

- DADO que no existe una credencial TMDB configurada
- CUANDO se usa el catálogo local
- ENTONCES las capacidades locales continúan disponibles sin afirmar que se han cargado resultados remotos

#### Scenario: Verificación correcta de conexión

- DADO que se introduce una credencial válida y TMDB responde correctamente a `/configuration`
- CUANDO se prueba la conexión desde Ajustes
- ENTONCES Prisma guarda la credencial en este navegador y muestra éxito sin presentar un error de JavaScript posterior

#### Scenario: Desconexión confirmada

- DADO que existe una credencial TMDB guardada y la persona confirma su eliminación
- CUANDO se ejecuta la desconexión desde Ajustes
- ENTONCES Prisma borra la credencial del almacenamiento local, vacía los resultados y reinicia la caché de géneros

#### Scenario: Desconexión cancelada

- DADO que existe una credencial TMDB guardada y la persona cancela la confirmación
- CUANDO se intenta eliminarla
- ENTONCES Prisma conserva la credencial y sus datos en caché sin cambios

### Requirement: Enriquecimiento de metadatos

Prisma DEBE actualizar metadatos cinematográficos desde TMDB cuando la persona usuaria solicita una función de enriquecimiento disponible, sin convertir las puntuaciones públicas en valoraciones personales.

#### Scenario: TMDB responde correctamente

- DADO un registro con una identidad de TMDB disponible
- CUANDO se recuperan los detalles
- ENTONCES se actualizan metadatos del catálogo que la fuente proporciona

#### Scenario: Credencial o límite inválido

- DADO que TMDB responde con un error de autenticación, permiso o límite de solicitudes
- CUANDO la aplicación recibe la respuesta
- ENTONCES muestra un mensaje de error y no presenta el resultado como una consulta correcta

### Requirement: Atribución y recursos externos

La interfaz DEBE conservar la atribución requerida de TMDB en los contextos donde muestra sus datos y debe tratar las imágenes externas como recursos externos sujetos a disponibilidad.

#### Scenario: Cartel externo no disponible

- DADO que una ruta de imagen de TMDB no se puede cargar
- CUANDO se representa la ficha o tarjeta
- ENTONCES la interfaz ofrece el fallback visual disponible sin perder el título de la película

### Requirement: Recuento de votos de TMDB preservado

Prisma DEBE conservar el campo vote_count que proporciona TMDB junto a vote_average, sin sustituir valores ausentes por cifras supuestas. El recuento solo DEBE mostrarse cuando sea un entero positivo recibido de la fuente.

#### Scenario: TMDB proporciona nota y recuento

- DADO que la respuesta TMDB contiene vote_average y un vote_count positivo
- CUANDO se presenta la puntuación pública
- ENTONCES ambos valores se mantienen ligados a TMDB y se muestran con formato adecuado

#### Scenario: Recuento ausente o inválido

- DADO que no existe un recuento positivo válido
- CUANDO se presenta la puntuación pública
- ENTONCES la interfaz omite el recuento sin fabricar un valor
