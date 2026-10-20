# Invalidación fiable de los recursos de la PWA

## Problema

El cambio de JavaScript recién desplegado conserva el mismo parámetro de versión del recurso y el mismo nombre de caché del shell. Un service worker ya instalado puede seguir sirviendo el JavaScript almacenado anteriormente aunque GitHub Pages publique los nuevos bytes.

## Objetivo

Asegurar que una actualización del código cliente cambie la URL versionada del recurso y la versión del shell del service worker, y hacer que CI detecte si index.html, sw.js y la comprobación visual quedan desincronizados.

## Alcance

- Cambiar la URL versionada de app.js a una versión nueva.
- Incrementar el nombre de caché del shell de Prisma.
- Mantener el URL de app.js sincronizado entre index.html y APP_ASSETS del service worker.
- Actualizar la expectativa de versión en la prueba visual y añadir una prueba estática de coherencia.
- Formalizar el requisito en SDD antes de implementar.

## Fuera de alcance

- Cambiar el comportamiento del recomendador, las valoraciones o el catálogo.
- Invalidar la caché del CSS, que no cambia en este cambio.
- Añadir una nueva dependencia o alterar la estrategia offline.

## Criterios de aceptación

1. Los navegadores reciben una URL distinta para el JavaScript actualizado.
2. El nuevo service worker instala una caché de shell con un nombre diferente y elimina el shell anterior al activarse.
3. index.html, sw.js y la comprobación de versión de la UI señalan exactamente el mismo recurso.
4. La prueba de coherencia se ejecuta en CI y el expediente SDD queda archivado tras superar los checks.
