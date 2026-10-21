# Diseño: actualización segura de la PWA

## Decisión

Extraer el ciclo de actualización a un módulo independiente coordinado por lifecycle. Registrar el service worker con updateViaCache igual a none y solicitar registration.update() tras registrarlo. Los errores de registro o red no deben bloquear la aplicación.

Si una página ya controlada detecta un nuevo controlador, se añade a la zona de avisos un mensaje persistente con botón semántico «Recargar». No se recarga automáticamente porque puede haber campos sin guardar. En una primera instalación sin controlador previo, no se muestra el aviso.

## Datos y compatibilidad

- El nuevo módulo no recibe acceso a IndexedDB/localStorage ni al perfil.
- No cambia formatos de backup ni claves locales.
- Actualizar no borra ni muta datos personales.
- Se versionan entrada, módulo nuevo y caché del shell, y se actualiza la prueba Playwright.
- Una pestaña que ya ejecuta código antiguo necesita una recarga inicial para obtener esta lógica nueva.

## Verificación

- Prueba del registro, comprobación inmediata, cambio de controlador, aviso, acción recargar y primera instalación.
- Pruebas de arquitectura modular y coherencia de URLs versionadas.
- Validación SDD y prueba de la versión publicada con inicio vacío.
