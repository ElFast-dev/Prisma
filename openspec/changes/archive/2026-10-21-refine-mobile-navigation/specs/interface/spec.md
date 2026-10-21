## MODIFIED Requirements

### Requirement: Interfaz en español y adaptada a móvil

La interfaz DEBE estar en español y mantener una composición funcional en pantallas móviles, especialmente Android, sin impedir el uso desde escritorio. Los controles frecuentes DEBEN tener objetivos táctiles cómodos y la navegación NO DEBE depender de hover ni de animaciones de escala.

#### Scenario: Controles principales en pantalla móvil

- DADO que el viewport tiene un ancho igual o inferior a 760 píxeles CSS
- CUANDO se presenta la navegación inferior y las acciones de icono de cabecera
- ENTONCES los destinos inferiores tienen al menos 48 píxeles CSS de altura y las acciones de icono tienen al menos 44 × 44 píxeles CSS

#### Scenario: Interacción táctil breve

- DADO que la persona utiliza la interfaz con un puntero táctil
- CUANDO pulsa un destino de navegación
- ENTONCES el estado del control cambia sin depender de hover ni aplicar una transformación de escala

### Requirement: Navegación entendible

Prisma DEBE mantener accesibles las vistas principales de progreso, descubrimiento y colección, además de las vistas de laboratorio y ajustes/datos. Al renderizar una vista, DEBE comunicar el destino principal activo mediante `aria-current="page"`.

#### Scenario: Vista actual comunicada

- DADO que se muestra Progreso, Descubrir o Colección
- CUANDO termina el renderizado de la página
- ENTONCES solo el destino principal correspondiente expone `aria-current="page"`
