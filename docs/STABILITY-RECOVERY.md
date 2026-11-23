# Estabilidad de PWA, carga diferida y almacenamiento local

## Actualizaciones de la PWA

Prisma utiliza el modo de actualización solicitada de `vite-plugin-pwa`. Cuando se instala una versión nueva, la aplicación muestra un aviso; no recarga automáticamente todas las pestañas.

- La persona usuaria decide cuándo aplicar la actualización.
- El aviso indica que se deben guardar los cambios pendientes.
- La acción de actualizar se bloquea mientras haya un diálogo modal abierto, porque algunos formularios conservan cambios sin guardar en memoria.
- «Más tarde» mantiene la versión activa y aplaza la recarga.
- La activación usa la función de actualización proporcionada por `virtual:pwa-register`.
- `onNeedReload` sustituye la recarga automática predeterminada de vite-plugin-pwa en cada pestaña abierta.
- Cada pestaña muestra «Recargar esta pestaña» cuando el nuevo Service Worker toma el control. La recarga ocurre solo tras una acción explícita en esa pestaña.
- Una pestaña con formulario o diálogo abierto puede esperar sin que otra pestaña fuerce su recarga.
- La recarga automática ante un módulo obsoleto también respeta los mismos bloqueos.

La actualización no sustituye las copias de seguridad ni sincroniza los datos entre dispositivos.

## Recuperación de pantallas cargadas bajo demanda

Vite emite `vite:preloadError` cuando falla una importación dinámica. Prisma:

1. Permite una recarga de recuperación si el almacenamiento de sesión está disponible y no hubo otro intento durante los últimos 60 segundos.
2. No cancela el error si ya se intentó recuperar recientemente o si no se puede guardar el marcador.
3. Deja que `AppErrorBoundary` muestre el estado de error cuando una recarga adicional no sería segura.
4. Elimina el marcador después de que una pantalla diferida se carga correctamente.
5. Si hay un diálogo, formulario sin guardar u operación local activa, no fuerza la recarga; deja que la sección afectada muestre su estado de error recuperable.

Esto evita un ciclo de recargas cuando el recurso sigue sin estar disponible.

## Inicialización de IndexedDB

React no monta las pantallas de Prisma hasta que Dexie confirma que la base local está abierta.

- Los intentos concurrentes comparten una sola promesa.
- Si la apertura falla, se muestra una pantalla con una acción para reintentar.
- Si una actualización de esquema está bloqueada por otra pestaña, se explica que hay que cerrar las pestañas antiguas.
- No se borra, reconstruye, restaura ni migra la base como respuesta automática a un error de apertura.

La apertura fallida no es una señal de que los datos estén corruptos. No se debe recomendar borrar los datos del navegador como primer recurso.

## Validación antes de integrar

Controles automatizados:

- TypeScript, pruebas unitarias, build y smoke test.
- Playwright en Chromium, Firefox y WebKit.
- Prueba PWA con Service Worker y navegación offline.

Comprobación manual en Android:

1. Abrir un formulario de visionado y dejar cambios sin guardar.
2. Con una actualización nueva esperando, pulsar «Actualizar Prisma».
3. Confirmar que la aplicación no recarga mientras el diálogo esté abierto y que explica cómo continuar.
4. Cerrar el formulario, aplicar la actualización y confirmar que Prisma vuelve a abrir.
5. Comprobar Biblioteca e Historial sin conexión.
6. Abrir dos pestañas de Prisma y verificar que una actualización de esquema no deja la otra en un estado silenciosamente inutilizable.
7. No borrar almacenamiento ni restaurar copias para probar estos escenarios.

## Datos personales

Estas funciones no modifican las tablas de películas, visionados, Biblioteca, colecciones, perfil ni preferencias. Las pruebas utilizan almacenamiento aislado y datos sintéticos.
