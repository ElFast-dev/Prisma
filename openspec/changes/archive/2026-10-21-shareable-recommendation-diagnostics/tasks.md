# Tareas: informe diagnóstico compartible del recomendador

- [x] R1. Investigar arquitectura por etapas, evaluación offline y riesgos de compartir datos personales.
- [x] R2. Inspeccionar el Laboratorio, sus evaluadores, las reglas de privacidad local y versionado PWA.
- [x] R3. Crear especificación, diseño, criterios de aceptación y expedientes SDD antes de modificar el código de ejecución.
- [x] R4. Implementar un constructor puro del informe usando únicamente métricas agregadas y estadísticas de señales.
- [x] R5. Añadir a Laboratorio una acción explícita para copiar y un fallback de selección manual.
- [x] R6. Añadir pruebas sintéticas que comprueben utilidad del informe y ausencia de registros/títulos/IDs/datos personales.
- [x] R7. Actualizar requisitos permanentes, documentación, modularidad, validador SDD y CI.
- [x] R8. Actualizar app.js, inventario de service worker, caché y expectativas de pruebas visuales.
- [x] R9. Pasar calidad, validación SDD, test unitario, Playwright y despliegue.
- [x] R10. Archivar el expediente SDD solo tras la verificación posterior al despliegue.

## Criterios de aceptación

El informe solo se genera tras una pulsación. Es JSON versionado, muestra datos computados sobre el perfil local actual y no contiene ninguna fila individual ni identificador de película. La UI explica qué incluye/excluye; el portapapeles denegado no se reporta como éxito. Las pruebas no necesitan datos personales reales, TMDB ni red.


## Evidencia de cierre

- PR #36 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/36
- Calidad/SDD del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39550040838
- Validación del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39550040837
- Pruebas visuales del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39550040839
- Calidad/SDD en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39550200393
- Validación en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39550200331
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39550200380
- Pruebas visuales posteriores al despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39550237726

## Resultado y límites

El Laboratorio permite copiar un informe JSON generado localmente con estadísticas agregadas y métricas actuales. Los datos individuales por película, títulos, IDs TMDB, fechas, emociones, notas libres, credenciales y copias de seguridad quedan fuera del informe. El detalle de señales está desactivado por defecto y, si se activa, incluye como máximo 40 etiquetas agregadas con advertencia de privacidad. No se transmiten datos automáticamente. El informe no cambia el algoritmo y deja claro que las métricas offline no garantizan satisfacción ni el orden de películas aún no valoradas.
