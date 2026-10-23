# Diseño: acciones de protección del almacenamiento

## Límites de responsabilidad

- `js/core/storage-protection.js` conserva la lógica de bajo nivel para consultar `persisted()`, estimar cuota y solicitar persistencia al `StorageManager`.
- `js/app/storage-protection-actions.js` coordina el estado ocupado, el snapshot resultante, los avisos y el repintado.
- `app.js` mantiene la propiedad del estado compartido y conecta el módulo mediante un contexto explícito; no conserva los cuerpos de las acciones.

## Dependencias

El módulo recibe `storageProtection`, propiedades de lectura/escritura para `storageProtectionSnapshot` y `storageProtectionBusy`, además de `currentPage`, `renderApp` y `toast`. No consulta el DOM ni importa módulos de interfaz.

## Secuencia y manejo de errores

- La inspección actualiza el snapshot y repinta únicamente si la página de Ajustes (`data`) está activa; no solicita persistencia.
- La solicitud comprueba la guarda de concurrencia y activa el indicador ocupado.
- `storageProtection.request(snapshot)` se invoca sincrónicamente antes del primer `await` y del repintado inicial.
- La concesión, denegación, falta de API y errores conservan los avisos existentes.
- Si falla la solicitud, se intenta consultar de nuevo. Si esa consulta también falla, se conserva el último snapshot conocido.
- `finally` libera siempre el indicador ocupado y solicita el repintado final. Una acción posterior vuelve a estar disponible.

## Compatibilidad y verificación

Añadir el módulo a las comprobaciones de sintaxis, arquitectura e inventario precargado de la PWA. Actualizar la URL versionada de `app.js` en `index.html`, `sw.js` y el workflow de UI, e incrementar el nombre de caché. No se introduce ninguna dependencia de ejecución ni llamada real a TMDB.
