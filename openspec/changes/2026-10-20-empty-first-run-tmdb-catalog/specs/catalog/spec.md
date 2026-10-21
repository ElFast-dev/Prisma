# Catálogo sin contenido predeterminado

## ADDED Requirements

### Requirement: Perfil y catálogo local vacíos al iniciar

Prisma DEBE iniciar sin películas de muestra empaquetadas. El catálogo local solo DEBE contener registros guardados o incorporados mediante una acción explícita de la persona usuaria; el contenido de navegación remota no DEBE escribirse como historial o colección personal automáticamente.

#### Scenario: Primera visita sin datos personales

- DADO que no existen valoraciones, historial, listas ni catálogo importado en el navegador
- CUANDO Prisma termina de iniciarse
- ENTONCES el perfil personal y el catálogo local quedan vacíos y no se muestran tarjetas locales predeterminadas

#### Scenario: Descubrir sin credencial TMDB ni catálogo importado

- DADO que la persona aún no ha conectado TMDB ni importado películas
- CUANDO abre Descubrir
- ENTONCES la interfaz muestra el estado vacío y no inventa títulos o metadatos

#### Scenario: Descubrir con credencial TMDB

- DADO que la persona tiene una credencial TMDB válida y no tiene datos personales
- CUANDO abre Descubrir
- ENTONCES la navegación puede mostrar resultados remotos reales de TMDB sin agregarlos automáticamente a su colección

#### Scenario: La persona ya tiene datos guardados

- DADO que el navegador contiene un historial o un catálogo importado previamente
- CUANDO se actualiza Prisma
- ENTONCES se conservan esos datos locales y no se vuelven a inyectar películas de muestra
