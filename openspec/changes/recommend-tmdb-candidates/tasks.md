# Tareas: candidatas de recomendaciones desde TMDB

- [x] R1. Verificar el flujo real de consulta TMDB, modos de ranking, exclusión de la colección, inicio vacío, especificaciones y versiones PWA.
- [x] R2. Añadir este expediente SDD con escenarios de aceptación antes de cambiar la implementación.
- [x] R3. Separar en memoria el pool de películas populares de TMDB de los resultados de búsqueda y del catálogo local persistente.
- [ ] R4. Combinar candidatas locales y remotas en el mismo ranking, conservando deduplicación y exclusiones.
- [ ] R5. Actualizar la lista recomendada al terminar la consulta de populares y borrar el pool al desconectar TMDB.
- [ ] R6. Añadir pruebas automatizadas con datos sintéticos para ranking, deduplicación, exclusiones y separación de persistencia.
- [ ] R7. Actualizar especificaciones de recomendaciones y catálogo, arquitectura, caché y pruebas visuales.
- [ ] R8. Ejecutar sintaxis, SDD, arquitectura modular, pruebas de ranking, caché, regresión de inicio vacío y Playwright.
- [ ] R9. Revisar resultados de GitHub Actions; integrar y archivar solo con evidencia verificable.

## Criterios de aceptación
- Al cargar resultados populares reales, las recomendaciones incorporan candidatas de TMDB sin guardarlas.
- Un ID TMDB aparece una sola vez; los remakes con IDs distintos no se fusionan.
- Ninguna película valorada, vista, pendiente u oculta aparece en la lista final.
- La búsqueda de texto no sustituye el pool popular genérico ni transmite preferencias personales.
- La instalación nueva mantiene cero películas persistidas hasta una acción explícita de la persona.
