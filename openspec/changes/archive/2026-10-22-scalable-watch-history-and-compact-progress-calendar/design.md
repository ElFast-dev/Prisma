# Diseño: fechas escalables y calendario mensual de Progreso

## Importación y procedencia

La excepción se limita al formato Android v2 con `platform=android`, `version=2` y la colección `movies.cH`. Cuando existe una marca `a` válida en una de sus filas, el importador conserva el instante original y lo asigna a `watchedAt` con procedencia `imported-explicit`. El timestamp original también se mantiene en `addedAt` por compatibilidad con el modelo de importación existente.

La racha solo se reconoce si la exportación contiene `Source Code` (TMDB 45612) el 15 de enero de 2026 según el calendario de Panamá. Para fechas entre el 15 de enero y el 21 de octubre inclusive se usa `watchDateConfidence=streak-confirmed`; las fechas explícitas fuera de este rango se etiquetan como `explicit-source`. Así el historial puede crecer sin que las películas anteriores o posteriores alteren el registro de 280 días.

Otros JSON, las filas `movies.cW` y `movies.cHid`, y los timestamps `rA`/ `updatedAt` mantienen sus semánticas existentes. La conversión de un instante al día de Panamá se usa solo al agrupar o mostrar fechas, nunca para reescribir el timestamp almacenado.

La reimportación sigue combinando por identidad y conserva la fecha manualmente confirmada cuando no existe una fecha de la racha con precedencia establecida. Los datos sintéticos de prueba cubren películas antes, dentro y después de la racha, incluyendo los cuatro casos de octubre reportados.

## Presentación

Cada mes de la racha es un elemento `details/summary` accesible por teclado y tacto. Solo el último mes se abre inicialmente y el resto permanece plegado. La cuadrícula sigue el calendario real de lunes a domingo, incluyendo celdas atenuadas para días fuera del intervalo cuando el mes inicial/final queda incompleto. Solo las 280 fechas confirmadas reciben marcador y tooltip; los títulos no se inventan cuando falta la fila correspondiente.

## Verificación

- Prueba de importación Android v2 para todas las filas con `a` válida, antes/dentro/después del reto.
- Regresión de fechas de G-Force, Finding Steve McQueen, The Dictator y GoodFellas en horario de Panamá.
- Prueba de exactamente 280 marcadores y un solo mes abierto al renderizar Progreso.
- Validación SDD, sintaxis modular, cache versioning y Playwright móvil/escritorio.
