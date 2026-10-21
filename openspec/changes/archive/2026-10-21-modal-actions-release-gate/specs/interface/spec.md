## ADDED Requirements

### Requirement: Acciones fiables en la ficha y la calificación

Prisma DEBE ejecutar las acciones de emoción, pendientes, historial y ocultación sobre el borrador o la película que corresponde al modal abierto. El manejador NO DEBE depender de variables globales o locales que no se hayan inyectado.

#### Scenario: Seleccionar una emoción

- DADO que el modal de calificación tiene un borrador válido y no hay una ficha independiente abierta
- CUANDO el usuario pulsa una emoción
- ENTONCES el estado seleccionado cambia y la interfaz lo refleja sin mostrar un error

#### Scenario: Cambiar una emoción

- DADO que una emoción está seleccionada en el borrador
- CUANDO el usuario vuelve a pulsarla
- ENTONCES la emoción se elimina del borrador y se actualiza la interfaz

#### Scenario: Gestionar una película desde un borrador sin ficha

- DADO que existe un borrador de película y no hay ficha de detalle
- CUANDO se solicita añadir a pendientes, marcar como vista u ocultar
- ENTONCES la acción utiliza el título e identidad del borrador, modifica la colección correcta y no lanza una excepción

#### Scenario: Guardar emociones

- DADO que una emoción está seleccionada en el modal de calificación
- CUANDO se guarda una nota válida
- ENTONCES la valoración personal conserva esa emoción
