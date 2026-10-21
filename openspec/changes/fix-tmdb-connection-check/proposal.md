# Corregir la verificación de conexión con TMDB

## Contexto y problema

La acción de prueba ejecuta correctamente la solicitud a `/configuration`, pero luego referencia `currentPage` y `loadTMDBPage` como identificadores libres dentro de `js/tmdb/settings-actions.js`. La acción de desconexión también utiliza `tmdbResults` y `tmdbClient` sin recibirlos del contexto. En módulos ES esos nombres no se resuelven a las variables locales de `app.js`; ambas operaciones pueden romperse después de haber recibido respuesta del usuario o de TMDB.

## Alcance

- Inyectar explícitamente la página actual, la consulta y la acción de recarga del catálogo al módulo de ajustes TMDB.
- Inyectar confirmación, acceso al estado de resultados y reinicio de caché para que desconectar TMDB no use variables globales inexistentes.
- Añadir pruebas aisladas de conexión correcta, refresco del catálogo y rechazo real de credenciales.
- Registrar la especificación y las pruebas SDD; conservar la credencial exclusivamente en el navegador.

## Criterios de aceptación

- Una respuesta correcta de TMDB presenta un único estado de éxito y no un error JavaScript.
- Si la prueba se ejecuta en Descubrir, recarga la consulta pertinente (búsqueda por texto o populares).
- Una respuesta de autenticación inválida sigue mostrando un error útil y no se registra como éxito.
- Confirmar la desconexión elimina la credencial local, limpia los resultados y reinicia la caché de géneros; cancelarla no cambia datos.
- Las pruebas usan respuestas sintéticas y nunca necesitan credenciales reales.

## Fuera de alcance

No se cambia el contrato de autenticación de TMDB, el almacenamiento local ni el resto de la experiencia de catálogo.
