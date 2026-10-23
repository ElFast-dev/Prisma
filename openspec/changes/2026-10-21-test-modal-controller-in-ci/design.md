# Diseño: regresión del controlador de modal en CI

El flujo canónico `.github/workflows/quality.yml` debe ejecutar `node scripts/test-modal-controller.mjs` inmediatamente después de las pruebas de los manejadores de eventos. El test verifica dos invariantes distintos: al cerrar una calificación abierta desde una ficha se restaura esa ficha incluso si el estado de detalle se perdió temporalmente; al cerrar una calificación iniciada desde una lista, no se crea una ficha ficticia.

`scripts/test-release-gating.mjs` debe fallar si el paso desaparece del workflow canónico. Así la protección de la propia compuerta incluye la prueba del caso límite. Las pruebas de Playwright siguen comprobando los caminos interactivos reales, sin sustituir al test unitario del controlador.

No se requieren cambios de caché PWA o código de producción. El cierre SDD se archiva una vez que validación, calidad y Playwright pasan sobre el commit integrado.
