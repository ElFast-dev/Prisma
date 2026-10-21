# Delta: apariencia de interfaz

## ADDED Requirements

### Requirement: Preferencia de tema personal

Prisma DEBE ofrecer un tema oscuro con fondo negro como predeterminado y un modo claro opcional. El color secundario de marca DEBE ser un azul discreto; los colores semánticos de puntuación, éxito y error DEBEN seguir siendo distinguibles. La elección DEBE poder cambiarse sin recargar y persistirse localmente, fuera del perfil cinematográfico. Si no existe una preferencia válida, Prisma DEBE utilizar el modo oscuro.

#### Scenario: Primera apertura

- DADO que el navegador no tiene guardada una preferencia de tema válida
- CUANDO Prisma inicia
- ENTONCES se aplica el tema oscuro con fondo negro y azul secundario apagado.

#### Scenario: Elegir el modo claro

- DADO que el usuario abre Ajustes
- CUANDO selecciona Claro
- ENTONCES la interfaz aplica fondo claro, superficies blancas y texto oscuro sin recargar y el selector indica la opción activa de forma accesible.

#### Scenario: Elegir el modo oscuro

- DADO que el usuario tiene activo el tema claro
- CUANDO selecciona Oscuro
- ENTONCES Prisma restaura el fondo negro, las superficies neutras y el acento azul discreto.

#### Scenario: Restaurar una preferencia

- DADO que el usuario ha elegido Claro u Oscuro y recarga la aplicación
- CUANDO Prisma vuelve a iniciar
- ENTONCES restaura la última elección almacenada localmente.

#### Scenario: Preferencia inválida o almacenamiento bloqueado

- DADO que el valor guardado no es `light` ni `dark`, o el navegador bloquea localStorage
- CUANDO Prisma inicia
- ENTONCES continúa con tema oscuro sin impedir el uso de la aplicación.
