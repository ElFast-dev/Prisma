# Delta: identidad visual cinematográfica

## ADDED Requirements

### Requirement: Identidad cromática cinematográfica

Prisma DEBE utilizar una paleta oscura y coherente basada en tokens centrales: fondo casi negro, superficies azul-gris muy discretas, texto claro y acento violeta moderado; el cian DEBE reservarse para detalles secundarios o estados informativos. Las valoraciones, los estados positivos y los errores DEBEN conservar colores semánticos diferenciados y legibles.

#### Scenario: Navegación y componentes en una misma sesión

- DADO que la persona cambia entre Progreso, Descubrir, Colección y una ficha de película
- CUANDO se dibujan los controles, tarjetas y estados activos
- ENTONCES el mismo acento violeta identifica foco y selección sin convertir todos los elementos en superficies brillantes

### Requirement: Movimiento reducido respetado globalmente

La interfaz DEBE desactivar transiciones y reducir a un único ciclo las animaciones cuando el sistema solicita `prefers-reduced-motion: reduce`, incluidos los estilos de entrada de página, pósteres, controles y paneles. Esta preferencia DEBE aplicarse desde una regla compartida y no depender de que cada componente la implemente por separado.

#### Scenario: La persona prefiere movimiento reducido

- DADO que el sistema operativo o el navegador solicita movimiento reducido
- CUANDO se carga una página o se interactúa con una película
- ENTONCES las transiciones CSS duran cero y las animaciones no se repiten indefinidamente ni añaden desplazamiento animado
