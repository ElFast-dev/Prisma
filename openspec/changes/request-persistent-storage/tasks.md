# Tareas: solicitar persistencia del almacenamiento local

- [x] R1. Confirmar el almacenamiento actual y verificar la API de persistencia en fuentes web actuales.
- [x] R2. Definir el alcance y las limitaciones; no solicitar persistencia al abrir la aplicación.
- [x] R3. Crear el expediente SDD y añadir la especificación activa antes de modificar el código de ejecución.
- [ ] R4. Implementar el módulo puro de inspección/solicitud y sus pruebas aisladas.
- [ ] R5. Integrar el estado y la acción explícita en Ajustes, con mensajes que no prometan protección absoluta.
- [ ] R6. Actualizar arquitectura, producto, modularidad, validación SDD y el requisito permanente de almacenamiento.
- [ ] R7. Sincronizar las URL versionadas, la caché PWA y las pruebas que las verifican.
- [ ] R8. Ejecutar pruebas automatizadas, validación SDD, CI y pruebas visuales del PR.
- [ ] R9. Fusionar, desplegar y comprobar las pruebas de UI posteriores al despliegue.
- [ ] R10. Archivar el expediente solo cuando toda la evidencia pertinente sea correcta.

## Criterios de aceptación

La comprobación de estado nunca llama a `persist()`; solo el control explícito puede hacerlo. Un API ausente, una denegación o un error no rompe Ajustes ni el inicio. La UI explica que la copia de seguridad sigue siendo necesaria. La versión de `app.js`, el inventario del service worker, las aserciones automatizadas y el nombre de caché permanecen coordinados.
