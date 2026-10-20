# Delta de especificación: microinteracciones de colección

## MODIFIED Requirements

### Requirement: Estados interactivos consistentes

Prisma DEBE comunicar de manera consistente los estados hover, activo y foco de los controles de colección, sin cambios de geometría inesperados ni decoración que distraiga del contenido cinematográfico.

#### Scenario: Hover sobre una fila en escritorio

- DADO una fila de película en la colección y un dispositivo con puntero preciso
- CUANDO se pasa el puntero sobre su área principal
- ENTONCES la fila muestra un fondo azul sutil, sin desplazarse verticalmente el botón principal

#### Scenario: Retirar el puntero

- DADO una fila de colección que muestra el fondo hover
- CUANDO el puntero sale de la fila
- ENTONCES vuelve suavemente al estado visual base

#### Scenario: Uso táctil

- DADO una pantalla móvil donde no hay hover fiable
- CUANDO se pulsa una fila de colección
- ENTONCES el control mantiene su acción de apertura y no necesita depender del estado hover

#### Scenario: Navegación por teclado

- DADO que el usuario alcanza la acción principal mediante teclado
- CUANDO el control recibe foco
- ENTONCES un indicador de foco visible distingue el control del fondo

#### Scenario: Preferencia de movimiento reducido

- DADO que el sistema indica `prefers-reduced-motion: reduce`
- CUANDO se usa la interfaz
- ENTONCES las transiciones de microinteracción se eliminan o reducen y no se agrega animación continua
