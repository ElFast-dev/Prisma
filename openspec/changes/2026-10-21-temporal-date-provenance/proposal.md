# Propuesta: procedencia verificable de fechas temporales

## Problema

El importador de colecciones usa `raw.a` como `addedAt` y también lo prioriza como `watchedAt`. Ese campo puede representar cuándo se añadió una película, no cuándo se vio. Los registros guardados por versiones antiguas tampoco indican de dónde salió su fecha.

## Cambio

- Tratar `raw.a` solo como fecha de añadido.
- Importar `watchedAt` solo de los campos explícitos `watchedAt` y `watched_at`.
- Etiquetar la procedencia de fechas explícitas, fechas de acción y marcas heredadas sin fuente.
- Preferir una fecha explícita del historial sobre una fecha heredada ambigua.
- Mostrar recuentos agregados de fechas explícitas, no verificadas y ausentes; etiquetar como exploratoria cualquier evaluación que use fechas no verificadas.
- Ampliar el informe a v6 manteniendo privacidad agregada.

## No objetivos

- No reconstruir fechas que nunca se conservaron.
- No cambiar el ranking de producción ni activar Ridge.
- No exportar fechas exactas, títulos, IDs ni filas individuales.
