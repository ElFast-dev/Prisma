# Persistencia opcional del almacenamiento local

## ADDED Requirements

### Requirement: Solicitud explícita de persistencia del origen

Prisma DEBE informar del estado de persistencia del almacenamiento cuando el navegador permita consultarlo y DEBE ofrecer una solicitud explícita cuando sea compatible. Prisma NO DEBE solicitar persistencia automáticamente al arrancar. La interfaz DEBE indicar que esta protección no sustituye las copias de seguridad ni evita el borrado explícito de los datos del sitio.

#### Scenario: Inicio de Prisma

- DADO que Prisma se abre con datos personales almacenados localmente
- CUANDO se inicializa la aplicación
- ENTONCES puede comprobar el estado y la cuota estimada, pero no llama a `persist()`

#### Scenario: Solicitud iniciada por la persona usuaria

- DADO que el navegador admite `navigator.storage.persist()` y el estado aún no indica persistencia concedida
- CUANDO la persona pulsa el botón de protección en Ajustes
- ENTONCES Prisma solicita persistencia y muestra el resultado real devuelto por el navegador

#### Scenario: API no disponible, denegación o error

- DADO que el navegador no admite la solicitud, la deniega o lanza un error
- CUANDO la persona consulta o intenta proteger el almacenamiento
- ENTONCES Prisma continúa funcionando, comunica el estado sin inventar una concesión y mantiene visible la recomendación de exportar una copia de seguridad

#### Scenario: Persistencia ya concedida

- DADO que el navegador informa de que el almacenamiento ya es persistente
- CUANDO se muestran los ajustes
- ENTONCES Prisma informa de ese estado y no solicita de nuevo la concesión
