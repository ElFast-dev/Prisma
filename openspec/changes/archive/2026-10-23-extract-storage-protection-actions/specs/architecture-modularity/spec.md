# Delta: acciones de protección del almacenamiento

## ADDED Requirements

### Requirement: Acciones de protección del almacenamiento separadas de la entrada

La coordinación de inspección y solicitud explícita de persistencia DEBE residir en `js/app/storage-protection-actions.js`, con dependencias inyectadas y sin acoplamiento directo al DOM. `app.js` DEBE limitarse a componer el estado compartido y delegar las operaciones mediante la API del módulo. La extracción DEBE preservar el comportamiento observable y NO DEBE modificar datos personales ni el recomendador.

#### Scenario: Inspección durante el inicio

- DADO que Prisma inicializa la interfaz
- CUANDO consulta el estado y la cuota del almacenamiento
- ENTONCES realiza una inspección de solo lectura y nunca invoca automáticamente la solicitud de persistencia.

#### Scenario: Solicitud explícita de persistencia

- DADO que una persona activa el control de protección en Ajustes
- CUANDO comienza la solicitud
- ENTONCES el servicio se invoca sincrónicamente antes del primer `await` o repintado y se refleja el resultado real sin inventar una concesión.

#### Scenario: Error o solicitud simultánea

- DADO que una solicitud está en curso o se produce un error durante la solicitud o su inspección de recuperación
- CUANDO se intenta una segunda acción o finaliza la primera
- ENTONCES no se inicia una operación concurrente y el estado ocupado vuelve a liberarse para permitir acciones futuras.

#### Scenario: Actualización de interfaz

- DADO que cambia el snapshot de protección
- CUANDO se ejecuta una acción desde Ajustes
- ENTONCES solo se solicita repintar cuando la página de Ajustes está activa, sin acceder al DOM desde el módulo.
