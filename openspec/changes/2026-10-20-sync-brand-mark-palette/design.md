# Diseño: sincronización del isotipo y la PWA

## Decisión

Conservar el SVG actual de 128 × 128 y su geometría; cambiar solo el degradado y los colores de fondo. La paleta será lavanda claro `#f0ecff`, violeta `#a78bfa` y cian secundario `#7dd3fc`, sobre `#111722`.

## Referencias versionadas

- Favicon e imagen del encabezado: `./assets/prisma.svg?v=brand-20261020-1`.
- Icono del manifest: la misma URL SVG versionada.
- URL del manifest cargado por HTML y almacenado en `APP_ASSETS`: `manifest.webmanifest?v=ui-20261020-13`.
- Caché del shell PWA: incrementar `prisma-shell-v47` a `prisma-shell-v48`.
- Las hojas CSS y `app.js` no cambian y conservan sus versiones.

## Pruebas

Un test de Node lee HTML, manifest, service worker y SVG. Comprueba que las URL son idénticas, el manifest es JSON válido, el shell aumenta y el logo deja de incluir el azul anterior. Playwright valida que favicon y cabecera publican la nueva referencia. No se usan datos personales ni llamadas de red.
