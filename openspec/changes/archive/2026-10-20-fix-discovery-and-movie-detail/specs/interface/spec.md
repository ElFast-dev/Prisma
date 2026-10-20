### Requirement: Ficha desplazable con sinopsis completa

La ficha de película DEBE permitir desplazarse dentro del modal hasta el final de la sinopsis y las secciones posteriores, en móvil y escritorio. El contenido DEBE permanecer accesible aunque la sinopsis sea larga.

#### Scenario: Sinopsis extensa

- DADO que una película tiene una sinopsis que ocupa más que el espacio visible
- CUANDO la persona abre la ficha y se desplaza hacia abajo
- ENTONCES puede leer la sinopsis completa y alcanzar las secciones inferiores

### Requirement: Fecha del historial sin hora

Prisma DEBE mostrar la fecha en la que una película se añadió al historial como MM/DD/YYYY, sin incluir hora ni minutos.

#### Scenario: Fecha de vista registrada

- DADO que una película tiene una fecha de historial válida
- CUANDO se muestra su estado dentro de la ficha
- ENTONCES la fecha usa el formato MM/DD/YYYY y no contiene una hora

### Requirement: Indicadores de puntuación compactos

La sección Puntuaciones DEBE usar tarjetas de tamaño compacto, cuya altura esté ajustada al contenido en vez de usar cuadrados altos vacíos, y conservar un diseño legible en móvil y escritorio.

#### Scenario: Pantalla de escritorio o móvil

- DADO que se abre la ficha de una película
- CUANDO se muestran los enlaces e indicadores de puntuación
- ENTONCES las tarjetas son compactas y no ocupan altura excesiva respecto a sus textos
