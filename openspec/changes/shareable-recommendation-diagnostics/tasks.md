# Tareas: informe diagnóstico compartible del recomendador

- [x] R1. Investigar arquitectura por etapas, evaluación offline y riesgos de compartir datos personales.
- [x] R2. Inspeccionar el Laboratorio, sus evaluadores, las reglas de privacidad local y versionado PWA.
- [x] R3. Crear especificación, diseño, criterios de aceptación y expedientes SDD antes de modificar el código de ejecución.
- [ ] R4. Implementar un constructor puro del informe usando únicamente métricas agregadas y estadísticas de señales.
- [ ] R5. Añadir a Laboratorio una acción explícita para copiar y un fallback de selección manual.
- [ ] R6. Añadir pruebas sintéticas que comprueben utilidad del informe y ausencia de registros/títulos/IDs/datos personales.
- [ ] R7. Actualizar requisitos permanentes, documentación, modularidad, validador SDD y CI.
- [ ] R8. Actualizar app.js, inventario de service worker, caché y expectativas de pruebas visuales.
- [ ] R9. Pasar calidad, validación SDD, test unitario, Playwright y despliegue.
- [ ] R10. Archivar el expediente SDD solo tras la verificación posterior al despliegue.

## Criterios de aceptación

El informe solo se genera tras una pulsación. Es JSON versionado, muestra datos computados sobre el perfil local actual y no contiene ninguna fila individual ni identificador de película. La UI explica qué incluye/excluye; el portapapeles denegado no se reporta como éxito. Las pruebas no necesitan datos personales reales, TMDB ni red.
