## ADDED Requirements

### Requirement: Generación de candidatas remotas sin modificar la colección
Prisma DEBE poder ampliar las candidatas del recomendador mediante fuentes generales de películas de TMDB, puntuarlas localmente y excluir películas que la persona ya conoce. Prisma NO DEBE enviar a TMDB el historial, valoraciones, identificadores de películas personales ni señales aprendidas del perfil para generar ese conjunto. Las candidatas remotas DEBEN permanecer en memoria y NO DEBEN incorporarse automáticamente a la colección personal.

#### Scenario: Candidatas generales de TMDB
- DADO que la persona abre Descubrir y hay una credencial TMDB configurada
- CUANDO Prisma genera el conjunto de candidatas
- ENTONCES consulta fuentes públicas generales, mezcla los resultados con el catálogo disponible y aplica el ranking del perfil en el dispositivo

#### Scenario: Película que ya pertenece a la colección
- DADO que una película remota ya está vista, valorada, pendiente u oculta
- CUANDO se construye el ranking
- ENTONCES Prisma la excluye aunque provenga de una fuente remota y nunca la duplica por aparecer en varias fuentes

#### Scenario: Error parcial o total de fuentes
- DADO que una o más fuentes de candidatas de TMDB fallan
- CUANDO se actualiza Descubrir
- ENTONCES Prisma conserva las fuentes válidas, comunica el resultado parcial o el error y no rompe el resto de la aplicación

#### Scenario: Inicio vacío y almacenamiento local
- DADO que Prisma acaba de instalarse o se elimina la credencial TMDB
- CUANDO se inicia la aplicación o se limpia la integración
- ENTONCES el perfil y la colección personal permanecen sin datos de muestra, las candidatas remotas no se persisten y las peticiones tardías no repueblan la caché tras quitar la credencial
