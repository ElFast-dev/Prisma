# Interfaz y navegación

## Requirements

### Requirement: Interfaz en español y adaptada a móvil

La interfaz DEBE estar en español y mantener una composición funcional en pantallas móviles, especialmente Android, sin impedir el uso desde escritorio.

#### Scenario: Uso desde una pantalla estrecha

- DADO que el viewport tiene ancho móvil
- CUANDO se navega por las vistas principales
- ENTONCES la navegación y los controles siguen disponibles sin depender de hover

### Requirement: Navegación entendible

Prisma DEBE mantener accesibles las vistas principales de progreso, descubrimiento y colección, además de las vistas de laboratorio y ajustes/datos.

#### Scenario: Cambio de vista

- DADO que el usuario selecciona un destino de navegación
- CUANDO se activa el control correspondiente
- ENTONCES se renderiza la vista solicitada y el estado de navegación se actualiza

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

### Requirement: Estados y mensajes perceptibles

La interfaz DEBE comunicar carga, errores y confirmaciones de acciones importantes mediante elementos visuales perceptibles, con semántica accesible cuando corresponde.

#### Scenario: Importación fallida

- DADO que un archivo no cumple el formato reconocido
- CUANDO falla la importación
- ENTONCES el usuario recibe un mensaje que describe el problema en lugar de una falsa confirmación
