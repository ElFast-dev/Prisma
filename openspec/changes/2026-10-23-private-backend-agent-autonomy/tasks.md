# Tareas de diseño, implementación y verificación

## Fase 1 — diseño (este expediente)

- [x] A1. Inspeccionar arquitectura, almacenamiento local, exportación, diagnósticos, CI y publicación de main.
- [x] A2. Definir la separación entre perfil personal, resultados agregados, código y runtime del agente.
- [x] A3. Revisar documentación oficial de seguridad, límites y costes de proveedores candidatos.
- [ ] A4. Completar comparación de proveedores con coste, región, disponibilidad, autenticación, jobs, backups y portabilidad.
- [ ] A5. Revisar requisitos SDD y validar el diseño antes de implementar.
- [ ] A6. Ejecutar validadores y gates de la rama; no dar por ejecutados tests por haber leído sus configuraciones.

## Fase 2 — backend y datos

- [ ] B1. Definir y probar el esquema versionado derivado del estado real de Prisma, con migraciones reversibles.
- [ ] B2. Implementar autenticación y aislamiento de propietario; probar lectura/escritura cruzada negativa.
- [ ] B3. Añadir secretos en el servidor y verificar que no se publican en bundles, repositorio ni logs.
- [ ] B4. Implementar sincronización incremental, cola local, reintentos, idempotencia, conflictos y borrados explícitos.
- [ ] B5. Añadir vista previa de migración, reconciliación, exportación y recuperación.
- [ ] B6. Verificar que los perfiles nuevos siguen vacíos y no se inserta catálogo predeterminado.

## Fase 3 — agente y trabajos

- [ ] C1. Implementar una API limitada de salud/diagnóstico y cola autenticada de trabajos.
- [ ] C2. Añadir worker privado para experimentos que necesitan datos reales; probar con datos sintéticos y aislarlo de CI.
- [ ] C3. Verificar que el resultado contiene solo métricas agregadas, cobertura, estado, errores codificados y versión evaluada.
- [ ] C4. Conectar runtime del agente con permisos mínimos, IDs de trabajo, límites y auditoría.
- [ ] C5. Automatizar ramas/PR, compuertas de calidad, Playwright y repetición segura de fallos.
- [ ] C6. Probar que los contenidos importados no pueden convertirse en instrucciones para el agente.
- [ ] C7. Definir compuertas para costes, permisos, borrados, migraciones irreversibles y cambios del modelo.

## Fase 4 — migración y salida controlada

- [ ] D1. Probar migración local→nube con perfiles sintéticos, reconexiones y conflictos.
- [ ] D2. Probar exportación, restauración y recuperación ante indisponibilidad.
- [ ] D3. Documentar consentimiento inicial y sincronización sin enviar el perfil antes de autorizarla.
- [ ] D4. Migrar perfil real solo en un entorno con acceso real y autorización comprobada; nunca usarlo en CI.
- [ ] D5. Ejecutar experimentos personales en el worker privado y revisar solo agregados.
- [ ] D6. Mantener el modelo aditivo activo; cualquier cambio de producción requiere evidencia independiente.
- [ ] D7. Actualizar especificaciones vigentes y archivar este expediente solo cuando los criterios estén verificados.

## Bloqueos y evidencia

Las fases B–D no están implementadas por este expediente. La aprobación documental no demuestra que exista backend, cuenta de proveedor, runtime de IA, sincronización o ejecución personal. Las casillas solo se marcan después de ejecutar la tarea y conservar evidencia no sensible.
