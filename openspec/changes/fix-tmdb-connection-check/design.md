# Diseño: corregir la comprobación TMDB

## Decisión

Mantener la separación modular existente: `js/tmdb/settings-actions.js` obtiene dependencias desde `ctx`, y `app.js` las proporciona mediante getters. La acción usará `ctx.currentPage` y `ctx.loadTMDBPage` en lugar de nombres libres.

## Flujo esperado

1. Normalizar la credencial introducida o recuperar la guardada.
2. Solicitar `/configuration` con el cliente TMDB actual.
3. Persistir la credencial y comunicar éxito solo tras respuesta correcta.
4. Si la vista activa es el catálogo, cargar la búsqueda actual (cuando tenga al menos dos caracteres) o la lista popular.
5. Ante un rechazo HTTP o un fallo real, mostrar el mensaje de error existente.

## Verificación y riesgos

- Prueba unitaria del módulo con DOM, persistencia, notificaciones y cliente HTTP simulados.
- Casos: éxito desde otra vista, éxito desde Descubrir y credencial rechazada.
- Validación de sintaxis, arquitectura modular y conjunto de calidad/SDD.
- No hacer peticiones reales a TMDB en CI ni guardar tokens de prueba reales.
