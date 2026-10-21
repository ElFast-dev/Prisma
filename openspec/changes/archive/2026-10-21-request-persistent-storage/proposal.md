# Propuesta: proteger mejor el almacenamiento local

## Contexto

Prisma guarda el perfil personal en IndexedDB y utiliza localStorage como alternativa cuando IndexedDB no está disponible. Ya permite exportar y restaurar copias, pero no consulta el estado de persistencia que ofrece el navegador ni permite solicitarla explícitamente.

## Objetivo

Reducir el riesgo de pérdida automática de datos mostrando el estado del almacenamiento del sitio y ofreciendo una solicitud de persistencia iniciada por la persona usuaria, sin crear falsas garantías.

## Alcance

- Consultar, si están disponibles, `navigator.storage.persisted()` y `navigator.storage.estimate()`.
- Mostrar en Ajustes si el navegador informa persistencia concedida, pendiente/no concedida o API no disponible.
- Ofrecer `navigator.storage.persist()` solo tras una pulsación explícita.
- Mantener la exportación de copias de seguridad y explicar los límites.
- Probar el comportamiento sin depender del navegador real ni de datos personales.

## Fuera de alcance

No se cambia el formato del perfil, el almacenamiento usado, la sincronización (que sigue sin existir), el recomendador ni la integración TMDB. La solicitud no debe ejecutarse automáticamente al abrir Prisma y no se afirmará que impida borrar los datos del sitio o perder datos en navegación privada.
