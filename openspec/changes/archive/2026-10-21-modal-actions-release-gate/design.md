# Diseño: acciones explícitas y cadena de publicación

## Manejadores de modal
`registerAppEvents(ctx)` es un módulo ES aislado y no hereda las variables locales de `app.js`. Todo acceso al borrador debe realizarse con `ctx.modalDraft`. Las acciones de estado derivan el título de la ficha actual o del borrador, con el mismo contexto inyectado. Un manejador sin estado suficiente debe salir de forma segura, no lanzar un error que se esconda como toast.

La prueba unitaria registrará los listeners de un documento sintético y ejecutará el callback real con botones sintéticos. Cubrirá emoción seleccionada/deseleccionada, gestionar pendientes, marcar como vista y ocultar película cuando `movieDetail` es nulo y solo existe `modalDraft`. La prueba no requiere datos personales ni petición de red.

## Compuerta de publicación
- `quality.yml` es el único workflow canónico de validación para pushes a `main` y PRs; ejecuta SDD, sintaxis y toda la batería de pruebas. También valida el JSON del manifest.
- `ui-screenshots.yml` conserva pruebas sobre PRs, y para `main` solo se ejecuta tras el éxito de `SDD and static quality`. En esa ruta hace checkout del `head_sha` validado y sirve localmente ese árbol antes de abrir Playwright.
- `deploy-pages.yml` solo se dispara después del éxito de `Prisma UI screenshots`, únicamente si esa ejecución procede de la cadena `workflow_run`, y despliega el `head_sha` que Playwright ha probado. No escucha directamente `push` ni `workflow_dispatch`.
- Se elimina `.github/workflows/validate.yml`, que solo repetía comprobaciones básicas. No se elimina ni abre un bypass en la validación canónica.
- Una prueba estática de compuerta verifica el orden, las condiciones de éxito, el SHA checkout, la ausencia de un trigger de push directo en deploy y la inexistencia del workflow duplicado.

## Riesgos y compatibilidad
La publicación en `main` espera a dos workflows encadenados antes de desplegar; eso es intencional. Un fallo de SDD, cualquier prueba de la batería o Playwright bloquea el deploy. Las ejecuciones de PR no publican y una ejecución manual de Playwright no debe encadenarse a despliegue. El nombre de cada workflow usado en `workflow_run` debe coincidir exactamente con el campo `name`.

## Caché PWA
Al modificar `app.js`, el módulo de eventos, pruebas de interfaz y service worker, se incrementan sus URLs versionadas y el nombre de caché del shell. Los tests de versionado comprobarán que `index.html`, `app.js`, `sw.js` y Playwright coinciden.
