# Propuesta: endurecer acciones de modal y compuerta de publicación

## Problemas
- El módulo aislado `js/app/event-handlers.js` lee `modalDraft` sin declararlo ni acceder al estado mediante `ctx`. Al pulsar una emoción, el manejador captura el `ReferenceError` y no registra el cambio.
- Las acciones `manage-pending`, `manage-history`/`mark-watched` y `toggle-hidden`/`manage-hidden` tienen el mismo acceso fuera del contexto cuando la ficha de película no está presente.
- `deploy-pages.yml` despliega con cualquier push a `main`, aunque otra workflow de pruebas falle. `validate.yml` duplica una parte del chequeo de sintaxis que ya está en `quality.yml`.
- Playwright se ejecuta después del despliegue para comprobar el sitio publicado; eso permite detectar tarde un fallo funcional que ya ha sido publicado.

## Cambio
- Usar exclusivamente `ctx.modalDraft` para acceder al borrador compartido en todos los manejadores.
- Probar las interacciones reales de emociones y acciones de estado, además del caso de modal sin ficha abierta.
- Convertir el camino de publicación en una cadena secuencial: `SDD and static quality` (incluye la batería de pruebas) → Playwright de la versión exacta validada → despliegue de ese mismo SHA.
- Retirar el workflow duplicado `validate.yml` e incorporar su validación de manifest al workflow canónico.
- Mantener pruebas de PR y permitir una comprobación manual de calidad, pero no permitir que una ejecución manual aislada del workflow de navegador publique código.

## Fuera de alcance
- No cambiar el modelo de recomendación ni activar Ridge.
- No migrar ni borrar datos personales.
- No crear una vía manual que evite las pruebas para publicar en Pages.
