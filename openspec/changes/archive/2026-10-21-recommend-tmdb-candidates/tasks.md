# Tareas: candidatas de recomendaciones desde TMDB

- [x] R1. Verificar el flujo real de consulta TMDB, modos de ranking, exclusión de la colección, inicio vacío, especificaciones y versiones PWA.
- [x] R2. Añadir este expediente SDD con escenarios de aceptación antes de cambiar la implementación.
- [x] R3. Separar en memoria el pool de películas populares de TMDB de los resultados de búsqueda y del catálogo local persistente.
- [x] R4. Combinar candidatas locales y remotas en el mismo ranking, conservando deduplicación y exclusiones.
- [x] R5. Actualizar la lista recomendada al terminar la consulta de populares y borrar el pool al desconectar TMDB.
- [x] R6. Añadir pruebas automatizadas con datos sintéticos para ranking, deduplicación, exclusiones y separación de persistencia.
- [x] R7. Actualizar especificaciones de recomendaciones y catálogo, arquitectura, caché y pruebas visuales.
- [x] R8. Ejecutar sintaxis, SDD, arquitectura modular, pruebas de ranking, caché, regresión de inicio vacío y Playwright.
- [x] R9. Revisar resultados de GitHub Actions; integrar y archivar solo con evidencia verificable.

## Criterios de aceptación
- Al cargar resultados populares reales, las recomendaciones incorporan candidatas de TMDB sin guardarlas.
- Un ID TMDB aparece una sola vez; los remakes con IDs distintos no se fusionan.
- Ninguna película valorada, vista, pendiente u oculta aparece en la lista final.
- La búsqueda de texto no sustituye el pool popular genérico ni transmite preferencias personales.
- La instalación nueva mantiene cero películas persistidas hasta una acción explícita de la persona.


## Evidencia de cierre

- PR #38 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/38
- Calidad/SDD del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39559563741 — success
- Validación del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39559563751 — success
- Playwright del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39559563845 — success
- Calidad/SDD en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39559782277 — success
- Validación en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39559782195 — success
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39559782178 — success
- Pruebas visuales posteriores al despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39559824420 — success

## Resultado

Prisma usa temporalmente películas populares de TMDB como candidatas adicionales para las recomendaciones, pero no las persiste en el catálogo personal. La búsqueda manual queda separada del conjunto de candidatas populares, los modos actuales comparten el ranking, la colección sigue excluida y una consulta fallida no elimina el último pool válido. Los pesos y las métricas del modelo no se modificaron.
