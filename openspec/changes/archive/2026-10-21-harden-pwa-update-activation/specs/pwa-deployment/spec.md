# PWA y publicación

## MODIFIED Requirements

### Requirement: Actualización no disruptiva de clientes abiertos

Prisma DEBE comprobar actualizaciones del service worker sin depender de la caché HTTP del script del worker. Si cambia el controlador de una página ya abierta, DEBE informar a la persona y ofrecer una acción explícita para recargar. NO DEBE borrar ni modificar datos personales durante una actualización ni recargar automáticamente una página que pueda tener cambios sin guardar.

#### Scenario: Actualización mientras Prisma está abierto

- DADO que Prisma está abierto y un nuevo service worker toma el control
- CUANDO cambia el controlador de la página
- ENTONCES Prisma muestra un aviso «Recargar», sin recargar ni borrar datos por sí solo

#### Scenario: Primera instalación

- DADO que Prisma se abre sin controlador previo
- CUANDO el primer service worker toma el control
- ENTONCES Prisma no muestra un aviso de actualización innecesario
