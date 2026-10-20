# Delta: sistema visual de interfaz

## MODIFIED Requirements

### Requirement: Estados interactivos consistentes

Prisma DEBE usar tokens de diseño compartidos para que navegación, botones primarios, elementos seleccionados, indicadores de foco y estados de interacción comuniquen una identidad visual coherente. El acento de marca DEBE ser violeta suave sobre una base oscura; los colores semánticos de puntuación, confirmación y error DEBEN conservar su significado. Los estados utilizables NO DEBEN depender de hover.

#### Scenario: Se usa la navegación y un control primario

- DADO que el usuario visita cualquier página principal
- CUANDO la navegación tiene un destino activo y aparece una acción principal
- ENTONCES ambos usan los tokens de acento del sistema visual, mantienen contraste perceptible y no introducen una decoración más prominente que el contenido cinematográfico.

#### Scenario: Se seleccionan filtros o se enfoca un campo

- DADO que el usuario selecciona un filtro o enfoca un campo con ratón o teclado
- CUANDO el estado del control cambia
- ENTONCES el estado usa el mismo acento violeta y el foco es claramente visible sin desplazar la geometría del control.

### Requirement: Preferencia de movimiento reducido

Prisma DEBE respetar `prefers-reduced-motion: reduce` en toda la capa visual, limitando la duración de transiciones y animaciones y evitando scroll suave cuando el usuario solicita movimiento reducido.

#### Scenario: El dispositivo solicita movimiento reducido

- DADO que el sistema indica `prefers-reduced-motion: reduce`
- CUANDO se muestran páginas, pósteres, medidores o controles interactivos
- ENTONCES sus transiciones y animaciones se omiten o reducen a una duración mínima y no se fuerza desplazamiento suave del documento.
