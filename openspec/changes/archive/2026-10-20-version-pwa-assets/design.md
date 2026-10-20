# Diseño: versionado coordinado de recursos PWA

## Decisiones

- Versionar el JavaScript como `app.js?v=ui-20261020-19`.
- Incrementar la caché de shell de `prisma-shell-v22` a `prisma-shell-v23`.
- Hacer que el inventario de APP_ASSETS del service worker use exactamente el URL de JavaScript de index.html.
- Actualizar la aserción de la batería Playwright para aceptar solo la versión actual del JS.
- Añadir una prueba Node independiente que analiza index.html, sw.js y la workflow UI, compara el query string y verifica que el nombre del shell sea versionado.

## Riesgos y compatibilidad

- El CSS y el manifiesto no cambian en esta publicación; sus versiones permanecen estables.
- El nuevo worker borra solo las cachés antiguas que usan el prefijo `prisma-shell-`, siguiendo la lógica existente.
- No se modifican datos almacenados ni hay cambios de red fuera de las peticiones habituales de recursos.
- La prueba es estática; el workflow de Playwright continuará comprobando el sitio real después del despliegue.

## Verificación

La prueba estática de coherencia se ejecuta en CI. Los checks SDD, sintaxis, validación del proyecto y UI publicada deben pasar antes del cierre.
