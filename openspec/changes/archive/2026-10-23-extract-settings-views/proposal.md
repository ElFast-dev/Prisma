# Propuesta: extraer las vistas de Ajustes y Datos

## Problema

Tras separar Descubrir, Colección, Laboratorio y racha, `js/ui/page-views.js` todavía contiene los renderizadores de Apariencia, conexión TMDB, protección del almacenamiento y la pantalla de Ajustes/Datos. El bloque es una unidad funcional y de presentación autocontenida de más de 8 KB que puede cambiar por separado de Progreso.

## Cambio

- Mover `renderAppearanceSettings`, `renderTMDBSettings`, `formatStorageBytes`, `renderStorageProtectionSettings` y `renderData` a `js/ui/settings-views.js` mediante `createSettingsViews(ctx)`.
- Mantener `renderTMDBSettings` y `renderData` con los mismos nombres públicos en `createPageViews(ctx)`.
- No mover ni cambiar las acciones que guardan, prueban o eliminan credenciales, ni el flujo de importación/exportación ni el servicio de protección.
- Actualizar pruebas de tema, protección de almacenamiento, arquitectura y caché PWA.
