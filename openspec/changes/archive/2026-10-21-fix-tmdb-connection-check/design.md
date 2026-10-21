# Diseño: corregir la comprobación TMDB

## Decisión

Mantener la separación modular existente: `js/tmdb/settings-actions.js` obtiene dependencias desde `ctx`, y `app.js` las proporciona mediante getters. La comprobación usa `ctx.currentPage`, `ctx.catalogQuery` y `ctx.loadTMDBPage`; la desconexión usa `ctx.confirm`, el estado `ctx.tmdbResults` y `ctx.resetTMDBGenres`.

## Flujo esperado

1. Normalizar la credencial introducida o recuperar la guardada.
2. Solicitar `/configuration` con el cliente TMDB actual.
3. Persistir la credencial y comunicar éxito solo tras respuesta correcta.
4. Si la vista activa es el catálogo, cargar la búsqueda actual (cuando tenga al menos dos caracteres) o la lista popular.
5. Ante un rechazo HTTP o un fallo real, mostrar el mensaje de error existente.
6. Al desconectar, pedir confirmación antes de borrar, persistir la credencial nula, limpiar resultados, reiniciar géneros y actualizar la interfaz. Si se cancela, no cambiar nada.

## Verificación y riesgos

- Prueba unitaria del módulo con DOM, persistencia, confirmación, notificaciones y cliente HTTP simulados.
- Casos: éxito desde otra vista, éxito desde Descubrir y credencial rechazada.
- Validación de sintaxis, arquitectura modular y conjunto de calidad/SDD.
- No hacer peticiones reales a TMDB en CI ni guardar tokens de prueba reales.

## Resultado verificado

La prueba unitaria cubre la credencial válida, la recarga de búsqueda en Descubrir, la lista popular, el rechazo de autenticación y la eliminación/cancelación de credencial. La prueba Playwright cubre la interacción de Ajustes usando respuestas simuladas y comprueba que la credencial ficticia se elimina antes de continuar con los flujos de la aplicación.

Evidencias: [calidad/SDD](https://github.com/ElFast-dev/Prisma/actions/runs/39521185834), [validación del proyecto](https://github.com/ElFast-dev/Prisma/actions/runs/39521185884) y [Playwright](https://github.com/ElFast-dev/Prisma/actions/runs/39521185895).
