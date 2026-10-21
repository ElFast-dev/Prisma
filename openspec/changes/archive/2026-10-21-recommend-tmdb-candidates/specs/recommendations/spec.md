## ADDED Requirements

### Requirement: Generación híbrida de candidatas para descubrimiento

Prisma DEBE combinar las candidatas válidas del catálogo local con las películas populares de TMDB ya consultadas durante la sesión, y DEBE puntuar todas las candidatas con el mismo perfil y el mismo ranking. Los resultados de una búsqueda manual NO DEBEN sustituir el conjunto genérico de candidatas populares. La fuente remota debe permanecer en memoria y no modificar la colección persistida.

#### Scenario: Candidatas remotas disponibles

- DADO que una consulta de películas populares de TMDB ha devuelto resultados
- CUANDO el ranking personalizado se vuelve a calcular
- ENTONCES las películas remotas elegibles se mezclan con las candidatas locales y se ordenan según la estimación del perfil actual

#### Scenario: Resultados de búsqueda aislados

- DADO que la persona realiza una búsqueda explícita de películas por texto
- CUANDO TMDB devuelve coincidencias
- ENTONCES la lista de recomendaciones mantiene el pool genérico de populares y no se personaliza ni sobrescribe con esa búsqueda

#### Scenario: Sin TMDB conectado

- DADO que no hay credencial TMDB disponible
- CUANDO se calcula la lista recomendada
- ENTONCES solo se puntúan las candidatas locales y el ranking continúa funcionando

#### Scenario: Fallo al actualizar películas populares

- DADO que ya existe un pool válido de candidatas y falla una nueva consulta de películas populares
- CUANDO termina la petición fallida
- ENTONCES Prisma conserva las candidatas anteriores en memoria y mantiene disponible el ranking, sin crear ni persistir registros nuevos
