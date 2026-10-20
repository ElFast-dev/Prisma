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

### Requirement: Estados y mensajes perceptibles

La interfaz DEBE comunicar carga, errores y confirmaciones de acciones importantes mediante elementos visuales perceptibles, con semántica accesible cuando corresponde.

#### Scenario: Importación fallida

- DADO que un archivo no cumple el formato reconocido
- CUANDO falla la importación
- ENTONCES el usuario recibe un mensaje que describe el problema en lugar de una falsa confirmación
