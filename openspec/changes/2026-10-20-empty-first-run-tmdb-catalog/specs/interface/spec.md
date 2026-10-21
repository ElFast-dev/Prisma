# Estado vacío del descubrimiento

## ADDED Requirements

### Requirement: Descubrir comunica un inicio realmente vacío

Cuando no hay películas personales ni catálogo local, Prisma DEBE distinguir la colección personal del contenido remoto de TMDB y DEBE explicar cómo descubrir títulos sin poblar el perfil por defecto.

#### Scenario: Descubrir sin películas locales

- DADO que el catálogo local combinado contiene cero películas
- CUANDO se abre Descubrir
- ENTONCES se indica que no hay películas locales y no aparecen pósteres de muestra

#### Scenario: TMDB no está conectado

- DADO que no existe una credencial TMDB configurada
- CUANDO se presenta el espacio de descubrimiento vacío
- ENTONCES se indica que hay que conectar TMDB desde Ajustes/Datos para explorar películas
