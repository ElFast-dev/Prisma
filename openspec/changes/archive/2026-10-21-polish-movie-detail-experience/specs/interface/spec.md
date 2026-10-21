## ADDED Requirements

### Requirement: Ficha de película con jerarquía y lectura cómoda

La ficha DEBE presentar los metadatos, la sinopsis y las acciones con contraste, separación y tamaño legibles en los temas oscuro y claro. Los controles principales de la ficha DEBEN conservar objetivos táctiles cómodos en móvil, y los cambios visuales NO DEBEN degradar el desplazamiento de sinopsis extensas ni la compacidad de las puntuaciones externas.

#### Scenario: Metadatos legibles en pantallas grandes y pequeñas

- DADO que una película tiene fecha de estreno, país, duración y estado
- CUANDO se abre la ficha en escritorio o móvil
- ENTONCES los metadatos se presentan como bloques diferenciados, con una cuadrícula adaptable de cuatro columnas en escritorio y dos en móvil

#### Scenario: Lectura de sinopsis

- DADO que una película tiene una sinopsis extensa
- CUANDO se abre la ficha en cualquiera de los temas disponibles
- ENTONCES la sinopsis mantiene un tamaño de letra legible, interlineado suficiente y la posibilidad de desplazarse hasta el final

#### Scenario: Acciones utilizables con el tacto

- DADO que la ficha se utiliza desde una pantalla táctil
- CUANDO se muestran las acciones de historial, pendientes, listas, ocultar o calificar
- ENTONCES sus controles principales tienen una altura mínima de 44 píxeles CSS y pueden distribuirse en varias filas sin desbordar el ancho de pantalla

#### Scenario: Fondo de ficha coherente con el tema

- DADO que la persona utiliza el modo oscuro o claro
- CUANDO el encabezado de la ficha muestra un fondo cinematográfico o un fondo de sustitución
- ENTONCES el degradado termina en una superficie del tema actual y no introduce un color de fondo azul fijo
